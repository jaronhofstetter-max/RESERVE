import fs from 'node:fs';
const source=process.argv[2]||'data/recipes.json';
const manifest=JSON.parse(fs.readFileSync('data/recipe-photo-sources.json','utf8'));
const recipes=JSON.parse(fs.readFileSync(source,'utf8'));
for(const p of manifest.photos){
 const r=recipes.find(r=>r.id===p.recipeId);if(!r)throw Error('Unknown photo recipe '+p.recipeId);
 if(!p.path.startsWith('assets/recipe-photos/')||!fs.existsSync(p.path))throw Error('Missing local photograph '+p.path);
 r.image=p.path;r.imageCredit={author:p.author,source:p.source,license:p.license,licenseUrl:p.licenseUrl,servingSuggestion:true};
}
fs.writeFileSync(source,JSON.stringify(recipes)+'\n');
console.log('Applied '+manifest.photos.length+' reviewed real recipe photographs');
