#!/usr/bin/env node
/* Convert an explicit-consent RESERVE export into deterministic train/validation files. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [input,output='training/expiry/dataset']=process.argv.slice(2);
if(!input)throw Error('Usage: node tools/prepare-expiry-dataset.mjs <export.json> [output-dir]');
const payload=JSON.parse(fs.readFileSync(input,'utf8'));
if(payload?.schema!=='reserve-expiry-training-v1'||!Array.isArray(payload.examples))throw Error('Unsupported or invalid RESERVE expiry export');
fs.mkdirSync(path.join(output,'images'),{recursive:true});
const rows=[],seen=new Map();
for(const [i,x] of payload.examples.entries()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x.confirmedDate||'')))throw Error(`Invalid confirmed date at example ${i+1}`);
  const match=String(x.image||'').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if(!match)throw Error(`Invalid image at example ${i+1}`);
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length<100)throw Error(`Empty image at example ${i+1}`);
  const sha=crypto.createHash('sha256').update(bytes).digest('hex'),previous=seen.get(sha);if(previous){if(previous!==x.confirmedDate)throw Error(`Conflicting labels for duplicate image at example ${i+1}`);continue}seen.set(sha,x.confirmedDate);const ext=match[1]==='image/png'?'png':match[1]==='image/webp'?'webp':'jpg',file=`${sha.slice(0,20)}.${ext}`;
  fs.writeFileSync(path.join(output,'images',file),bytes);
  rows.push({id:sha,image:`images/${file}`,target:x.confirmedDate,predicted:x.predictedDate||'',corrected:!!x.corrected,source:x.source||'',confidence:Number(x.confidence)||0,rawOCR:String(x.rawOCR||'')});
}
rows.sort((a,b)=>a.id.localeCompare(b.id));
const validation=rows.filter((_,i)=>i%5===0),train=rows.filter((_,i)=>i%5!==0);
for(const [name,data] of [['all',rows],['train',train],['validation',validation]])fs.writeFileSync(path.join(output,`${name}.jsonl`),data.map(x=>JSON.stringify(x)).join('\n')+(data.length?'\n':''));
const summary={schema:'reserve-expiry-dataset-v1',createdAt:new Date().toISOString(),examples:rows.length,train:train.length,validation:validation.length,corrected:rows.filter(x=>x.corrected).length,sha256:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
