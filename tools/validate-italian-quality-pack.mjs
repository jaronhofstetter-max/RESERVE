import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const production='data/recipes.json';
const batch='data/quality-batch-italian-v1.json';
const base=JSON.parse(fs.readFileSync(production,'utf8'));
const incoming=JSON.parse(fs.readFileSync(batch,'utf8'));
if(!Array.isArray(base)||!Array.isArray(incoming)||incoming.length<4) throw new Error('Italian quality batch is missing or too small.');
const ids=new Set(base.map(r=>r.id));
const names=new Set(base.map(r=>(r.name||'').trim().toLowerCase()));
for(const r of incoming){
  if(ids.has(r.id)) throw new Error(`Duplicate production recipe id: ${r.id}`);
  if(names.has((r.name||'').trim().toLowerCase())) throw new Error(`Duplicate production recipe name: ${r.name}`);
  if(r.status!=='approved') throw new Error(`Italian quality recipe must be approved: ${r.id}`);
  if(!String(r.cuisine||'').startsWith('Italien')) throw new Error(`Italian cuisine metadata missing: ${r.id}`);
  ids.add(r.id); names.add((r.name||'').trim().toLowerCase());
}
const candidate='data/recipes.italian-candidate.json';
fs.writeFileSync(candidate,JSON.stringify([...base,...incoming],null,2)+'\n');
const check=spawnSync(process.execPath,['tools/validate-recipes.mjs',candidate],{encoding:'utf8'});
process.stdout.write(check.stdout||''); process.stderr.write(check.stderr||'');
fs.rmSync(candidate,{force:true});
if(check.status!==0) process.exit(check.status||1);
console.log(`✓ Italian quality pack valid: ${incoming.length} recipes.`);
