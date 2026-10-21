import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),ctx);const p=ctx.window.RESERVE_RECIPE_PARSER;
for(const [line,amount,unit] of [['200 g Reis',200,'g'],['0,5 kg Mehl',500,'g'],['½ l Milch',500,'ml'],['1 1/2 kg Kartoffeln',1500,'g'],['1½ kg Kartoffeln',1500,'g'],['2 Eier',2,'Stück'],['2 Stück Eier',2,'Stück'],['100g Reis',100,'g']]){const x=p.ingredient(line);assert.equal(x.amount,amount,line);assert.equal(x.unit,unit,line);assert.equal(x.uncertain,false,line)}
for(const line of ['Salz nach Geschmack','1 EL Öl','1 Packung Reis','100–200 g Mehl','1/0 g Reis'])assert.equal(p.ingredient(line).uncertain,true,line);
const text='Reispfanne\nFür 2 Portionen\nZutaten\n200 g Reis\n2 Stück Eier\nSalz nach Geschmack\nZubereitung\n1. Reis garen.\n2. Eier hinzufügen.\nNährwerte\n560 kcal';const parsed=p.parseText(text);assert.equal(parsed.name,'Reispfanne');assert.equal(parsed.portions,'2');assert.ok(parsed.ingredients.includes('Salz nach Geschmack'));assert.equal(parsed.steps,'Reis garen.\nEier hinzufügen.');
const r={id:'personal-test',name:'Reispfanne',portions:2,ingredientLines:['200 g Reis','2 Eier'],steps:['Reis garen.','Eier hinzufügen.'],diet:'Alles',prepMinutes:null,cookMinutes:null,source:''};assert.ok(p.validRecord(r));const recipe=p.toRecipe(r);assert.equal(recipe.ingredients[0].amount,100);assert.equal(recipe.ingredients[1].amount,1);assert.equal(recipe.pantryReady,true);assert.equal(Object.keys(recipe.nutrition).length,0);assert.equal(p.toRecipe({...r,ingredientLines:['1 EL Öl']}).pantryReady,true);assert.equal(p.validRecord({...r,portions:0}),false);assert.equal(p.validRecord({...r,id:'x\" onclick=\"alert(1)'}),false);console.log('Personal recipes: fractions, units, original portions, uncertain quantities, preserved steps, validation and no invented nutrition OK');

assert.equal(p.parseText('Suppe\nZUTATEN\n— 2 Portion(en) +\n350 g Süsskartoffeln\nZUBEREITUNG\nGemüse garen.').portions,'2');


// Quantity/unit regressions, including known real-image OCR cases.
{
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),ctx);const p=ctx.window.RESERVE_RECIPE_PARSER;
const known=[['3/16 l Wasser',187.5,'ml'],['⅜ l Milch',375,'ml'],['1⅛ kg Mehl',1125,'g'],['2 Eier',2,'Stück'],['75 gr Butter',75,'g'],['1000 ml Wasser',1000,'ml']];
for(const [line,q,u] of known){const x=p.ingredient(line);assert.equal(x.amount,q,line);assert.equal(x.unit,u,line);assert.equal(x.uncertain,false,line);}
for(const line of ['3/16 Wasser','250 Mehl','2 P kg Vanillenzucker','2 leaves Bay leaves','1½–2 Bechern Sahne','⅜–½ l Milch','1/0 g Reis','0 g Reis','Salz nach Geschmack','1 EL Öl'])assert.equal(p.ingredient(line).uncertain,true,line);
assert.equal(p.ingredient('3/16 Wasser').unit,'');assert.equal(p.ingredient('2 leaves Bay leaves').unit,'leaves');assert.equal(p.ingredient('2 leaves Bay leaves').name,'Bay leaves');
assert.equal(p.ingredient('1/0 g Reis').amount,null);
const r={id:'personal-quantity-review',name:'Suppe',portions:2,ingredientLines:['Salz nach Geschmack','3/16 Wasser'],steps:['Vermengen.'],diet:'Alles',prepMinutes:null,cookMinutes:null,source:''};const x=p.toRecipe(r);assert.equal(x.ingredients[0].amount,null);assert.equal(x.ingredients[1].unit,'');assert.equal(x.pantryReady,false);
const parsed=p.parseText('Milch\nIngredients\n⅜ l Milch\nInstructions\n1. Verrühren.');assert.equal(parsed.ingredients,'⅜ l Milch');assert.equal(parsed.steps,'Verrühren.');
console.log('Known fractions, explicit units, missing units, ranges, invalid amounts and null-preserving portion conversion passed.');

const re=ctx.window.RESERVE_REKEK;
for(const line of ['250 Mehl','⅜ Wasser','2 P kg Vanillenzucker']){const x=re.reviewIngredientReadings([line,line]);assert.equal(x.quantityClear,false,line);assert.equal(x.noQuantity,false,line);assert.equal(x.reviewRequired,true,line);}
assert.equal(re.reviewIngredientReadings(['1 EL Öl','1 EL Öl']).quantityClear,true);
const split=p.parseText('Milch\nIngredients\n⅜ l\nMilch\nInstructions\nVerrühren.');assert.equal(split.ingredients,'⅜ l Milch');
console.log('Reader agreement cannot approve missing units; split-line eighth fractions preserved.');

for(const line of ['100','250','3/16','1,5','⅜']){assert.equal(p.ingredient(line).amount,null,line);assert.equal(p.ingredient(line).uncertain,true,line);assert.equal(re.reviewIngredientReadings([line,line]).quantityClear,false,line);}
for(const line of ['1 Ei','1 Eiweiß','1 Eigelb']){assert.equal(p.ingredient(line).unit,'Stück',line);assert.equal(p.ingredient(line).amount,1,line);assert.equal(p.ingredient(line).uncertain,false,line);}
console.log('Independent-review regressions: bare quantities remain null; singular egg and egg-white counts preserved.');

const triple=p.parseText('Wasser\nIngredients\n⅜\nl\nWasser\nInstructions\nVerrühren.');assert.equal(triple.ingredients,'⅜ l Wasser');assert.equal(p.ingredient(triple.ingredients).amount,375);

for(const line of ['1 ⅜','1 3/16','2 1/2','100g','⅜ l','1 3']){assert.equal(p.ingredient(line).amount,null,line);assert.equal(p.ingredient(line).uncertain,true,line);}console.log('Mixed fractions and isolated amount/unit fragments do not produce partial quantities.');

assert.equal(p.ingredient('100G Reis').amount,100);assert.equal(p.ingredient('100G Reis').unit,'g');assert.equal(p.ingredient('2 eggs').amount,2);assert.equal(p.ingredient('2 eggs').unit,'Stück');

for(const line of ['6 Schweine- oder Putenschnitzel','6 Schweine - oder Putenschnitzel','6 Putenschnitzel']){const x=p.ingredient(line);assert.equal(x.amount,6,line);assert.equal(x.unit,'Stück',line);assert.equal(x.uncertain,false,line);}
const raw=p.parseText('Schnitzel\n6 Schweine- oder Putenschnitzel\n250 Mehl');assert.ok(raw.ingredients.includes('6 Schweine- oder Putenschnitzel'));assert.ok(raw.unresolved.some(x=>x.type==='unclassified-quantity-line'&&x.raw==='250 Mehl'));

}


// Literal source-unit and decorative-marker regressions.
{
const p=ctx.window.RESERVE_RECIPE_PARSER,k=ctx.window.RESERVE_REKEK;
for(const [s,amount,unit,name,uncertain] of [['= 30 g Butter',30,'g','Butter',false],['=30g Butter',30,'g','Butter',false],['1 Stange Lauch',1,'Stange','Lauch',true],['2 Stangen Lauch',2,'Stange','Lauch',true],['2 Gläser trockener Weißwein',2,'Glas','trockener Weißwein',true],['1 Glas Wasser',1,'Glas','Wasser',true],['1 St. Porree',1,'Stück','Porree',false],['1 Stck. Sellerie',1,'Stück','Sellerie',false]]){const x=p.ingredient(s);assert.equal(x.amount,amount,s);assert.equal(x.unit,unit,s);assert.equal(x.name,name,s);assert.equal(x.uncertain,uncertain,s);assert.equal(x.raw,s,s);}
for(const s of ['= 30 Mehl','2 Gläset Wein','1 Stange','2 Gläser','= Text','30 = 50 g Butter'])assert.equal(p.ingredient(s).uncertain,true,s);
assert.equal(p.ingredient('2 Gläser trockener Weißwein').unit,'Glas');assert.equal(p.ingredient('2 Gläser trockener Weißwein').amount,2);
const draft=p.parseText('Suppe\n=30g Butter\n1 Stange Lauch\n2 Gläser Wein');assert.equal(draft.ingredients,'=30g Butter\n1 Stange Lauch\n2 Gläser Wein');assert.equal(draft.unresolved.length,0);
for(const text of ['1 Stange Lauch','2 Gläser Wein']){const r=k.reviewIngredientReadings([text,text]);assert.equal(r.quantityClear,true);assert.equal(r.reviewRequired,true);assert.equal(r.quantityInferred,false);}
const r={id:'personal-container-check',name:'Suppe',portions:2,ingredientLines:['2 Gläser Wein'],steps:['Vermengen.'],diet:'Alles',prepMinutes:null,cookMinutes:null};assert.equal(p.toRecipe(r).pantryReady,false);assert.equal(p.toRecipe(r).ingredients[0].unit,'Glas');assert.equal(p.toRecipe(r).ingredients[0].amount,1);
console.log('Literal equals markers, source units, explicit count abbreviations, review gating and no volume/mass assumptions passed.');

assert.equal(k.reviewIngredientReadings(['= 12 EL Honig','= 12 EL Honig']).quantityClear,false);assert.equal(k.reviewIngredientReadings(['= 30 g Butter','= 30 g Butter']).quantityClear,true);

}

// User rule: take the lower serving count, never the lower ingredient amount.
for(const label of ['Für 2-3 Personen','Für ca. 2–3 Personen','2 — 3 Portionen','Für 2 bis 3 Personen','Portionen: 2–3','Für 3–2 Personen','For 2 to 3 servings','Für 2–3 Portion(en)'])assert.equal(p.parseText('Suppe\n'+label+'\nZutaten\n200 g Reis\nZubereitung\nGaren.').portions,'2',label);
for(const label of ['Für 0–3 Personen','Für 2–101 Personen'])assert.equal(p.parseText('Suppe\n'+label).portions,'');
assert.equal(p.ingredient('200–300 g Reis').uncertain,true);
const k=ctx.window.RESERVE_REKEK;
assert.equal(k.reviewCardMetadata([],['Für 2–3 Personen','Für 2–3 Personen']).portions,'2');
assert.equal(k.reviewCardMetadata([],['Für 2–3 Personen','Für 3–4 Personen']).portions,'');
const scaled=p.toRecipe({...r,portions:Number(p.parseText('Suppe\nFür 2–3 Personen').portions)});
assert.equal(scaled.ingredients[0].amount*4,400);
console.log('Lower serving-range endpoint, OCR disagreement, ingredient range safety and scaling passed.');

// Explicit user rule: EL=15 ml, TL=5 ml; source/OCR review units stay literal.
for(const [text,want,unit]of [['3 EL Olivenöl',45,'EL'],['1 TL Wasser',5,'TL'],['½ TL Salz',2.5,'TL'],['1 1/2 Esslöffel Öl',22.5,'EL'],['2 Teelöffel Senf',10,'TL'],['3 Eßlöffel Wasser',45,'EL'],['0,5 EL Öl',7.5,'EL']]){const x=p.pantryIngredient(text);assert.equal(x.amount,want,text);assert.equal(x.unit,'ml',text);assert.equal(x.uncertain,false,text);assert.equal(x.raw,text);assert.equal(x.displayUnit,unit);assert.equal(p.ingredient(text).unit,unit.toLowerCase());}
for(const text of ['EL Öl','1/0 EL Öl','0 TL Wasser','1-2 EL Öl','1 EL gehäufter Zucker','1 gehäufter EL Zucker','1 EL 2 TL Öl','1 Becher Schmand','Salz nach Geschmack'])assert.equal(p.pantryIngredient(text).uncertain,true,text);
const spoonSource={...r,ingredientLines:['3 EL Olivenöl','½ TL Salz']},spoonRecipe=p.toRecipe(spoonSource);assert.equal(spoonRecipe.pantryReady,true);assert.equal(spoonRecipe.ingredients[0].amount,22.5);assert.equal(spoonRecipe.ingredients[0].displayAmount,1.5);assert.equal(spoonRecipe.ingredients[0].unit,'ml');assert.equal(spoonRecipe.ingredients[1].amount,1.25);assert.equal(spoonSource.ingredientLines[0],'3 EL Olivenöl');console.log('Measuring spoons: 15/5 ml, fractions, per-person conversion, source display, malformed/heaped/container guards and no density assumptions passed.');

assert.equal(p.pantryIngredient('9'.repeat(308)+' EL Öl').uncertain,true);

// Rich personal details are optional, bounded, portable and never fabricated.
{const details={description:'Unsere Reispfanne',equipment:['Topf'],prepNotes:['Reis waschen.'],doneness:'Reis ist weich.',substitutions:['Mit Zucchini.'],leftovers:'Hinweis aus der Vorlage.',safety:'Hinweis aus der Vorlage.',nutrition:{kcal:450,protein:12}};assert.ok(p.validRecord({...r,details}));const rich=p.toRecipe({...r,details});assert.equal(rich.description,details.description);assert.deepEqual([...rich.equipment],['Topf']);assert.equal(rich.nutrition.kcal,450);for(const bad of [{nutrition:{kcal:-1}},{nutrition:{kcal:Infinity}},{equipment:'Topf'},{description:'a'.repeat(3001)},{nutrition:[]},{nutrition:{unknown:1}}])assert.equal(p.validRecord({...r,details:bad}),false);}

assert.equal(p.ingredient('1Ei Ei').name,'Ei');assert.equal(p.ingredient('1Ei Ei').amount,1);assert.equal(p.ingredient('1Ei Ei').raw,'1Ei Ei');

// Explicit fraction typography is normalised for arithmetic, never by guessing OCR digits.
for(const [source,amount] of [['1 / 2 TL Salz',2.5],['1 1 / 2 EL Öl',22.5],['⅓ l Milch',1000/3],['2⅓ EL Öl',35],['1⁄2 kg Mehl',500],['1∕2 kg Mehl',500]]){
 const x=p.pantryIngredient(source);assert.ok(Math.abs(x.amount-amount)<1e-9,source);assert.equal(x.uncertain,false,source);assert.equal(x.raw,source);
}
for(const source of ['1 / 0 TL Salz','1 / 2 / 3 TL Salz','1 / 2 bis 3 / 4 TL Salz','⅓ Milch','1509 Zucker','1E0 Ei'])assert.equal(p.pantryIngredient(source).uncertain,true,source);
for(const heading of ['Zutaten\n','']){
 const split=p.parseText('Suppe\n'+heading+'⅓\nl\nMilch\n1 / 2\nTL\nSalz\nZubereitung\nVerrühren.');
 assert.equal(split.ingredients,'⅓ l Milch\n1 / 2 TL Salz');assert.equal(split.steps,'Verrühren.');
}
const fractionRead=k.reviewIngredientReadings(['1 / 2 TL Salz','½ TL Salz']);assert.equal(fractionRead.quantityClear,true);assert.equal(fractionRead.agreement,true);assert.equal(fractionRead.expression,'1 / 2 TL Salz');assert.deepEqual([...fractionRead.reads],['1 / 2 TL Salz','½ TL Salz']);
assert.equal(k.reviewIngredientReadings(['1 / 2 TL Salz','⅓ TL Salz']).quantityClear,false);
console.log('Explicit fraction typography, source preservation, split lines and ambiguous OCR guards passed.');
