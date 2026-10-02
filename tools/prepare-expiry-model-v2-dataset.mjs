#!/usr/bin/env node
/* Build a leakage-safe Model 2 dataset from one export or a directory of exports. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [input,output='training/expiry/model-v2-dataset']=process.argv.slice(2);
if(!input)throw Error('Usage: node tools/prepare-expiry-model-v2-dataset.mjs <export-or-directory> [output-dir]');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const norm=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const files=fs.statSync(input).isDirectory()?fs.readdirSync(input).filter(x=>x.endsWith('.json')).map(x=>path.join(input,x)): [input];
if(!files.length)throw Error('No JSON exports found');

const candidates=[];
for(const file of files.sort()){
  const payload=JSON.parse(fs.readFileSync(file,'utf8'));
  if(payload?.schema!=='reserve-expiry-training-v1'||!Array.isArray(payload.examples))continue;
  for(const [index,x] of payload.examples.entries())candidates.push({x,file:path.basename(file),index});
}

const unique=new Map(),conflicts=[],invalid=[];
for(const item of candidates){
  const {x,file,index}=item,target=String(x.confirmedDate||'');
  const precision=x.datePrecision||(/^\d{4}$/.test(target)?'year':/^\d{4}-\d{2}$/.test(target)?'month':'day');
  const expected=precision==='year'?/^\d{4}$/:precision==='month'?/^\d{4}-(?:0[1-9]|1[0-2])$/:/^\d{4}-(?:0[1-9]|1[0-2])-\d{2}$/;
  const match=String(x.image||'').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if(!expected.test(target)||!match){invalid.push({file,index:index+1,reason:!match?'invalid-image':'invalid-label'});continue;}
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length<100){invalid.push({file,index:index+1,reason:'empty-image'});continue;}
  const id=hash(bytes),prior=unique.get(id);
  if(prior&&prior.target!==target){conflicts.push({id,targetA:prior.target,targetB:target,files:[prior.exportFile,file]});unique.delete(id);continue;}
  if(prior)continue;
  const product=x.product&&typeof x.product==='object'?{
    barcode:String(x.product.barcode||''),name:String(x.product.name||''),brand:String(x.product.brand||''),
    quantity:String(x.product.quantity||''),category:String(x.product.category||''),containerType:String(x.product.containerType||''),source:String(x.product.source||'')
  }:{};
  const productKey=product.barcode?`barcode:${product.barcode}`:(product.name||product.brand?`product:${norm(product.brand)}|${norm(product.name)}`:`unlinked:${id}`);
  const ext=match[1]==='image/png'?'png':match[1]==='image/webp'?'webp':'jpg';
  unique.set(id,{id,image:`images/${id.slice(0,20)}.${ext}`,target,datePrecision:precision,
    inventoryEffectiveDate:String(x.inventoryEffectiveDate||target),predicted:String(x.predictedDate||''),
    predictedDatePrecision:String(x.predictedDatePrecision||''),corrected:!!x.corrected,source:String(x.source||''),
    confidence:Number(x.confidence)||0,rawOCR:String(x.rawOCR||''),ocrStrategy:String(x.ocrStrategy||''),
    candidateStatus:String(x.candidateStatus||''),autoApplied:!!x.autoApplied,captureTask:String(x.captureTask||''),
    qualityLabel:String(x.qualityLabel||x.captureQuality||'unknown'),product,productKey,exportFile:file,_bytes:bytes});
}

const rows=[...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
const splitFor=key=>{const n=parseInt(hash(key).slice(0,8),16)%100;return n<70?'train':n<85?'validation':'test'};
for(const row of rows)row.split=splitFor(row.productKey);
fs.mkdirSync(path.join(output,'images'),{recursive:true});
for(const row of rows){fs.writeFileSync(path.join(output,row.image),row._bytes);delete row._bytes;}
const write=(name,data)=>fs.writeFileSync(path.join(output,`${name}.jsonl`),data.map(x=>JSON.stringify(x)).join('\n')+(data.length?'\n':''));
write('all',rows);for(const split of ['train','validation','test'])write(split,rows.filter(x=>x.split===split));
const groups=new Map();for(const row of rows){if(!groups.has(row.productKey))groups.set(row.productKey,{split:row.split,count:0});groups.get(row.productKey).count++;}
const countBy=field=>Object.fromEntries([...new Set(rows.map(x=>x[field]||'unknown'))].sort().map(k=>[k,rows.filter(x=>(x[field]||'unknown')===k).length]));
const summary={schema:'reserve-expiry-model-v2-dataset',createdAt:new Date().toISOString(),sourceFiles:files.length,
  sourceRows:candidates.length,examples:rows.length,exactDuplicates:candidates.length-rows.length-invalid.length-conflicts.length,
  invalid:invalid.length,labelConflicts:conflicts.length,productGroups:groups.size,linkedBarcodes:new Set(rows.map(x=>x.product.barcode).filter(Boolean)).size,
  split:{train:rows.filter(x=>x.split==='train').length,validation:rows.filter(x=>x.split==='validation').length,test:rows.filter(x=>x.split==='test').length},
  splitGroups:Object.fromEntries(['train','validation','test'].map(s=>[s,[...groups.values()].filter(x=>x.split===s).length])),
  precision:countBy('datePrecision'),qualityLabels:countBy('qualityLabel'),corrected:rows.filter(x=>x.corrected).length,
  candidateStatus:countBy('candidateStatus'),autoApplied:rows.filter(x=>x.autoApplied).length,
  leakageCheck:[...groups.values()].every(x=>['train','validation','test'].includes(x.split)),
  sha256:hash(JSON.stringify(rows)),conflicts,invalid:invalid.slice(0,100)};
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
