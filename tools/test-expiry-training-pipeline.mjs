import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'reserve-expiry-')),input=path.join(root,'export.json'),output=path.join(root,'dataset');
const examples=Array.from({length:10},(_,i)=>{const datePrecision=i===0?'month':i===1?'year':'day',confirmedDate=i===0?'2027-11':i===1?'2028':`2027-11-${String(i+1).padStart(2,'0')}`,inventoryEffectiveDate=i===0?'2027-11-30':i===1?'2028-12-31':confirmedDate;return{confirmedDate,datePrecision,inventoryEffectiveDate,predictedDate:i%2?'2027-11-01':confirmedDate,predictedDatePrecision:i<2?datePrecision:'day',corrected:!!(i%2),source:'test',confidence:.8,rawOCR:'BBE 11.2027',product:{barcode:`76123456789${i}`,name:`Testprodukt ${i+1}`,brand:'RESERVE Test',quantity:'500 g',category:'Sonstiges',containerType:'Packung',source:'barcode-lookup'},image:'data:image/jpeg;base64,'+Buffer.alloc(128,i+1).toString('base64')}});
fs.writeFileSync(input,JSON.stringify({schema:'reserve-expiry-training-v1',examples}));
const run=spawnSync(process.execPath,['tools/prepare-expiry-dataset.mjs',input,output],{encoding:'utf8'});if(run.status!==0)throw Error(run.stderr||run.stdout);
const summary=JSON.parse(fs.readFileSync(path.join(output,'summary.json'),'utf8'));if(summary.examples!==10||summary.train!==8||summary.validation!==2||summary.corrected!==5)throw Error('Unexpected dataset split: '+JSON.stringify(summary));
const all=fs.readFileSync(path.join(output,'all.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);if(all.some(x=>!x.product?.barcode||!x.product?.name||x.product?.brand!=='RESERVE Test'))throw Error('Product metadata missing from prepared dataset');
if(!all.some(x=>x.datePrecision==='month'&&x.target==='2027-11'&&x.inventoryEffectiveDate==='2027-11-30')||!all.some(x=>x.datePrecision==='year'&&x.target==='2028'&&x.inventoryEffectiveDate==='2028-12-31'))throw Error('Partial expiry precision missing from prepared dataset');
const validation=fs.readFileSync(path.join(output,'validation.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse),predictions=path.join(root,'predictions.jsonl');fs.writeFileSync(predictions,validation.map(x=>JSON.stringify({id:x.id,predicted:x.target})).join('\n')+'\n');
const evaluation=spawnSync(process.execPath,['tools/evaluate-expiry-predictions.mjs',path.join(output,'validation.jsonl'),predictions],{encoding:'utf8'});if(evaluation.status!==2)throw Error('Small validation set must not be production eligible');
const report=JSON.parse(evaluation.stdout);if(report.accuracy!==1||report.productionEligible)throw Error('Unexpected evaluation: '+evaluation.stdout);
fs.rmSync(root,{recursive:true,force:true});console.log('Expiry training pipeline: OK');
