import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),context);
const p=context.window.RESERVE_REKEK;
// Observed screenshot failure, represented as text/geometry fixtures (not a pixel OCR benchmark).
const marinade=p.parseText('Hähnchenbrust in\nHonig-Senf-Marinade\nFür ca. 3–4 Personen\nZutaten\n600 g Hähnchenbrustfilet 1. Hähnchenbrust in Stücke schneiden.');
assert.equal(marinade.name,'Hähnchenbrust in Honig-Senf-Marinade');
assert.equal(marinade.portions,'');
assert.ok(marinade.unresolved.some(x=>x.type==='portion-range'));
assert.ok(marinade.unresolved.some(x=>x.type==='mixed-columns'));
assert.equal(p.reviewIngredientReadings(['12 EL Honig','12 EL Honig']).quantityClear,false);
assert.equal(p.reviewIngredientReadings(['1½ EL Honig','1½ EL Honig']).quantityClear,true);
const word=(text,x0,y0,x1,y1)=>({text,bbox:{x0,y0,x1,y1}});
const geometry={words:[word('ZUTATEN',100,450,230,480),word('ZUBEREITUNG',540,450,750,480)],lines:[word('Hähnchenbrust in',160,100,800,150),word('Honig-Senf-Marinade',120,160,850,210)]};
const textDivider=p.textRecipeDivider([geometry],1000,1500);
assert.ok(textDivider&&textDivider.centerX<540&&textDivider.top<450);
assert.equal(p.textRecipeDivider([{words:[word('ZUTATEN',100,450,230,480)]}],1000,1500),null);
// Observed screenshot: heading starts right of the preparation number column.
const inset=p.textRecipeDivider([{words:[word('ZUTATEN',34,224,125,237),word('ZUBEREITUNG',322,232,466,245),word('1.',306,265,315,278),word('2.',305,313,315,326),word('3.',304,380,315,393)]}],583,905);
assert.ok(inset.centerX+7<304,'Right crop must preserve every preparation marker');
const header=p.cardHeaderRegions([geometry],textDivider,1000,1500,100).title;
assert.ok(header.y0<=100&&header.y1>=210);
const separated=p.parseCardSteps('ZUBEREITUNG\n1. Hähnchenbrust in Stücke schneiden.\n2. Zutaten in einer Schüssel verrühren.\n3. Hähnchen zur Marinade geben.\n4. Abgedeckt im Kühlschrank ziehen lassen.\n5. Alternativ roh einfrieren.\n6. Nach dem Auftauen vollständig durchgaren.\nfoodchaos.daily');
assert.equal(separated.count,6);assert.equal(separated.sequenceComplete,true);assert.ok(!separated.steps.includes('foodchaos.daily'));
const r=p.parseText('23:05 4G\nGemüsetopf\n2 Portion(en)\n10 Min Vorbereitung\n15 Min Kochzeit\nZutaten\n200 g\nKarotten\n120 g Gemüse\n(alternativ: Kürbis)\nFür die Sauce:\n1 EL Öl\nSchritt-für-Schritt-Kochen leicht gemacht!\nZum Starten antippen.\nZusätzlich:\n1 EL Öl\nNährwertangaben (pro Portion)\n500 kcal\nZubereitung\nSchritt 1\nGemüse schneiden.\nIn den Topf geben.\nSchritt 2\nGaren.\nTIPP\nMit Kräutern servieren.');
assert.equal(r.name,'Gemüsetopf');assert.equal(r.portions,'2');assert.equal(r.prepMinutes,10);assert.equal(r.cookMinutes,15);
assert.equal(r.ingredients,'200 g Karotten\n120 g Gemüse (alternativ: Kürbis)\n1 EL Öl\n1 EL Öl');
assert.equal(r.steps,'Gemüse schneiden. In den Topf geben.\nGaren.');assert.equal(r.unresolved.length,0);
const pending=p.parseText('Suppe\nZutaten\n200 g\nZubereitung\nKochen.');assert.equal(pending.ingredients,'200 g');assert.equal(pending.unresolved.length,1);
const ambiguous=p.parseText('Suppe\nZutaten\nPfeffer nach Geschmack\nZubereitung\nKochen.');assert.equal(ambiguous.ingredients,'Pfeffer nach Geschmack');
console.log('REKEK regression: split quantities, wrapped alternatives, repeated ingredients, page noise, numbered steps and unresolved amounts OK. Synthetic text tests only.');

assert.equal(p.parseText('example.ch\nSuppe\nZutaten\n2½ EL\nÖl\nZubereitung\nKochen.').ingredients,'2½ EL Öl');
assert.equal(p.parseText('example.ch\nSuppe\nZutaten\n200 g Gemüse\nZubereitung\nKochen.').name,'Suppe');

const timeColumns=p.parseText('Suppe\n10 Min. 15 Min.\nVorbereitungszeit Kochzeit\nZutaten\n120 g Gemüse (alternativ:\nKürbis oder Sellerie)\n1 TL Sauce mit\nSojasauce und Essig, mit\nZitrone\n¼ Bund Petersilie\nZubereitung\nSchritt 1\n120 g Gemüse – 1 TL Sauce\n\nGemüse garen.');
assert.equal(timeColumns.prepMinutes,10);assert.equal(timeColumns.cookMinutes,15);
assert.equal(timeColumns.ingredients,'120 g Gemüse (alternativ: Kürbis oder Sellerie)\n1 TL Sauce mit Sojasauce und Essig, mit Zitrone\n¼ Bund Petersilie');
assert.equal(timeColumns.steps,'Gemüse garen.');
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('¼ Bund Petersilie').unit,'bund');
assert.equal(p.parseText('Suppe\nZubereitung\n200 g Gemüse kochen.\n\nServieren.').steps,'200 g Gemüse kochen.\nServieren.');

for(const raw of ['1 bis 2 Prisen Salz','1–2 Prisen Salz','1 halber Nudelkochtopf Wasser']){const x=context.window.RESERVE_RECIPE_PARSER.ingredient(raw);assert.equal(x.amount,null);assert.equal(x.uncertain,true);}
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('2 Blatt Gelatine').unit,'blatt');
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('5 Esslöffel Sirup').unit,'el');
assert.equal(p.parseText('Obst\nZutaten\nObst\nZubereitung\nWaschen.\nErfasst von: Autor\nStammt von Wikipedia, Hauptautor war Test').steps,'Waschen.');

assert.equal(p.parseText('Kuchen\nZubereitung\n200 g Mehl unterheben.\n\nBacken.').steps,'200 g Mehl unterheben.\nBacken.');

const multiple=p.parseCandidates('Reisgericht\nZutaten\n200 g Reis\nZubereitung\nReis kochen.\n\nGemüsesuppe\n4 Personen\nZutaten:\n1 l Wasser\n200 g Gemüse\nZubereitung\nGemüse kochen.');
assert.equal(multiple.candidates.length,2);assert.equal(multiple.candidates[0].name,'Reisgericht');assert.equal(multiple.candidates[1].name,'Gemüsesuppe');assert.equal(multiple.candidates[0].steps,'Reis kochen.');assert.equal(multiple.candidates[1].ingredients,'1 l Wasser\n200 g Gemüse');assert.equal(multiple.reviewRequired,true);
const broken=p.parseCandidates('Reisgericht\nZutaten\n200 g Reis\nZubereitung\nKochen.\nGemüsesuppe\nZutaten\n200 g Gemüse');assert.equal(broken.candidates.length,0);assert.equal(broken.issue,'recipe-boundaries-uncertain');
const one=p.parseCandidates('Kuchen\nZutaten\n200 g Mehl\nFür die Sauce:\n20 g Butter\nZubereitung\nBacken.');assert.equal(one.candidates.length,1);assert.equal(one.multipleRecipes,false);assert.equal(one.candidates[0].ingredients,'200 g Mehl\n20 g Butter');
console.log('Browser recipe candidates: explicit recipe boundaries, serving metadata, separate steps, incomplete section rejection and sauce preservation passed. Synthetic text cases only.');

// Observed live OCR defect on user photo 04: decoration before preparation heading.
const decorated=p.parseText('_ PAPRIKA-RAHM-HÄHNCHEN\nMIT BANDNUDELN\nZutaten:\n* 2 Hähnchenbrüste\n* 200g Bandnudeln\n* Salz, Pfeffer\n_ Zubereitung:\n1. Hähnchenbrüste in Stücke\nschneiden.\n2. Bandnudeln kochen.');
assert.equal(decorated.ingredients,'* 2 Hähnchenbrüste\n* 200g Bandnudeln\n* Salz, Pfeffer');assert.equal(decorated.steps,'Hähnchenbrüste in Stücke schneiden.\nBandnudeln kochen.');
assert.equal(p.parseText('Suppe\n_ Zutaten:\n200 g Gemüse\n— Zubereitung:\nKochen.').steps,'Kochen.');
console.log('Observed live photo OCR regression: decorated section heading keeps preparation out of ingredients.');

const pixels={width:100,height:160,data:new Uint8ClampedArray(100*160*4).fill(255)};
assert.equal(p.findRecipeDivider(pixels),null);
for(let y=30;y<140;y++){const x=Math.round(43+.04*(y-80)),i=(y*100+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=0;}
const divider=p.findRecipeDivider(pixels);assert.ok(divider);assert.ok(Math.abs(divider.centerX-43)<5);assert.ok(divider.bottom-divider.top>100);
const left='Zutaten:\n500 g Fleisch\n1 Ei\n2 EL Petersilie\n1 TL Senf\n1 EL Mehl',right='1. Mischen.\n2. Formen.\n3. Garen.';
assert.ok(p.agreedRecipeColumns([left,left],[right,right]));assert.equal(p.agreedRecipeColumns([left,left.replace('500','800')],[right,right]),null);assert.equal(p.agreedRecipeColumns([left,left],[right,'2. Formen.']),null);assert.equal(p.agreedRecipeColumns([left.replace('Zutaten:','Liste'),left.replace('Zutaten:','Liste')],[right,right]),null);
console.log('Browser card fallback: pixel divider, blank rejection, exact OCR column agreement and disagreement rejection passed.');

const box=(x0,y0,x1,y1)=>({x0,y0,x1,y1});
const numbers=Array.from({length:6},(_,i)=>({text:String(i+1),bbox:box(100,50+i*20,110,60+i*20)}));
assert.equal(p.quantityColumnStart([{words:numbers}],{top:30,bottom:190,centerX:240},600),95);
assert.equal(p.quantityColumnStart([{words:numbers.slice(0,4)}],{top:30,bottom:190,centerX:240},600),null);
const labels=[{text:'Zutaten:',bbox:box(5,5,100,20)}];
const rows=Array.from({length:5},(_,i)=>({text:`${i+1} g Zutat`,bbox:box(5,40+i*30,180,55+i*30)}));
assert.equal(p.ingredientRowBoxes([labels.concat(rows),labels.concat(rows)]).length,5);
assert.equal(p.ingredientRowBoxes([rows,rows]).length,0);
assert.equal(p.ingredientRowBoxes([labels.concat(rows.slice(0,4)),labels.concat(rows.slice(0,4))]).length,0);
const conflict=p.reviewIngredientReadings(['500 g Fleisch','800 g Fleisch']);assert.equal(conflict.agreement,false);assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient(conflict.expression).amount,null);
assert.equal(p.reviewIngredientReadings(['• 1 Ei','1 Ei']).agreement,true);
assert.equal(p.reviewIngredientReadings(['1 Ei','']).agreement,false);
assert.equal(p.reviewIngredientReadings(['',''],['4 TL Senf']).expression,'Menge ungeklärt: 4 TL Senf');
assert.equal(p.reviewIngredientReadings(['o 1 Ei','1 Ei']).agreement,false);
assert.equal(p.reviewIngredientReadings(['500 a Fleisch','500 g Fleisch']).agreement,false);
assert.equal(p.reviewIngredientReadings(['500 g Fleisch','500 g Fleisch']).reviewRequired,true);
assert.equal(p.reviewIngredientReadings(['© 500 ml Brühe','© 500 ml Brühe']).expression,'500 ml Brühe');
assert.equal(p.reviewIngredientReadings(['500 q Fleisch','500 q Fleisch']).quantityClear,false);
assert.equal(p.reviewIngredientReadings(['e1 Ei','e1 Ei']).quantityClear,false);
assert.equal(p.reviewIngredientReadings(['Salz & Pfeffer','Salz & Pfeffer']).quantityClear,false);
console.log('Ingredient row review: pixel-independent numeric alignment, literal label gate, paired rows, conflicting quantity suppression and preserved OCR evidence passed.');

for(const raw of ['‚ 500 ml Brühe','‚100 ml Sahne',', 1 Spritzer Zitronensaft'])assert.equal(p.reviewIngredientReadings([raw,raw]).quantityClear,true);
assert.equal(p.reviewIngredientReadings([',5 l Wasser',',5 l Wasser']).quantityClear,false);
assert.equal(p.reviewIngredientReadings(['0 g Salz','0 g Salz']).quantityClear,false);
assert.equal(p.reviewIngredientReadings(['Salz & Pfeffer','Salz & Pfeffer']).expression,'Salz & Pfeffer');
assert.equal(p.reviewIngredientReadings(['Salz & Pfeffer','Salz & Pfeffer']).noQuantity,true);
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('1 Spritzer Zitronensaft').unit,'spritzer');
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('1 Spritzer Zitronensaft').uncertain,true);
const malformed=p.reviewIngredientReadings(['500 a Fleisch','500 a Fleisch']);
assert.equal(p.reviewMeasuredReadings(malformed,['500 g','500 g']).expression,'500 g Fleisch');
assert.equal(p.reviewMeasuredReadings(malformed,['500 g','500 ml']).measureReread,false);
assert.equal(p.reviewMeasuredReadings(malformed,['500 a','500 a']).measureReread,false);
assert.equal(p.reviewMeasuredReadings(malformed,['500 g','800 g']).measureReread,false);
assert.equal(p.reviewMeasuredReadings(p.reviewIngredientReadings(['500 g Fleisch','800 g Fleisch']),['500 g','500 g']).quantityClear,false);
assert.equal(p.reviewCardMetadata(['Schneller Gemüsetopf ♡','Schneller Gemüsetopf'],['für 6 Personen','für 6 Personen ♡']).name,'Schneller Gemüsetopf');
assert.equal(p.reviewCardMetadata(['Schneller Gemüsetopf','Gemüsetopf'],['für 6 Personen','für 4 Personen']).name,'');
assert.equal(p.reviewCardMetadata([],['für 6 Personen','6']).portions,'');
assert.equal(p.reviewCardMetadata([],['für 6 Personen','für 6 Personen']).portions,'6');
assert.equal(p.reviewCardMetadata([],['für 6 Fersonen','für 6 Fersonen'],'6').portions,'6');
assert.equal(p.reviewCardMetadata([],['für 6 Fersonen','für 4 Fersonen'],'6').portions,'');
assert.equal(p.reviewCardMetadata([],['für 6 Fersonen','für 6 Fersonen']).portions,'');
const sequential=p.parseCardSteps('1. Zutaten mischen.\n2 Formen.\n15 Minuten ruhen lassen.\n3. Garen.');assert.equal(sequential.count,3);assert.ok(sequential.steps.includes('Formen. 15 Minuten'));assert.equal(sequential.sequenceComplete,true);
assert.equal(p.parseCardSteps('1. Mischen.\n2. Formen.\n4. Garen.').sequenceComplete,false);
assert.equal(p.parseCardSteps('1. Mischen.\n2 EL Wasser zugeben.\n2. Formen.\n3. Garen.').count,3);
assert.equal(p.cardHeaderRegions([], {top:100},600,800,90).title,null);
const titleRegion=p.cardHeaderRegions([{words:[{text:'Langer',bbox:box(600,100,900,240)},{text:'Titel',bbox:box(920,100,1100,180)}]}],{top:340},1500,1500,250).title;
assert.ok(titleRegion.y1<210);assert.ok(titleRegion.x0<500);
const numericUnitRows=rows.map((r,i)=>({...r,words:i?[]:[{text:'500',bbox:box(10,40,50,55)},{text:'9',bbox:box(55,40,65,55)}]}));
assert.ok(p.ingredientRowBoxes([labels.concat(numericUnitRows),labels.concat(numericUnitRows)])[0].measureBBox);
assert.equal(p.reviewMeasuredReadings(malformed,['500 9','500 9']).measureReread,false);
assert.equal(p.reviewCardMetadata(['Omas Königsberger Klopse ¢','Omas Königsberger Klopse ¢'],[]).name,'Omas Königsberger Klopse');
assert.equal(p.reviewCardMetadata(['Gericht für 99 ¢','Gericht für 99 ¢'],[]).name,'Gericht für 99 ¢');
console.log('Card refinements: punctuation preserves digits, literal amount rereads reject conflicting numbers, serving/title disagreement rejection, Spritzer remains unconvertible, and sequential preparation markers passed.');

