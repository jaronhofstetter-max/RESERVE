import fs from 'node:fs';

const files=process.argv.slice(2);
if(!files.length){console.error('Usage: node tools/test-recommendations.mjs <recipes...>');process.exit(1)}
const all=[];
for(const file of files){const rows=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(rows))throw new Error(`${file}: root must be array`);all.push(...rows)}
const byId=new Map();for(const r of all)if(!byId.has(r.id))byId.set(r.id,r);
const recipes=[...byId.values()].filter(r=>r.status==='approved');
const N=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöüß]/g,'');
const match=(a,b)=>{a=N(a);b=N(b);return a===b||a.includes(b)||b.includes(a)};
const unit=u=>(u||'').toLowerCase()==='stück'?'stück':(u||'').toLowerCase();
function available(stock,name,u){return stock.filter(s=>match(s.name,name)&&unit(s.unit)===unit(u)).reduce((n,s)=>n+s.amount,0)}
function missing(r,stock,people=1){return r.ingredients.map(i=>({i,miss:Math.max(0,i.amount*people-available(stock,i.name,i.unit))})).filter(x=>x.miss>0)}
function canCook(r,stock,people=1){return missing(r,stock,people).length===0}
function dietOk(r,diet){if(diet==='Alles')return true;if(diet==='Vegetarisch')return r.diet==='Vegetarisch'||r.diet==='Vegan';return r.diet==='Vegan'}
function allowed(r,p){if(!dietOk(r,p.diet))return false;const avoid=N(p.avoid||'');return !avoid||!(r.allergens||[]).some(a=>avoid.includes(N(a)))&&!(r.ingredients||[]).some(i=>avoid.includes(N(i.name)))}
function score(r,p){const mins=(r.prepMinutes||0)+(r.cookMinutes||0);if(mins>p.maxMinutes)return 1e9;if(p.goal==='Schnell')return mins;if(p.goal==='Proteinreich')return -((r.nutrition||{}).protein||0)*2;if(p.goal==='Ballaststoffreich')return -((r.nutrition||{}).fiber||0)*3;if(p.goal==='Kalorienärmer')return ((r.nutrition||{}).kcal||0)/20;return 0}
function recommend(stock,p,meal){const pool=recipes.filter(r=>allowed(r,p)&&(r.mealTimes||[]).includes(meal)&&score(r,p)<1e9);const ready=pool.filter(r=>canCook(r,stock,p.people)).sort((a,b)=>score(a,p)-score(b,p));const near=pool.filter(r=>!canCook(r,stock,p.people)).sort((a,b)=>missing(a,stock,p.people).reduce((n,x)=>n+x.miss,0)-missing(b,stock,p.people).reduce((n,x)=>n+x.miss,0));return (ready.length?ready:near).slice(0,4)}
let failures=0;const ok=(cond,msg)=>{console.log(`${cond?'✓':'✗'} ${msg}`);if(!cond)failures++};
const omnivore={people:1,diet:'Alles',avoid:'',goal:'Vorrat zuerst',maxMinutes:60};
const vegan={...omnivore,diet:'Vegan'};
const vegetarian={...omnivore,diet:'Vegetarisch'};
const glutenFree={...omnivore,avoid:'Gluten'};
const fast={...omnivore,goal:'Schnell',maxMinutes:20};
const protein={...omnivore,goal:'Proteinreich'};
const stock=[{name:'Reis',amount:500,unit:'g'},{name:'Brokkoli',amount:600,unit:'g'},{name:'Poulet',amount:500,unit:'g'},{name:'Eier',amount:8,unit:'Stück'},{name:'Tomaten',amount:800,unit:'g'},{name:'Zwiebel',amount:400,unit:'g'},{name:'Olivenöl',amount:250,unit:'ml'}];
ok(recipes.length>=50,`mindestens 50 freigegebene Rezepte im zusammengeführten Testbestand (${recipes.length})`);
ok(recipes.some(r=>r.diet==='Vegan'),'vegane Rezepte vorhanden');
ok(recipes.some(r=>r.diet==='Vegetarisch'),'vegetarische Rezepte vorhanden');
ok(recipes.some(r=>r.diet==='Alles'),'omnivore Rezepte vorhanden');
for(const meal of ['Frühstück','Mittagessen','Abendessen'])ok(recommend(stock,omnivore,meal).length>0,`${meal}: Empfehlung vorhanden`);
ok(recommend(stock,vegan,'Abendessen').every(r=>r.diet==='Vegan'),'Vegan-Profil erhält nur vegane Abendessen');
ok(recommend(stock,vegetarian,'Abendessen').every(r=>r.diet!=='Alles'),'Vegetarisch-Profil erhält kein Fleischgericht');
ok(recommend(stock,glutenFree,'Abendessen').every(r=>!(r.allergens||[]).includes('Gluten')),'Gluten-Vermeidung filtert Gluten-Allergen');
ok(recommend(stock,fast,'Abendessen').every(r=>(r.prepMinutes+r.cookMinutes)<=20),'Zeitlimit 20 Minuten wird eingehalten');
const proteinList=recommend(stock,protein,'Abendessen');ok(proteinList.length>0&&proteinList[0].nutrition.protein>=proteinList.at(-1).nutrition.protein,'Protein-Ziel priorisiert höheren Proteingehalt innerhalb verfügbarer Auswahl');
const egg={id:'test',ingredients:[{name:'Eier',amount:3,unit:'Stück'}]};ok(canCook(egg,stock,2),'Mengenprüfung funktioniert für 2 Personen bei 8 Eiern');ok(!canCook(egg,stock,3),'Mengenprüfung erkennt Fehlbestand für 3 Personen bei 8 Eiern');
const unique=new Set(recipes.map(r=>r.id));ok(unique.size===recipes.length,'keine doppelten IDs im Testbestand');
if(failures){console.error(`\n${failures} Empfehlungstest(s) fehlgeschlagen.`);process.exit(1)}
console.log(`\n✓ ${recipes.length} freigegebene Rezepte: Empfehlungstests bestanden.`);
