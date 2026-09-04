import fs from 'node:fs';

const source=process.argv[2]||'data/recipes.json';
const output=process.argv[3]||'data/recipe-index.json';
const recipes=JSON.parse(fs.readFileSync(source,'utf8'));
if(!Array.isArray(recipes))throw new Error('Recipe source must be an array.');
const N=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const add=(map,key,id)=>{key=N(key);if(!key)return;(map[key]??=[]).push(id)};
const index={version:1,generatedAt:new Date().toISOString(),count:0,recipes:{},ingredients:{},diet:{},mealTimes:{},resilience:{noCook:[],powerNone:[],powerLow:[],noRefrigeration:[],onePot:[]}};
for(const r of recipes){
 if(r.status!=='approved')continue;
 index.count++;
 index.recipes[r.id]={name:r.name,type:r.type,diet:r.diet,cuisine:r.cuisine,difficulty:r.difficulty,mealTimes:r.mealTimes||[],prepMinutes:r.prepMinutes||0,cookMinutes:r.cookMinutes||0,tags:r.tags||[],nutrition:r.nutrition||{},resilience:r.resilience||null};
 for(const i of r.ingredients||[])add(index.ingredients,i.name,r.id);
 add(index.diet,r.diet,r.id);
 for(const m of r.mealTimes||[])add(index.mealTimes,m,r.id);
 const x=r.resilience;
 if(x){if(x.noCook)index.resilience.noCook.push(r.id);if(x.power==='none')index.resilience.powerNone.push(r.id);if(x.power==='low')index.resilience.powerLow.push(r.id);if(x.refrigeration==='none')index.resilience.noRefrigeration.push(r.id);if(x.onePot)index.resilience.onePot.push(r.id)}
}
fs.writeFileSync(output,JSON.stringify(index,null,2)+'\n');
console.log(`✓ Recipe index built: ${index.count} approved recipes.`);
