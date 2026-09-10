import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const production='data/recipes.json';
const batchFiles=fs.readdirSync('data')
  .filter(name=>/^quality-batch-italian-v1(?:-part\d+)?\.json$/.test(name))
  .sort()
  .map(name=>`data/${name}`);
if(batchFiles.length<2) throw new Error('Expected both Italian quality batch files.');
const base=JSON.parse(fs.readFileSync(production,'utf8'));
const incoming=batchFiles.flatMap(file=>JSON.parse(fs.readFileSync(file,'utf8')));
if(!Array.isArray(base)||incoming.length<8) throw new Error('Italian quality pack is missing or too small.');
const ids=new Set(base.map(r=>r.id));
const names=new Set(base.map(r=>(r.name||'').trim().toLowerCase()));
for(const r of incoming){
  if(ids.has(r.id)) throw new Error(`Duplicate production or Italian recipe id: ${r.id}`);
  const name=(r.name||'').trim().toLowerCase();
  if(names.has(name)) throw new Error(`Duplicate production or Italian recipe name: ${r.name}`);
  if(r.status!=='approved') throw new Error(`Italian quality recipe must be approved: ${r.id}`);
  if(!String(r.cuisine||'').startsWith('Italien')) throw new Error(`Italian cuisine metadata missing: ${r.id}`);
  ids.add(r.id); names.add(name);
}
const candidate='data/recipes.italian-candidate.json';
fs.writeFileSync(candidate,JSON.stringify([...base,...incoming],null,2)+'\n');
const check=spawnSync(process.execPath,['tools/validate-recipes.mjs',candidate],{encoding:'utf8'});
process.stdout.write(check.stdout||''); process.stderr.write(check.stderr||'');
fs.rmSync(candidate,{force:true});
if(check.status!==0) process.exit(check.status||1);
console.log(`✓ Italian quality pack valid: ${incoming.length} recipes across ${batchFiles.length} files.`);
