import fs from 'node:fs';

const args=process.argv.slice(2);
const input=args[0]||'data/recipes.json';
const output=args.length>=2?args[args.length-1]:'build/recipes-live.json';
const explicitBatches=args.length>2?args.slice(1,-1):[];
const batchFiles=explicitBatches.length
  ? explicitBatches
  : fs.readdirSync('data').filter(x=>/^quality-batch-.*\.json$/.test(x)).sort().map(x=>'data/'+x);

const live=JSON.parse(fs.readFileSync(input,'utf8'));
const map=new Map(live.map(r=>[r.id,r]));
let added=0,replaced=0;
for(const file of batchFiles){
  const batch=JSON.parse(fs.readFileSync(file,'utf8'));
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
console.log(`✓ Live-Merge: ${live.length} Basis + ${added} neu, ${replaced} ersetzt = ${merged.length} approved Rezepte aus ${batchFiles.length} Qualitätschargen → ${output}`);
