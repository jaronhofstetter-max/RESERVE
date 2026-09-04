import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const production=process.argv[2]||'data/recipes.json';
const batch=process.argv[3]||'data/new-recipes-batch-01.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read(production), incoming=read(batch);
if(!Array.isArray(base)||!Array.isArray(incoming))throw new Error('Produktionsdatei und Batch müssen Arrays sein.');
const ids=new Set(base.map(r=>r.id)), names=new Set(base.map(r=>(r.name||'').trim().toLowerCase()));
for(const r of incoming){
 if(!r?.id)throw new Error('Batch enthält Rezept ohne ID.');
 if(ids.has(r.id))throw new Error(`Rezept-ID existiert bereits: ${r.id}`);
 const name=(r.name||'').trim().toLowerCase();
 if(name&&names.has(name))throw new Error(`Rezeptname existiert bereits: ${r.name}`);
 ids.add(r.id);names.add(name);
}
const merged=[...base,...incoming];
const tmp=production+'.candidate';
fs.writeFileSync(tmp,JSON.stringify(merged,null,2)+'\n');
const check=spawnSync(process.execPath,['tools/validate-recipes.mjs',tmp],{encoding:'utf8'});
process.stdout.write(check.stdout||'');process.stderr.write(check.stderr||'');
if(check.status!==0){fs.rmSync(tmp,{force:true});throw new Error('Kandidat hat die Rezeptvalidierung nicht bestanden.');}
fs.renameSync(tmp,production);
console.log(`✓ ${incoming.length} neue Rezepte übernommen. Produktionsbestand: ${merged.length}.`);
