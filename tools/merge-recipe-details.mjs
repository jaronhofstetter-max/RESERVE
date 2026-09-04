import fs from 'node:fs';

const recipesFile=process.argv[2]||'data/recipes.json';
const detailsFile=process.argv[3]||'data/recipe-details-v1.json';
const recipes=JSON.parse(fs.readFileSync(recipesFile,'utf8'));
const details=JSON.parse(fs.readFileSync(detailsFile,'utf8'));
if(!Array.isArray(recipes)||!Array.isArray(details)) throw new Error('Both files must contain JSON arrays.');
const allowed=new Set(['description','equipment','prepNotes','steps','doneness','substitutions','leftovers','safety']);
const byId=new Map(recipes.map((r,i)=>[r.id,{r,i}]));
const seen=new Set();let changed=0;
for(const patch of details){
  if(!patch?.id||seen.has(patch.id)) throw new Error(`Invalid or duplicate detail id: ${patch?.id}`);
  seen.add(patch.id);
  const hit=byId.get(patch.id);if(!hit) throw new Error(`Detail recipe not found: ${patch.id}`);
  if(hit.r.status!=='approved') throw new Error(`Refusing to enrich non-approved recipe: ${patch.id}`);
  for(const [key,value] of Object.entries(patch)){
    if(key==='id')continue;
    if(!allowed.has(key)) throw new Error(`Field not allowed in detail patch ${patch.id}: ${key}`);
    if(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length)) throw new Error(`Empty detail field ${patch.id}.${key}`);
    hit.r[key]=value;
  }
  changed++;
}
fs.writeFileSync(recipesFile,JSON.stringify(recipes,null,2)+'\n');
console.log(`Merged detailed guidance into ${changed} approved recipes.`);
