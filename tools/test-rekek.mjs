import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),context);
const p=context.window.RESERVE_REKEK;
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
