import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reserve-expiry-synth-'));
try{
 const run=()=>spawnSync(process.execPath,['tools/generate-synthetic-expiry-dataset.mjs',dir,'24','77'],{encoding:'utf8'});
 let r=run();if(r.status)throw Error(r.stderr||r.stdout);
 const manifest=fs.readFileSync(path.join(dir,'synthetic-train.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 if(manifest.length!==24||manifest.some(x=>!x.synthetic||x.split!=='train'||!/\d{4}-\d{2}-\d{2}/.test(x.date)))throw Error('Synthetic manifest invalid');
 if(manifest.some(x=>!['exact_day','month_end'].includes(x.precision)))throw Error('Synthetic date precision missing');
 for(const x of manifest.filter(x=>x.precision==='month_end')){const [y,m,d]=x.date.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();if(d!==last)throw Error('Month-only label is not normalized to month end')}
 if(manifest.some(x=>/valid|test/i.test(x.split)))throw Error('Synthetic images leaked into validation/test');
 const image=()=>fs.readFileSync(path.join(dir,manifest[0].image));if(image().subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Generated image is not PNG');
 for(const row of manifest){const gt=fs.readFileSync(path.join(dir,row.image.replace(/\.png$/,'.gt.txt')),'utf8').trim();if(gt!==row.text)throw Error(`Ground truth mismatch: ${row.image}`)}
 for(const row of manifest){const box=fs.readFileSync(path.join(dir,row.image.replace(/\.png$/,'.box')),'utf8').trimEnd().split('\n');if(box.length!==[...row.text].length+1)throw Error(`Ground-truth box mismatch: ${row.image}`)}
 for(const row of manifest){const b=fs.readFileSync(path.join(dir,row.image));let pos=8,idat=[];while(pos<b.length){const n=b.readUInt32BE(pos),type=b.toString('ascii',pos+4,pos+8);if(type==='IDAT')idat.push(b.subarray(pos+8,pos+8+n));pos+=12+n}const raw=zlib.inflateSync(Buffer.concat(idat));let lo=255,hi=0;for(let y=0;y<256;y++)for(let x=0;x<512;x++){const v=raw[y*513+x+1];lo=Math.min(lo,v);hi=Math.max(hi,v)}if(hi-lo<80)throw Error(`Synthetic image lacks text contrast: ${row.image}`)}
 const hash=crypto.createHash('sha256').update(image()).digest('hex');r=run();if(r.status)throw Error(r.stderr||r.stdout);
 if(hash!==crypto.createHash('sha256').update(image()).digest('hex'))throw Error('Generator is not deterministic');
 console.log('Synthetic expiry dataset pipeline: OK');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
