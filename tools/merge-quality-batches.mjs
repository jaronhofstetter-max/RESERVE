import fs from 'node:fs';

const input=process.argv[2]||'data/recipes.json';
const output=process.argv[3]||'build/recipes-live.json';
const live=JSON.parse(fs.readFileSync(input,'utf8'));
const files=fs.readdirSync('data').filter(x=>/^quality-batch-.*\.json$/.test(x)).sort();
const map=new Map(live.map(r=>[r.id,r]));
let added=0,replaced=0;
for(const file of files){
  const batch=JSON.parse(fs.readFileSync('data/'+file,'utf8'));
  for(const r of batch){
    if(r.status!=='approved')continue;
    if(map.has(r.id))replaced++;else added++;
    map.set(r.id,r);
  }
}
const merged=[...map.values()];
const dir=output.includes('/')?output.slice(0,output.lastIndexOf('/')):'';
if(dir)fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(output,JSON.stringify(merged,null,2));
console.log(`✓ Live-Merge: ${live.length} Basis + ${added} neu, ${replaced} ersetzt = ${merged.length} approved Rezepte → ${output}`);
