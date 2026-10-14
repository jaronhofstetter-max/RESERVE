import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),ctx);const p=ctx.window.RESERVE_RECIPE_PARSER;
for(const [line,amount,unit] of [['200 g Reis',200,'g'],['0,5 kg Mehl',500,'g'],['½ l Milch',500,'ml'],['1 1/2 kg Kartoffeln',1500,'g'],['1½ kg Kartoffeln',1500,'g'],['2 Eier',2,'Stück'],['2 Stück Eier',2,'Stück'],['100g Reis',100,'g']]){const x=p.ingredient(line);assert.equal(x.amount,amount,line);assert.equal(x.unit,unit,line);assert.equal(x.uncertain,false,line)}
for(const line of ['Salz nach Geschmack','1 EL Öl','1 Packung Reis','100–200 g Mehl','1/0 g Reis'])assert.equal(p.ingredient(line).uncertain,true,line);
const text='Reispfanne\nFür 2 Portionen\nZutaten\n200 g Reis\n2 Stück Eier\nSalz nach Geschmack\nZubereitung\n1. Reis garen.\n2. Eier hinzufügen.\nNährwerte\n560 kcal';const parsed=p.parseText(text);assert.equal(parsed.name,'Reispfanne');assert.equal(parsed.portions,'2');assert.ok(parsed.ingredients.includes('Salz nach Geschmack'));assert.equal(parsed.steps,'Reis garen.\nEier hinzufügen.');
const r={id:'personal-test',name:'Reispfanne',portions:2,ingredientLines:['200 g Reis','2 Eier'],steps:['Reis garen.','Eier hinzufügen.'],diet:'Alles',prepMinutes:null,cookMinutes:null,source:''};assert.ok(p.validRecord(r));const recipe=p.toRecipe(r);assert.equal(recipe.ingredients[0].amount,100);assert.equal(recipe.ingredients[1].amount,1);assert.equal(recipe.pantryReady,true);assert.equal(Object.keys(recipe.nutrition).length,0);assert.equal(p.toRecipe({...r,ingredientLines:['1 EL Öl']}).pantryReady,false);assert.equal(p.validRecord({...r,portions:0}),false);assert.equal(p.validRecord({...r,id:'x\" onclick=\"alert(1)'}),false);console.log('Personal recipes: fractions, units, original portions, uncertain quantities, preserved steps, validation and no invented nutrition OK');

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
