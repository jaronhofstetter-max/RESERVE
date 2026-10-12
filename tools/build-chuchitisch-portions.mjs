import fs from 'node:fs';
const dir='docs/recipe-candidates/chuchitisch';
const basis=JSON.parse(fs.readFileSync(`${dir}/nutrition-basis.json`));
const values=structuredClone(basis.values);
const cached=`${dir}/nutrition-basis-2026-10-12.json`;
if(fs.existsSync(cached))Object.assign(values,JSON.parse(fs.readFileSync(cached)).values);
const wanted=new Set([171688,169251,169991,169761,171287,172675,169097,173944,171284,173904,174270,167755,170581,171265,168879,170170,170859,173414,169994]);
const nutrientIds={kcal:1008,protein:1003,carbs:1005,fat:1004,fiber:1079};
for(const file of process.argv.slice(2)){
 const data=JSON.parse(fs.readFileSync(file));
 for(const food of Array.isArray(data)?data:[data]){
  if(!wanted.has(food.fdcId))continue;
  const per100g={};
  for(const [name,id] of Object.entries(nutrientIds)){
   const n=food.foodNutrients.find(n=>n.nutrient?.id===id);
   if(!n||!Number.isFinite(n.amount))throw Error(`Missing ${name}: ${food.description}`);
   per100g[name]=n.amount;
  }
  values[food.fdcId]={fdcId:food.fdcId,description:food.description,per100g,source:`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,carbohydrateBasis:'total-including-fiber',retrievedAt:'2026-10-12'};
 }
}
values.findusMarroni={description:'Findus Marroni-Purée, gesüsst',per100g:{kcal:230,protein:2,carbs:49,fat:1.5,fiber:6},source:'https://www.findus.ch/de-ch/produkte/beeren-und-marroni/beeren-und-marroni/marroni-puree',carbohydrateBasis:'available-excluding-fiber',retrievedAt:'2026-10-12'};
const row=(name,amount,key,unit='g',grams=amount)=>({name,amount,key,unit,grams});
const specs=[
 {source:65,id:'chuchitisch-pilzrisotto',servings:2,prep:10,cook:20,cuisine:'Italienisch',dish:'🍚',allergens:['Milch','Sellerie','Sulfite'],rows:[row('Champignons',100,169251),row('Eierschwämme',50,169251),row('Risottoreis',200,168879),row('Zwiebel',100,170000),row('Olivenöl',45,171413,'ml',40.95),row('Weisswein',100,174837,'ml'),row('Gemüsebouillon',600,171583,'ml'),row('Reibkäse',100,170848),row('Butter',14,173430)],notes:['Für 2 Personen: 1 Zwiebel = 100 g, 1 EL Butter = 14 g, 1 EL Öl = 15 ml; Öldichte 0.91 g/ml.','Die Quelle stellt 2 l Bouillon bereit. Geschätzter Verbrauch: 600 ml für 200 g trockenen Reis; nach Bedarf mehr oder weniger zugeben.','Risottoreis mit rohem weissem Mittelkornreis angenähert. Eierschwämme mit Champignon-Nährwerten angenähert; Reibkäse als Parmesan berechnet. Wein vollständig eingerechnet, Alkoholabbau nicht modelliert.'],equipment:['Kochtopf','Bratpfanne','Kelle'],doneness:'Der Reis ist bissfest und cremig; das Risotto verfliesst leicht auf dem Teller.'},
 {source:621,id:'chuchitisch-capuns',servings:4,prep:35,cook:25,cuisine:'Schweizerisch',dish:'🥬',allergens:['Gluten','Milch','Ei','Sellerie'],rows:[row('Pilze',100,169251),row('Weissbrot',75,172675),row('Zwiebel',100,170000),row('Petersilie',15,170416),row('Schnittlauch',15,169994),row('Butter',30,173430),row('Weizenmehl',200,169761),row('Salz',3,null),row('Milch',50,171265,'ml'),row('Wasser',50,null,'ml'),row('Ei',100,171287),row('Krautstielblätter',400,169991),row('Gemüsebouillon',250,171583,'ml'),row('Vollrahm',250,170859,'ml'),row('Bergkäse',100,173414)],notes:['Für 4 Personen: 1 Zwiebel = 100 g, ½ Kräuterbund = 15 g, 1 Ei ohne Schale = 50 g, 20 Krautstielblätter = 400 g.','Die Zutatenliste nennt 250 ml Rahm, der Anleitungstext dagegen Milch für den Sud. Diese Fassung verwendet den Rahm aus der Zutatenliste.','Pilze als Champignons, Weissbrot als französisches Weissbrot und Bergkäse mit Cheddar-Nährwerten angenähert; Flüssigkeiten vereinfacht 1 ml = 1 g. Blanchierwasser und dessen Salz nicht eingerechnet.'],equipment:['Schüssel','Kochtopf','Weite Pfanne','Schneidebrett'],doneness:'Die Füllung ist vollständig gestockt, auch in der Mitte nicht mehr teigig; die Blätter sind zart.'},
 {source:445,id:'chuchitisch-tessiner-maronikuchen',servings:12,prep:15,cook:40,cuisine:'Schweizerisch',dish:'🍰',allergens:['Milch','Ei','Haselnüsse'],rows:[row('Maronipüree, gezuckert',400,'findusMarroni'),row('Ei',200,171287),row('Zucker',50,169655),row('Butter',205,173430),row('Haselnüsse',50,170581),row('Backpulver',8,null),row('Vanillezucker',8,169655)],notes:['Ein Kuchen von 22–24 cm Durchmesser wird in 12 gleich grosse Stücke geteilt; eine Portion entspricht einem Stück.','4 Eier ohne Schale = 200 g; ½ Päckchen Backpulver = 8 g, 1 Päckchen Vanillezucker = 8 g. Zusätzlich 5 g Butter zum Einfetten berücksichtigt.','Gezuckertes Maronipüree mit Findus-Produktwerten berechnet; andere Produkte können abweichen. Backpulver nicht in Nährwerte eingerechnet.'],equipment:['Springform 22–24 cm','Backpapier','Rührschüssel','Handmixer','Backofen'],doneness:'Die Mitte ist gestockt; bei der Stäbchenprobe haftet kein flüssiger Teig am Stäbchen.'},
 {source:128,id:'chuchitisch-birchermueesli',servings:2,prep:15,cook:0,cuisine:'Schweizerisch',dish:'🥣',allergens:['Milch','Gluten','Soja'],rows:[row('Apfel',180,171688),row('Orange',150,169097),row('Banane',120,173944),row('Naturjoghurt',120,171284),row('Halbrahm',30,170857,'ml'),row('Zitronensaft',30,167747,'ml'),row('Haferflocken',40,173904),row('Sojaflocken',10,174270),row('Kokosflocken',5,170170),row('Himbeeren',40,167755),row('Zucker',10,169655)],notes:['Essbare Gewichte für 2 Personen: 1 Apfel = 180 g, 1 Orange = 150 g, 1 Banane = 120 g, 10 Himbeeren = 40 g.','1 EL Joghurt = 15 g, 1 EL Flüssigkeit = 15 ml, 1 EL Hafer-/Sojaflocken = 10 g, 1 EL Kokosflocken = 5 g. Zucker nach Geschmack mit 10 g angesetzt.','Flocken als Haferflocken konkretisiert; Sojaflocken mit trockenen Sojabohnen angenähert, Halbrahm mit USDA light cream. Flüssigkeiten vereinfacht 1 ml = 1 g. Eigene Rezeptfassung; bestehendes Bircher-Müesli bleibt erhalten.'],equipment:['Schüssel','Reibe','Küchenmesser'],doneness:'Das Müesli ist gleichmässig verrührt; Obst und Flocken sind mit Joghurt und Rahm benetzt.'}
];
const round=x=>Math.round(x*100)/100;
const sum=rows=>{
 const n={kcal:0,protein:0,carbs:0,fat:0,fiber:0};
 for(const r of rows){
  if(r.key===null)continue;
  const v=values[r.key];if(!v)throw Error(`Missing food ${r.key}`);
  for(const k of Object.keys(n)){
   let value=v.per100g[k];
   // USDA total carbohydrate includes fibre; expose available carbs consistently.
   if(k==='carbs'&&v.carbohydrateBasis!=='available-excluding-fiber')value=Math.max(0,value-v.per100g.fiber);
   n[k]+=value*r.grams/100;
  }
 }
 return n;
};
const batch=specs.map(s=>{
 const source=JSON.parse(fs.readFileSync(`${dir}/${s.source}.json`));
 const total=sum(s.rows);const nutrition=Object.fromEntries(Object.entries(total).map(([k,v])=>[k,round(v/s.servings)]));
 const instructions=source.recipeInstructions.replace(/\\r\\n/g,'\n');
 let steps=instructions.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(s.source===621)steps=steps.map(x=>x.replace('Bouillon und Milch dazu','Bouillon und Rahm dazu'));
 if(s.source===128)steps=['Banane und Orange schälen und in mundgerechte Stücke schneiden; den Apfel waschen und grob raffeln.','Obst mit Joghurt, Halbrahm, Zitronensaft, Flocken und Himbeeren in einer Schüssel mischen.','Nach Geschmack süssen, nochmals gut verrühren und bis zum Servieren gekühlt aufbewahren.'];
 if(s.source===65)steps=steps.flatMap(x=>x.split(/(?<=\.)\s+(?=[A-ZÄÖÜ])/)).filter(x=>x.length>24);
 const credit={author:'Hannes und Martina',provider:'Chuchitisch',source:source.source,license:'CC BY-SA 3.0',licenseUrl:source.licenseUrl,originalServings:s.servings,adaptation:`Auf eine Portion umgerechnet; Mengenannahmen: ${s.notes.join(' ')} Zubereitung aus der Originalquelle gegliedert; Garmerkmale ergänzt.`};
 return {id:s.id,name:s.source===128?'Birchermüesli nach Chuchitisch':source.name,type:s.source===445?'Dessert':s.source===128?'Frühstück':'Hauptmahlzeit',diet:'Vegetarisch',dish:s.dish,cuisine:s.cuisine,mealTimes:s.source===445?['Zwischenmahlzeit']:s.source===128?['Frühstück']:['Mittagessen','Abendessen'],prepMinutes:s.prep,cookMinutes:s.cook,difficulty:s.source===621?'Anspruchsvoll':'Einfach',allergens:s.allergens,tags:['Originalfoto','Chuchitisch',...(s.source===445?['Dessert','Kuchen']:[])],ingredients:s.rows.map(r=>({name:r.name,amount:round(r.amount/s.servings),unit:r.unit})),steps,nutrition,nutritionEstimate:{method:'Zutatenberechnung mit USDA SR Legacy und Findus-Produktdeklaration; keine Messung des fertigen Gerichts.',basis:'Eine Portion; essbare Rohgewichte. USDA-Gesamtkohlenhydrate um Ballaststoffe bereinigt. Produktwerte und Gewichte sind Näherungen; '+s.notes.join(' '),sources:`${dir}/nutrition-basis-2026-10-12.json`,ingredients:s.rows.map(r=>({name:r.name,grams:round(r.grams/s.servings),foodKey:r.key,excluded:r.key===null})),originalBatchTotals:Object.fromEntries(Object.entries(total).map(([k,v])=>[k,round(v)]))},status:'approved',description:s.source===445?'Tessiner Maronikuchen nach Chuchitisch. Eine Portion entspricht einem von zwölf Kuchenstücken.':`${source.name} nach Chuchitisch mit dem Originalfoto der Quelle. Mengen und Nährwerte gelten für eine Person.`,equipment:s.equipment,prepNotes:[...s.notes,'Produktetiketten auf weitere Allergene prüfen. Für die vegetarische Variante Käse mit mikrobiellem Lab wählen.'],doneness:s.doneness,substitutions:['Die verwendeten Produkte können ausgetauscht werden; Mengen, Allergene und Nährwerte dann entsprechend neu prüfen.'],leftovers:s.source===128?'Abgedeckt im Kühlschrank lagern und zeitnah verzehren; vor dem Servieren nochmals umrühren.':'Reste rasch abkühlen, abgedeckt gekühlt lagern und zeitnah verbrauchen.',safety:'Saubere Geräte verwenden, Obst und Gemüse waschen und verderbliche Zutaten gekühlt aufbewahren.',recipeCredit:credit,resilience:{power:s.cook===0?'none':'normal',refrigeration:'required',shelfStableShare:0.3,waterMl:s.source===621?1500:s.source===65?300:0,noCook:s.cook===0,onePot:false}};
});
const used=new Set(specs.flatMap(s=>s.rows.filter(r=>r.key!==null).map(r=>String(r.key))));
fs.writeFileSync(`${dir}/nutrition-basis-2026-10-12.json`,JSON.stringify({retrievedAt:'2026-10-12',method:'Per ingredient: grams / 100 × per100g, then divide by portions. Available carbs = USDA total carbs minus fibre; manufacturer carbs already exclude fibre.',values:Object.fromEntries([...used].map(k=>[k,values[k]])),assumptions:specs.map(s=>({id:s.id,portions:s.servings,notes:s.notes,originalBatchIngredients:s.rows}))},null,2)+'\n');
fs.writeFileSync('data/quality-batch-chuchitisch-v2.json',JSON.stringify(batch,null,2)+'\n');
const manifest=JSON.parse(fs.readFileSync('data/recipe-photo-sources.json'));
for(const s of specs){
 const source=JSON.parse(fs.readFileSync(`${dir}/${s.source}.json`));
 const path=`assets/recipe-photos/${s.id}.webp`;
 if(!fs.existsSync(path))throw Error(`Missing compressed photograph: ${path}. Convert the archived source PNG to WebP first.`);
 const photo={recipeId:s.id,path,source:source.source.replace('http:','https:'),kind:'photograph',author:'Hannes und Martina / Chuchitisch',provider:'Chuchitisch',title:source.name,license:'CC BY-SA 3.0',licenseUrl:source.licenseUrl,adaptation:'Originalfoto als WebP komprimiert; die App kann einen Ausschnitt anzeigen.',review:'Originalfoto zum übernommenen Rezept. Kein separat benannter Fotograf; Zuschreibung an das veröffentlichende Autorenkonto.',reviewedAt:'2026-10-12'};
 const existing=manifest.photos.findIndex(p=>p.recipeId===s.id);
 if(existing<0)manifest.photos.push(photo);else manifest.photos[existing]=photo;
}
fs.writeFileSync('data/recipe-photo-sources.json',JSON.stringify(manifest,null,2)+'\n');
for(const r of batch)console.log(r.id,JSON.stringify(r.nutrition));
