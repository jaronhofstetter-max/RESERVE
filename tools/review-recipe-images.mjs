import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const reviewDir=path.join(root,'assets','recipe-review');
const prodDir=path.join(root,'assets','recipes');
const manifestPath=path.join(reviewDir,'manifest.json');

const parseIds=value=>[...new Set((value||'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean))];
const approve=parseIds(process.env.REVIEW_APPROVE);
const reject=parseIds(process.env.REVIEW_REJECT);
if(!approve.length&&!reject.length)throw new Error('Keine Review-IDs angegeben.');
const overlap=approve.filter(x=>reject.includes(x));
if(overlap.length)throw new Error(`IDs gleichzeitig freigegeben und abgelehnt: ${overlap.join(', ')}`);

let manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
if(!Array.isArray(manifest))throw new Error('Review-Manifest ist ungültig.');
const byId=new Map(manifest.map(x=>[x.id,x]));
for(const id of [...approve,...reject])if(!byId.has(id))throw new Error(`Unbekannte Review-ID: ${id}`);

await fs.mkdir(prodDir,{recursive:true});
const now=new Date().toISOString();
for(const id of approve){
 const item=byId.get(id);
 const src=path.join(reviewDir,`${id}.png`),dst=path.join(prodDir,`${id}.png`);
 try{await fs.access(src)}catch{throw new Error(`Review-Bild fehlt: ${src}`)}
 try{await fs.access(dst);throw new Error(`Produktionsbild existiert bereits: ${dst}`)}catch(err){if(err?.code!=='ENOENT')throw err}
 await fs.copyFile(src,dst);
 await fs.unlink(src);
 item.status='approved';
 item.reviewedAt=now;
 item.reviewDecision='promoted_to_production';
 item.checks={...(item.checks||{}),manualReview:true};
 console.log(`✓ FREIGEGEBEN ${id} → assets/recipes/${id}.png`);
}
for(const id of reject){
 const item=byId.get(id);
 const src=path.join(reviewDir,`${id}.png`);
 try{await fs.unlink(src)}catch(err){if(err?.code!=='ENOENT')throw err}
 item.status='rejected';
 item.reviewedAt=now;
 item.reviewDecision='rejected_for_regeneration';
 item.checks={...(item.checks||{}),manualReview:false};
 console.log(`✗ ABGELEHNT ${id}; Kandidat entfernt und wieder für Regeneration freigegeben.`);
}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Review abgeschlossen: ${approve.length} freigegeben, ${reject.length} abgelehnt.`);
