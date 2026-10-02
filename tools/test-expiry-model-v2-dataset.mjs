import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'reserve-mhd-v2-')),input=path.join(root,'exports'),output=path.join(root,'dataset');fs.mkdirSync(input);
const image=i=>'data:image/jpeg;base64,'+Buffer.alloc(128,i).toString('base64');
const ex=(i,barcode,target='2027-11-20')=>({confirmedDate:target,datePrecision:'day',image:image(i),product:{barcode,name:`Product ${barcode}`},rawOCR:'20.11.2027'});
fs.writeFileSync(path.join(input,'a.json'),JSON.stringify({schema:'reserve-expiry-training-v1',examples:[ex(1,'A'),ex(2,'A'),ex(3,'B')]}));
fs.writeFileSync(path.join(input,'b.json'),JSON.stringify({schema:'reserve-expiry-training-v1',examples:[ex(1,'A'),ex(4,'C')]}));
const run=spawnSync(process.execPath,['tools/prepare-expiry-model-v2-dataset.mjs',input,output],{encoding:'utf8'});if(run.status!==0)throw Error(run.stderr||run.stdout);
const summary=JSON.parse(fs.readFileSync(path.join(output,'summary.json'),'utf8'));if(summary.examples!==4||summary.exactDuplicates!==1||summary.productGroups!==3)throw Error(JSON.stringify(summary));
const rows=fs.readFileSync(path.join(output,'all.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse),a=rows.filter(x=>x.product.barcode==='A');
if(new Set(a.map(x=>x.split)).size!==1)throw Error('Product leakage across splits');
if(!summary.leakageCheck||!fs.existsSync(path.join(output,rows[0].image)))throw Error('Missing leakage check or image');
fs.rmSync(root,{recursive:true,force:true});console.log('Expiry Model 2 dataset: OK');
