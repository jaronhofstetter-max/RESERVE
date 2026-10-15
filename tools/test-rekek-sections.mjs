import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};
vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),context);
const K=context.window.RESERVE_REKEK;

// Generic synthetic cases; no private recipe photographs or reference text.
const unlabeled=K.parseText('Gemüsepfanne\n250 g Gemüse\n2 EL Öl\nSalz, Pfeffer\nGemüse klein schneiden.\nIm Öl braten und servieren.');
assert.equal(unlabeled.name,'Gemüsepfanne');
assert.equal(unlabeled.ingredients,'250 g Gemüse\n2 EL Öl\nSalz, Pfeffer');
assert.equal(unlabeled.steps,'Gemüse klein schneiden.\nIm Öl braten und servieren.');
assert.equal(K.parseText('Sauce\nZutaten\n100 ml Wasser\n20 g Butter\nZubereitung\nAlles verrühren.').name,'Sauce');

const inline=K.parseText('Teigtaschen\nZutaten: 300 g Mehl\n2 Eier\nZubereitung: Mehl und Eier vermengen.\nTeig kneten.');
assert.equal(inline.ingredients,'300 g Mehl\n2 Eier');
assert.equal(inline.steps,'Mehl und Eier vermengen.\nTeig kneten.');

const groups=K.parseText('Obstkuchen\nTeig: 220 g Mehl\n1 Ei\nBelag:\n400 g Obst\nZubereitung (Teig): Alles zu einem Teig verarbeiten.\nCreme:\n100 ml Sahne\n20 g Zucker\nCreme:\nSahne und Zucker schlagen.\nAuf den Kuchen streichen.');
assert.equal(groups.ingredients,'220 g Mehl\n1 Ei\n400 g Obst\n100 ml Sahne\n20 g Zucker');
assert.equal(groups.ingredientSections.map(s=>s.name).join('|'),'Teig|Belag|Creme');
assert.ok(groups.steps.includes('Alles zu einem Teig verarbeiten.'));
assert.ok(groups.steps.includes('Sahne und Zucker schlagen.'));
assert.ok(!groups.ingredients.includes('schlagen'));

const implicit=K.parseText('Gebäck\nZutaten\n200 g Mehl\n1 Eigelb zum Bestreichen\n2 EL Öl zum Braten\nTeig kneten.');
assert.equal(implicit.ingredients,'200 g Mehl\n1 Eigelb zum Bestreichen\n2 EL Öl zum Braten');
assert.equal(implicit.steps,'Teig kneten.');
assert.equal(K.parseText('Gebäck\nZutaten\n1 Eigelb\nzum Bestreichen\nZutaten miteinander vermischen.').ingredients,'1 Eigelb zum Bestreichen');
assert.equal(K.parseText('Gebäck\nZutaten\n100 g Mehl\nZutaten miteinander vermischen.').steps,'Zutaten miteinander vermischen.');
assert.equal(K.parseText('Suppe\nZutaten\n200 g Gemüse\n200 g Gemüse kochen.').steps,'200 g Gemüse kochen.');

const nutrition=K.parseText('Ofengemüse\n2 Portionen\n10 g Ballaststoffe p.P.\nZutaten\n300 g Gemüse\n1 EL Öl\nZubereitung\nGemüse backen.');
assert.equal(nutrition.ingredients,'300 g Gemüse\n1 EL Öl');
assert.ok(nutrition.ignored.includes('10 g Ballaststoffe p.P.'));
assert.equal(K.parseText('Proteinbrot\nZutaten\n20 g Proteinpulver\nZubereitung\nTeig kneten.').ingredients,'20 g Proteinpulver');

const multiple=K.parseCandidates('Eintopf\n250 g Bohnen\n100 ml Wasser\nBohnen kochen.\n\nReiskuchen\n200 g Reis\n150 ml Milch\nReis garen.');
assert.equal(multiple.candidates.length,2);
assert.equal(multiple.candidates[0].ingredients,'250 g Bohnen\n100 ml Wasser');
assert.equal(multiple.candidates[0].steps,'Bohnen kochen.');
assert.equal(multiple.candidates[1].name,'Reiskuchen');
const sectionNotRecipe=K.parseCandidates('Kuchen\nTeig:\n200 g Mehl\n1 Ei\nBelag:\n300 g Obst\n20 g Zucker\nZubereitung\nBacken.');
assert.equal(sectionNotRecipe.candidates.length,1);
assert.equal(sectionNotRecipe.multipleRecipes,false);
assert.equal(K.parseCandidates('Suppe\n100 g Gemüse\n200 ml Wasser\nKochen.\nGebäck\n200 g Mehl\n1 Ei').issue,'recipe-boundaries-uncertain');

const unresolved=K.parseText('Suppe\n250 Mehl\n2-3 EL Öl\nAlles vermengen.');
assert.equal(unresolved.ingredients,'250 Mehl\n2-3 EL Öl');
assert.ok(unresolved.unresolved.some(r=>r.raw==='250 Mehl'));
assert.ok(context.window.RESERVE_RECIPE_PARSER.ingredient('2-3 EL Öl').uncertain);
console.log('Recipe section regressions passed: labels, implicit instructions, subsections, ingredient purposes, nutrition, missing units and multiple recipes. Text-only tests; not OCR accuracy.');

const decorated=K.parseText('Instagram\nFolgen\nGemüse vom Blech\n10 Min. Vorbereitung, 30 Min. Backzeit\n2 Portionen\n© Zutaten:\n300 g Gemüse\nU 2 EL Öl\nE81 100 g Käse\nZubereitung:\nGemüse auf dem Blech backen.\nGefällt 123 Mal\nkochprofil # neue Rezepte');
assert.equal(decorated.name,'Gemüse vom Blech');
assert.ok(decorated.ingredients.includes('U 2 EL Öl'));
assert.ok(decorated.ingredients.includes('E81 100 g Käse'));
assert.ok(!decorated.steps.includes('kochprofil'));
assert.ok(context.window.RESERVE_RECIPE_PARSER.ingredient('E81 100 g Käse').uncertain);
const interleaved=K.parseText('Gemüseauflauf\n300 g Gemüse\nIn die Form geben\n1 Becher Sahne\n1 Becher Schmand verrühren\n1 Tüte Suppenpulver darin auflösen\nÜber das Gemüse gießen\nBei 180 Grad backen.');
assert.equal(interleaved.ingredients,'300 g Gemüse\n1 Becher Sahne\n1 Becher Schmand\n1 Tüte Suppenpulver');
assert.ok(interleaved.steps.includes('In die Form geben'));
assert.ok(interleaved.steps.includes('1 Becher Schmand verrühren'));
assert.ok(interleaved.steps.includes('180 Grad'));
const seasoning=K.parseCandidates('Zutaten für 3 Personen:\n300 g Nudeln\n200 g Gemüse\nSalz, Pfeffer\nZubereitung:\nGemüse dünsten.\nNudeln kochen.');
assert.equal(seasoning.candidates.length,1);
assert.ok(seasoning.candidates[0].steps.includes('Gemüse dünsten'));
console.log('OCR layout regressions passed: decorated lists, source title evidence, uncertain prefixes, interleaved quantities and seasoning boundaries.');

assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('1 kleine Dose Mais').unit,'dose');

// Pixel-only panel detection: inset card, plain page, two competing cards.
function panelImage(rectangles){const width=240,height=360,data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4){data[i]=70;data[i+1]=90;data[i+2]=80;data[i+3]=255;}for(const [x0,y0,x1,y1] of rectangles)for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=255;}return{width,height,data};}
const panel=K.findRecipePanel(panelImage([[25,70,215,300]]));assert.ok(panel);assert.equal(panel.x0,25);assert.equal(panel.x1,215);assert.ok(panel.y0>=69&&panel.y0<=71);assert.ok(panel.y1>=298&&panel.y1<=301);
assert.equal(K.findRecipePanel(panelImage([[0,0,240,360]])),null);
assert.equal(K.findRecipePanel(panelImage([])),null);
assert.equal(K.findRecipePanel(panelImage([[25,20,215,130],[25,200,215,310]])),null);
const wrapped=K.parseText('Kartoffelpfanne\n20 Min. Vorbereitung, 35 Min. Backzeit\nZutaten\n300 g Kartoffeln\nZubereitung\nAlles mit Kräutern und\nGewürzen vermengen.\nIm Ofen garen.');
assert.equal(wrapped.prepMinutes,20);assert.equal(wrapped.cookMinutes,35);assert.equal(wrapped.steps,'Alles mit Kräutern und Gewürzen vermengen.\nIm Ofen garen.');
console.log('Inset panel detection rejects blank/full-width/competing panels; labelled combined times and wrapped preparation preserved.');

const clipping=K.parseText('XX. & |\nOmas Lieblings\n\nMandel-Rezept\nMürbeteig für ein Blech\nTeig: 250 g. Mehl, 80 g. Zucker\n1 Ei, 90 g. Butter\nBelag: 3 Eßlöffel Wasser\n150 g Nüsse\nWasser und Butter aufkochen. Nüsse und\nMandeln untermischen. Mit Orangen-\nmarmelade bestreichen.');
assert.equal(clipping.name,'Omas Lieblings Mandel-Rezept');
assert.equal(clipping.ingredients,'250 g. Mehl\n80 g. Zucker\n1 Ei\n90 g. Butter\n3 Eßlöffel Wasser\n150 g Nüsse');
assert.match(clipping.steps,/^Wasser und Butter aufkochen/);
assert.match(clipping.steps,/Orangenmarmelade/);
assert.equal(context.window.RESERVE_RECIPE_PARSER.ingredient('3 Eßlöffel Wasser').unit,'el');
assert.equal(K.parseText('Salat\nZutaten\n1,5 g Salz\n200 g Tomaten, klein geschnitten\nAlles mischen.').ingredients,'1,5 g Salz\n200 g Tomaten, klein geschnitten');
console.log('Printed clipping: explicit recipe title, comma quantities, old spelling of tablespoons, implicit aufkochen and wrapped compound words preserved.');
