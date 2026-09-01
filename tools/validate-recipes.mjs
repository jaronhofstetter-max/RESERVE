import fs from 'node:fs';

const file=process.argv[2]||'data/recipes.json';
const allowed={
  type:new Set(['Frühstück','Hauptmahlzeit']),
  diet:new Set(['Alles','Vegetarisch','Vegan']),
  difficulty:new Set(['Sehr einfach','Einfach','Mittel','Anspruchsvoll']),
  unit:new Set(['g','ml','Stück']),
  meal:new Set(['Frühstück','Mittagessen','Zwischenmahlzeit','Abendessen']),
  status:new Set(['draft','approved'])
};
const required=['id','name','type','diet','dish','cuisine','mealTimes','prepMinutes','cookMinutes','difficulty','allergens','tags','ingredients','steps','nutrition','status'];
const nutritionFields=['kcal','protein','carbs','fat','fiber'];
const errors=[],warnings=[];
let recipes;
try{recipes=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){console.error('JSON konnte nicht gelesen werden:',e.message);process.exit(1)}
if(!Array.isArray(recipes)){console.error('Root muss ein Array sein.');process.exit(1)}
const ids=new Set();
const names=new Map();
const fail=(i,msg)=>errors.push(`#${i+1}${recipes[i]?.id?` (${recipes[i].id})`:''}: ${msg}`);
const warn=(i,msg)=>warnings.push(`#${i+1}${recipes[i]?.id?` (${recipes[i].id})`:''}: ${msg}`);
recipes.forEach((r,i)=>{
  required.forEach(k=>{if(r[k]===undefined||r[k]===null||r[k]==='')fail(i,`${k} fehlt`)});
  if(typeof r.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id||''))fail(i,'id muss lowercase-kebab-case sein');
  if(ids.has(r.id))fail(i,`doppelte ID ${r.id}`);ids.add(r.id);
  const nk=(r.name||'').trim().toLowerCase();if(nk){if(names.has(nk))warn(i,`gleicher Anzeigename wie #${names.get(nk)+1}`);else names.set(nk,i)}
  if(!allowed.type.has(r.type))fail(i,`ungültiger type: ${r.type}`);
  if(!allowed.diet.has(r.diet))fail(i,`ungültige diet: ${r.diet}`);
  if(!allowed.difficulty.has(r.difficulty))fail(i,`ungültige difficulty: ${r.difficulty}`);
  if(!allowed.status.has(r.status))fail(i,`ungültiger status: ${r.status}`);
  if(!Array.isArray(r.mealTimes)||!r.mealTimes.length)fail(i,'mealTimes muss mindestens einen Eintrag haben');
  else r.mealTimes.forEach(m=>{if(!allowed.meal.has(m))fail(i,`ungültige mealTime: ${m}`)});
  if(!Number.isFinite(r.prepMinutes)||r.prepMinutes<0||r.prepMinutes>240)fail(i,'prepMinutes muss 0–240 sein');
  if(!Number.isFinite(r.cookMinutes)||r.cookMinutes<0||r.cookMinutes>480)fail(i,'cookMinutes muss 0–480 sein');
  if(!Array.isArray(r.allergens))fail(i,'allergens muss ein Array sein');
  if(!Array.isArray(r.tags)||r.tags.length<1)fail(i,'tags muss mindestens einen Eintrag haben');
  if(!Array.isArray(r.ingredients)||r.ingredients.length<2)fail(i,'mindestens 2 Zutaten erforderlich');
  else r.ingredients.forEach((x,j)=>{
    if(!x||typeof x.name!=='string'||!x.name.trim())fail(i,`Zutat ${j+1}: name fehlt`);
    if(!Number.isFinite(x?.amount)||x.amount<=0)fail(i,`Zutat ${j+1}: amount muss > 0 sein`);
    if(!allowed.unit.has(x?.unit))fail(i,`Zutat ${j+1}: ungültige Einheit ${x?.unit}`);
  });
  if(!Array.isArray(r.steps)||r.steps.length<2)fail(i,'mindestens 2 Kochschritte erforderlich');
  else r.steps.forEach((s,j)=>{if(typeof s!=='string'||s.trim().length<3)fail(i,`Schritt ${j+1} ist zu kurz`)});
  if(!r.nutrition||typeof r.nutrition!=='object')fail(i,'nutrition fehlt');
  else nutritionFields.forEach(k=>{if(!Number.isFinite(r.nutrition[k])||r.nutrition[k]<0)fail(i,`nutrition.${k} muss >= 0 sein`)});
  if(r.status==='approved'&&!r.image)warn(i,'kein explizites image-Feld; Fallback assets/recipes/<id>.png wird verwendet');
});
console.log(`RESERVE Rezeptprüfung: ${recipes.length} Rezepte, ${recipes.filter(r=>r.status==='approved').length} approved, ${recipes.filter(r=>r.status==='draft').length} draft`);
if(warnings.length){console.log(`\nWarnungen (${warnings.length}):`);warnings.forEach(x=>console.log(' - '+x))}
if(errors.length){console.error(`\nFehler (${errors.length}):`);errors.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log('\n✓ Rezeptdatenbank ist strukturell gültig.');
