import fs from 'node:fs';
import path from 'node:path';

const source=process.argv[2]||'data/recipes.json';
const outDir=process.argv[3]||'data/recipe-details';
const catalogFile=process.argv[4]||'data/recipe-catalog.json';
const manifestFile=process.argv[5]||'data/recipe-details-manifest.json';
const shardSize=Math.max(25,Number(process.env.RECIPE_SHARD_SIZE)||100);
const recipes=JSON.parse(fs.readFileSync(source,'utf8')).filter(r=>r.status==='approved');
if(!Array.isArray(recipes))throw new Error('Recipe source must be an array.');

fs.mkdirSync(outDir,{recursive:true});
for(const name of fs.readdirSync(outDir))if(/^shard-\d+\.json$/.test(name))fs.unlinkSync(path.join(outDir,name));

const catalog=recipes.map(r=>({
  id:r.id,name:r.name,type:r.type,diet:r.diet,dish:r.dish||'🍽️',cuisine:r.cuisine,difficulty:r.difficulty,status:r.status,
  mealTimes:r.mealTimes||[],prepMinutes:r.prepMinutes||0,cookMinutes:r.cookMinutes||0,tags:r.tags||[],nutrition:r.nutrition||{},
  allergens:r.allergens||[],ingredients:r.ingredients||[],resilience:r.resilience||null,
  steps:['Rezeptdetails werden beim Öffnen geladen.','Rezeptdetails werden beim Öffnen geladen.'],
  detailShard:null,detailLoaded:false
}));

const manifest={version:1,generatedAt:new Date().toISOString(),count:recipes.length,shardSize,recipes:{},shards:{}};
for(let i=0;i<recipes.length;i+=shardSize){
  const chunk=recipes.slice(i,i+shardSize);
  const shardName=`shard-${String(i/shardSize+1).padStart(4,'0')}.json`;
  const rel=`data/recipe-details/${shardName}`;
  fs.writeFileSync(path.join(outDir,shardName),JSON.stringify(chunk)+'\n');
  manifest.shards[shardName]={path:rel,count:chunk.length};
  for(const r of chunk)manifest.recipes[r.id]=rel;
}
for(const r of catalog)r.detailShard=manifest.recipes[r.id]||null;
fs.writeFileSync(catalogFile,JSON.stringify(catalog)+'\n');
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(`✓ Recipe delivery built: ${recipes.length} catalog entries across ${Object.keys(manifest.shards).length} detail shards.`);
