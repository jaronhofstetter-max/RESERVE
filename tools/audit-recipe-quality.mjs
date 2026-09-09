import fs from 'node:fs';

const file=process.argv[2]||'data/recipes.json';
const recipes=JSON.parse(fs.readFileSync(file,'utf8'));
const fields=['description','equipment','prepNotes','doneness','substitutions','leftovers','safety'];
const meaningful=v=>typeof v==='string'?v.trim().length>=12:Array.isArray(v)?v.length>0&&v.every(x=>typeof x==='string'&&x.trim().length>=3):v&&typeof v==='object'&&Object.keys(v).length>0;
const rows=recipes.map(r=>({id:r.id,name:r.name,status:r.status,missing:fields.filter(k=>!meaningful(r[k])),shortSteps:(r.steps||[]).filter(s=>typeof s!=='string'||s.trim().length<25).length}));
const incomplete=rows.filter(r=>r.status==='approved'&&r.missing.length);
const counts=Object.fromEntries(fields.map(k=>[k,incomplete.filter(r=>r.missing.includes(k)).length]));
const shortStepRecipes=rows.filter(r=>r.status==='approved'&&r.shortSteps);
console.log(`RESERVE Qualitätsaudit: ${recipes.length} Rezepte, ${incomplete.length} approved mit fehlenden Detailfeldern.`);
console.log('Fehlende Detailfelder:',counts);
console.log(`Rezepte mit knappen Kochschritten (separater Ausbau): ${shortStepRecipes.length}`);
if(process.env.REQUIRE_COMPLETE_RECIPE_QUALITY==='1'&&incomplete.length){
 console.error('\nUnvollständige approved Rezepte:');
 incomplete.forEach(r=>console.error(` - ${r.id}: ${r.missing.join(', ')}`));
 process.exit(1);
}
