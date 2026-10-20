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

const sourceIngredients='200 g Butter\n150 g Mändeln\n4 Eßlöffei Wasser\n7 EBlöffel Marmelade';
const sourceSteps='Wasser und Rutter aufkochen. Mandeln unte mischen. 20 - 30 Min. bei 180° backen.';
const suggestions=K.contextSuggestions(sourceIngredients,sourceSteps);
assert.deepEqual(Array.from(suggestions,s=>s.from+' → '+s.to).sort(),['EBlöffel → Eßlöffel','Eßlöffei → Eßlöffel','Mändeln → Mandeln','Rutter → Butter','unte mischen → untermischen'].sort());
assert.ok(suggestions.every(s=>!/[0-9]/.test(s.from+s.to)));
assert.equal(sourceIngredients,'200 g Butter\n150 g Mändeln\n4 Eßlöffei Wasser\n7 EBlöffel Marmelade');
assert.equal(K.contextSuggestions('200 g Butter\n150 g Mandeln\n4 Eßlöffel Wasser','Butter aufkochen. Mandeln untermischen. 20 - 30 Min. bei 180° backen.').length,0);
assert.equal(K.contextSuggestions('200 g Butter\n200 g Futter','Rutter schneiden.').length,0); // competing ingredient evidence
assert.equal(K.contextSuggestions('200 g Butter','Butter aufkochen. 1/2 TL Salz hinzugeben.').length,0);
console.log('Context review: five text-only hypotheses, no mutation or numeric edits, correct words and ambiguous ingredient evidence preserved.');

const texturePixels={width:50,height:50,data:new Uint8ClampedArray(50*50*4)};for(let i=0;i<2500;i++)texturePixels.data.set([180,180,180,255],i*4);for(let y=10;y<20;y++)for(let x=10;x<30;x++)texturePixels.data.set([0,0,0,255],(y*50+x)*4);
texturePixels.data.set([0,0,0,255],(35*50+35)*4);const originalPixels=Array.from(texturePixels.data),prepared=K.prepareTextOnTexture(texturePixels);assert.ok(prepared);assert.equal(prepared.data[(15*50+15)*4],0);assert.equal(prepared.data[(35*50+35)*4],255);assert.deepEqual(Array.from(texturePixels.data),originalPixels);assert.equal(K.prepareTextOnTexture({width:50,height:50,data:new Uint8ClampedArray(10000).fill(255)}),null);
const textureRow=(text,y)=>{let x=80;const words=text.split(' ').map(text=>{const w={text,bbox:{x0:x,y0:y,x1:x+Math.max(12,text.length*10),y1:y+24}};x=w.bbox.x1+12;return w;});return{text,words,bbox:{x0:80,y0:y,x1:x,y1:y+24}};};
const textureData={lines:[textureRow('Sommercreme',30),textureRow('Zutaten',100),textureRow('2 Becher Sahne',150),textureRow('180 g Zucker',190),textureRow('2 Vanillinzucker',230),textureRow('Alles verrühren.',300),textureRow('Über Nacht kühl stellen.',340),textureRow('Fertig',400)]};
const textureRegions=K.textureRecipeRegions(textureData,500,600);assert.equal(textureRegions.ingredientRows,3);assert.ok(textureRegions.title.y1<textureRegions.ingredients.y0);assert.ok(textureRegions.ingredients.y1<textureRegions.steps.y0);assert.ok(textureRegions.steps.y1<400);assert.equal(K.textureRecipeRegions({lines:textureData.lines.filter(r=>r.text!=='Zutaten')},500,600),null);
const uncertainUnits=K.parseText('Sommercreme\nZutaten\n2 Becher Sahne |\n180 g Zucker\n2 Vanillinzucker\n4 Sahnesteif\n1 Getränkepulver\nZubereitung\nAlles verrühren. |\nÜber Nacht kühl stellen. |');assert.equal(uncertainUnits.ingredients,'2 Becher Sahne\n180 g Zucker\n2 Vanillinzucker\n4 Sahnesteif\n1 Getränkepulver');assert.equal(uncertainUnits.cookMinutes,null);assert.equal(uncertainUnits.portions,'');assert.equal(uncertainUnits.unresolved.filter(u=>u.type==='unclassified-quantity-line').length,3);assert.match(uncertainUnits.steps,/Über Nacht kühl stellen\.$/);
console.log('Texture fallback: pixel isolation, source preservation, explicit section/quantity regions, pipe noise, missing units and unknown overnight duration preserved.');

assert.equal(K.parseText('Creme\nZutaten\n180 g Zucker\nZubereitung\nAuf den Boden geben, ]\nüber Nacht kühl stellen.').steps,'Auf den Boden geben, über Nacht kühl stellen.');
assert.equal(K.parseText('Creme\nZutaten\n180 g Zucker\nZubereitung\n[Optional\nkühl stellen. ]').steps,'[Optional kühl stellen. ]');
console.log('Unpaired closing border bracket removed; genuine wrapped square brackets preserved.');

const unlabelledRows=[textureRow('Knödel',30),textureRow('100 g Mehl',120),textureRow('80 g Butter',170),textureRow('1 Ei',220),textureRow('%TL Salz',270),textureRow('Alles quetschen.',340),textureRow('Wasser darf nicht kochen!',380)];
const quantityRegions=K.quantityRecipeRegions({lines:unlabelledRows},500,600);assert.equal(quantityRegions.ingredients.length,4);assert.equal(quantityRegions.ingredients[2].source,'1 Ei');assert.equal(quantityRegions.ingredients[3].unit,'TL');assert.equal(quantityRegions.ingredients[3].tail,'Salz');assert.ok(quantityRegions.ingredients.every(r=>r.box.y1<quantityRegions.steps.y0));
assert.equal(K.parseText('Knödel\n100 g Mehl\n80 g Butter\n1 Ei\nKartoffeln quetschen und formen.\nWasser darf nicht mehr kochen!').ingredients,'100 g Mehl\n80 g Butter\n1 Ei');
const fractionImage={width:100,height:50,data:new Uint8ClampedArray(100*50*4)};for(let i=0;i<5000;i++)fractionImage.data.set([200,200,200,255],i*4);const black=(x,y)=>fractionImage.data.set([0,0,0,255],(y*100+x)*4),rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)black(xx,yy);};
for(let y=12;y<=40;y++){const x=Math.round(26-(y-12)*18/28);black(x,y);black(x+1,y);}rect(8,12,3,12);rect(8,12,6,3);rect(24,28,12,3);rect(33,28,3,6);for(let y=32;y<=39;y++){black(34-(y-32),y);black(35-(y-32),y);}rect(24,38,12,3);rect(50,12,21,3);rect(58,12,3,29);rect(78,12,3,29);rect(78,38,16,3);
const fractionParts=K.fractionGlyphParts(fractionImage);assert.ok(fractionParts);assert.ok(fractionParts.numerator.height<50);assert.ok(fractionParts.denominator.width<100);const savedFraction=Array.from(fractionImage.data);K.fractionGlyphParts(fractionImage);assert.deepEqual(Array.from(fractionImage.data),savedFraction);rect(1,12,3,29);assert.equal(K.fractionGlyphParts(fractionImage),null);assert.equal(K.fractionGlyphParts({width:100,height:50,data:new Uint8ClampedArray(20000).fill(255)}),null);
console.log('Unlabelled lists retain source quantities and instruction boundaries; fraction geometry isolates components and rejects mixed numbers without guessing digits.');

const twoWordTitle=textureRow('Omas Knödel',30),twoWordRegions=K.quantityRecipeRegions({lines:[twoWordTitle,...unlabelledRows.slice(1)]},500,600);assert.ok(twoWordRegions.title.x0<twoWordTitle.words[0].bbox.x0);assert.ok(twoWordRegions.title.x1>twoWordTitle.words[1].bbox.x1);

const columnWord=(text,x,y,w=70)=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+20}});
const columnRow=(words)=>({text:words.map(w=>w.text).join(' '),words,bbox:{x0:Math.min(...words.map(w=>w.bbox.x0)),y0:words[0].bbox.y0,x1:Math.max(...words.map(w=>w.bbox.x1)),y1:words[0].bbox.y1}});
const columnData={lines:[columnRow([columnWord('Gebäck',30,20,200)]),columnRow([columnWord('Zutaten:',30,90)]),...[130,170,210].map((y,i)=>columnRow([columnWord(['200g','100g','1/4'][i],30,y,40),columnWord(['Mehl','Honig','1 Milch'][i],80,y,80),columnWord(['10g','90g','Nüsse'][i],260,y,40),columnWord(['Gewürz','Zucker',''][i],310,y,70)])),columnRow([columnWord('Zubereitung:',30,270,140)]),columnRow([columnWord('Alles vermischen.',30,320,250)])]};
const columnRegions=K.ingredientColumnRegions(columnData,500,500);assert.deepEqual(Array.from(columnRegions.counts),[3,3]);assert.ok(columnRegions.columns[0].x1<columnRegions.columns[1].x0);
const crossed=JSON.parse(JSON.stringify(columnData));crossed.lines[3].words[1].bbox.x1=270;assert.equal(K.ingredientColumnRegions(crossed,500,500),null);
const noHeading=JSON.parse(JSON.stringify(columnData));noHeading.lines[1].text='Hinweise';assert.equal(K.ingredientColumnRegions(noHeading,500,500),null);
assert.equal(K.contextSuggestions('200 g weiche Butter','Die Oberfläche soll noch weich sein.').length,0);

{

const word=(text,x,y,w=Math.max(10,text.length*6))=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+18}}),row=ws=>({text:ws.map(w=>w.text).join(' '),words:ws,bbox:{x0:Math.min(...ws.map(w=>w.bbox.x0)),y0:ws[0].bbox.y0,x1:Math.max(...ws.map(w=>w.bbox.x1)),y1:ws[0].bbox.y1}}),textrow=(text,x,y)=>{const ws=[];for(const t of text.split(' ')){const w=word(t,x,y);ws.push(w);x=w.bbox.x1+4;}return row(ws);};
const texts=['200g Mehl','75g Zucker','1 Ei(er)','Yı Pck. Backpulver','125g Butter','1 Becher Quark, 500 g'];
const rows=[textrow('Testkuchen',30,240),textrow('Zutaten für 1 Portionen:',550,180),textrow('Für den Teig:',550,210),...texts.map((t,i)=>textrow(t,570,250+i*45)),textrow('Die Zutaten für den Teig',30,300),textrow('werden alle sehr gut vermischt.',30,340),textrow('Nun im heißen Ofen backen.',30,380),textrow('Arbeitszeit: ca. 30 Min.',30,520),textrow('Koch-/Backzeit: ca. 1 Std.',30,550),textrow('Verfasser: Test',550,650)];

const side=K.sideRecipeRegions({lines:rows},900,1000);assert.equal(side.ingredients.length,6);assert.equal(side.portions,'1');assert.ok(side.steps.y1<side.timings.y0);assert.ok(side.title.y1<side.steps.y0);
const closeHeader=rows.map(r=>r.text==='Testkuchen'?{...r,bbox:{...r.bbox,y0:278,y1:296},words:r.words.map(w=>({...w,bbox:{...w.bbox,y0:278,y1:296}}))}:r);assert.ok(K.sideRecipeRegions({lines:closeHeader},900,1000).steps.y0>296);
const noFooter=rows.filter(r=>!/^Verfasser/.test(r.text));assert.equal(K.sideRecipeRegions({lines:noFooter},900,1000),null);
const wrongSide=rows.map(r=>/^Zutaten/.test(r.text)?{...r,bbox:{...r.bbox,x0:10}}:r);assert.equal(K.sideRecipeRegions({lines:wrongSide},900,1000),null);
}

const commaList=K.parseText('Kuchen\nZutaten\n500 g Obst, 3 Eier,\n120 g Mehl, etwas Butter\n1,5 g Salz\nZubereitung\nAlles verrühren.\nTipp: Auch mit anderem Obst.');
assert.equal(commaList.ingredients,'500 g Obst\n3 Eier,\n120 g Mehl\netwas Butter\n1,5 g Salz');assert.ok(commaList.steps.includes('Tipp: Auch mit anderem Obst.'));
assert.equal(K.contextSuggestions('100 g Mandelstifte','Mit Mandelstiften bestreuen.').length,0);
{

const word=(text,x,y,w=Math.max(10,text.length*6))=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+18}}),row=ws=>({text:ws.map(w=>w.text).join(' '),words:ws,bbox:{x0:Math.min(...ws.map(w=>w.bbox.x0)),y0:Math.min(...ws.map(w=>w.bbox.y0)),x1:Math.max(...ws.map(w=>w.bbox.x1)),y1:Math.max(...ws.map(w=>w.bbox.y1))}}),textrow=(text,x,y)=>{const ws=[];for(const t of text.split(' ')){const w=word(t,x,y);ws.push(w);x=w.bbox.x1+4;}return row(ws);};
const rows=[textrow('Probe Kuchen',100,60),textrow('Zutaten:',100,120),textrow('200 g Mehl, 1 Ei',100,170),textrow('100 g Zucker, etwas Butter',100,215),textrow('3 EL Mandelstifte',100,260),...['Zeitung','Nachbar','Textteil'].map((t,i)=>textrow(t,0,180+i*45)),textrow('Zubereitung:',100,330),textrow('Alles gut verrühren und danach in die Form geben.',100,370),textrow('Den Kuchen im heißen Backofen auf mittlerer Schiene backen.',100,410),textrow('Tipp: Auch mit Obst.',100,470),textrow('(Autor/Archiv)',250,540)];

assert.equal(K.insetRecipeEvidence({lines:rows},500),true);assert.equal(K.insetRecipeEvidence({lines:rows.filter(r=>r.bbox.x0>0)},500),false);
const r=K.insetRecipeRegions({lines:rows},500,600);assert.ok(r);assert.ok(r.title.y1<r.ingredients.y0);assert.ok(r.ingredients.y1<r.steps.y0);assert.ok(r.steps.y1<540);assert.equal(K.insetRecipeRegions({lines:rows.filter(r=>!r.text.startsWith('Zubereitung'))},500,600),null);
const data=new Uint8ClampedArray(100*100*4).fill(255);for(let y=0;y<100;y++)for(let x=0;x<100;x++){const i=(y*100+x)*4,v=x>=45&&x<50&&y>20&&y<80?30:150+x*.4;data[i]=data[i+1]=data[i+2]=v;}const prepared=K.preparePrintedPaper({data,width:100,height:100});assert.ok(prepared);assert.equal(prepared.data[(50*100+47)*4],0);assert.equal(prepared.data[(50*100+10)*4],255);assert.equal(data[(50*100+10)*4],154);
}

const packageList=K.parseText('Creme\nZutaten\n1 Becher Quark, 500 g\n1 Becher Sahne, 200g\n1 Dose Bohnen, 400 g\nZubereitung\nAlles verrühren.');assert.equal(packageList.ingredients,'1 Becher Quark, 500 g\n1 Becher Sahne, 200g\n1 Dose Bohnen, 400 g');

// Container counts stay unresolved until an explicit per-container size is supplied.
const P=context.window.RESERVE_RECIPE_PARSER;
for(const raw of ['2 Becher Schmand','4 Dosen abgetropfte Mandarinen']){assert.equal(P.ingredient(raw).uncertain,true);assert.equal(P.packageSize(raw).size,null);}
for(const [raw,amount,unit,name] of [['2 Becher Schmand à 250 g',500,'g','Schmand'],['4 Dosen abgetropfte Mandarinen je 175 g',700,'g','abgetropfte Mandarinen'],['2 Becher Sahne stk. 0,2 l',400,'ml','Sahne']]){const p=P.ingredient(raw);assert.equal(p.amount,amount);assert.equal(p.unit,unit);assert.equal(p.name,name);assert.equal(p.raw,raw);assert.equal(p.uncertain,false);}
const mixedContainers=K.parseText('Kuchen\nZutaten\n200 g Mehl\nZubereitung\nPudding abkühlen lassen.\n2 Becher Schmand und 4 Dosen abgetropfte Mandarinen unterrühren.\n30 - 40 min. Bei 180 - 200° backen.');
assert.equal(mixedContainers.ingredients,'200 g Mehl\n2 Becher Schmand\n4 Dosen abgetropfte Mandarinen');assert.match(mixedContainers.steps,/2 Becher Schmand und 4 Dosen/);assert.match(mixedContainers.steps,/30 - 40 min/);assert.equal(mixedContainers.cookMinutes,null);

const duplicateContainers=K.parseText('Creme\nZutaten\n2 Becher Schmand\n4 Dosen Mandarinen\nZubereitung\n2 Becher Schmand und 4 Dosen Mandarinen unterrühren.');assert.equal(duplicateContainers.ingredients,'2 Becher Schmand\n4 Dosen Mandarinen');

assert.equal(P.packageSize('½ Päckchen Backpulver').count,0.5);assert.equal(P.ingredient('½ Päckchen Backpulver à 16 g').amount,8);

assert.equal(P.ingredient('1½ Becher Schmand à 250 g').amount,375);assert.equal(P.ingredient('1 1/2 Becher Schmand à 250 g').amount,375);

const faintFixture=JSON.parse(fs.readFileSync('tools/fixtures/rekek-faint-sheet-readings.json','utf8'));
const faintRegions=K.sectionedPaperRegions(faintFixture.passes[1],faintFixture.width,faintFixture.height);
assert.ok(faintRegions);assert.equal(faintRegions.rows.filter(r=>r.kind==='ingredient').length,13);assert.equal(faintRegions.rows.filter(r=>r.kind==='step').length,4);assert.equal(faintRegions.rows.find(r=>r.parts).parts.length,2);assert.ok(faintRegions.title.y1<200);
assert.equal(K.sectionedPaperRegions({lines:faintFixture.passes[1].lines.filter(l=>!/Füllung|Streu/.test(l.text))},864,1536),null);
assert.equal(P.ingredient('½ Päck. Backpulver').amount,0.5);assert.equal(P.ingredient('½ Päck. Backpulver').unit,'päckchen');
const wrappedContainers=K.parseText('Kuchen\nZutaten\n200 g Mehl\nZubereitung\n2 Becher Schmand und 4 Dosen\nabgetropfte Mandarinen unterrühren.');assert.equal(wrappedContainers.ingredients,'200 g Mehl\n2 Becher Schmand\n4 Dosen abgetropfte Mandarinen');assert.match(wrappedContainers.steps,/2 Becher Schmand und 4 Dosen abgetropfte Mandarinen unterrühren/);
assert.ok(K.contextSuggestions('4 Dosen abgetropifte Mandarinen','').some(x=>x.from==='abgetropifte'&&x.to==='abgetropfte'));
console.log('Faint paper: three-section layout gate, separate mixed-container crops, wrapped action ingredients, source package abbreviations and review-only spelling passed.');

const stackedFixture=JSON.parse(fs.readFileSync('tools/fixtures/rekek-stacked-sheet-readings.json','utf8')),stackedRegions=K.sectionedPaperRegions(stackedFixture.passes[1],stackedFixture.width,stackedFixture.height);
assert.ok(stackedRegions.stacked);assert.equal(stackedRegions.rows.filter(r=>r.kind==='ingredient').length,12);assert.ok(stackedRegions.rows.find(r=>/^kleinen Mengen/.test(r.source)).box.y0>1240);assert.ok(stackedRegions.rows.find(r=>/^2 Becher saure Sahne/.test(r.source)).box.x1<500);
const shortcrust=K.parseText('Kuchen\nMürbeteig:\n80 g Butter\n200 g Mehl\nAlles zu einem Mürbeteig verarbeiten.\nBelag:\n2 Becher Sahne\nAlles verrühren.');assert.equal(shortcrust.ingredients,'80 g Butter\n200 g Mehl\n2 Becher Sahne');assert.equal(shortcrust.ingredientSections[0].name,'Mürbeteig');
const wordRepairs=K.contextSuggestions('',"Eier schlagen und Jangsam Zucker einrieseln lassen. Die Mass@'auf den Teig gießen.");assert.ok(wordRepairs.some(s=>s.from==='Jangsam'&&s.to==='langsam'));assert.ok(wordRepairs.some(s=>s.from==="Mass@'"&&s.to==='Masse '));
console.log('Stacked sheets: two standalone sections, quantity alignment, watermark exclusion, robust slanted-line bounds and review-only word repairs passed.');

const parallelFixture=JSON.parse(fs.readFileSync('tools/fixtures/rekek-parallel-sheet-readings.json','utf8'));
const parallelLayout=K.parallelRecipeRegions(parallelFixture.passes[1],parallelFixture.width,parallelFixture.height);
assert.ok(parallelLayout?.parallel);assert.equal(parallelLayout.rows.filter(r=>r.kind==='ingredient').length,10);
assert.ok(parallelLayout.rows.filter(r=>r.kind==='ingredient').every(r=>!/(?:verkne|bestreichen|belegen|streuen)/i.test(r.source)));
assert.ok(parallelLayout.rows.some(r=>r.kind==='step'&&r.source.includes('Pudding')));
assert.ok(parallelLayout.rows.some(r=>r.kind==='step'&&r.source.includes('Zwetschgen')));
assert.equal(K.parallelRecipeRegions({lines:[]},1000,1000),null);
console.log('Parallel sheet layout: ten ingredient rows separated from adjacent instructions; unmeasured toppings remain source text.');

const framed=K.parseText('Rezepte Familienküche\nHauptgerichte\nGemüse mit Bohnen\nZutaten:\n400 g Gemüse, 1 rote\n\nPaprika,\n2 EL Öl, 1 Becher\n\nSchmand,\nZubereitung:\nAlles verrühren.\nGesendet von:\nTestname\nTestort');
assert.equal(framed.name,'Gemüse mit Bohnen');
assert.deepEqual(Array.from(framed.ingredients.split('\n')),['400 g Gemüse','1 rote Paprika,','2 EL Öl','1 Becher Schmand,']);
assert.equal(framed.steps,'Alles verrühren.');assert.ok(framed.ignored.includes('Testort'));
const mixedMeasures=K.parseText('Gemüsetopf\n2 Zwiebeln\n1 Eßlöffel Öl\nZwiebeln und Öl andünsten.\n300g Gemüse dazugeben und anbraten.\n1 Stange Lauch in Streifen schneiden\n1/4 Liter Brühe\n1/4 Liter saure Sahne zum Schluß zugeben,nicht mehr kochen.\nGuten Appetit!!!');
assert.ok(mixedMeasures.ingredients.includes('300g Gemüse\n1 Stange Lauch\n1/4 Liter Brühe\n1/4 Liter saure Sahne'));
assert.ok(!mixedMeasures.ingredients.includes('zum Schluß'));assert.ok(!mixedMeasures.ingredients.includes('andünsten'));
assert.ok(mixedMeasures.steps.includes('Zwiebeln und Öl andünsten.'));assert.ok(mixedMeasures.steps.includes('300g Gemüse dazugeben und anbraten.'));assert.ok(mixedMeasures.steps.includes('1 Stange Lauch in Streifen schneiden'));assert.ok(mixedMeasures.steps.includes('saure Sahne zum Schluß zugeben,nicht mehr kochen.'));assert.ok(!mixedMeasures.steps.includes('Guten Appetit'));
const nutritionFooter=K.parseText('Auflauf\nFür 4 Personen\nZutaten\n250 ml Milch\n3 Eier\nZubereitung\nAlles verrühren.\nBei 180 Grad 20 Minuten garen.\nEine Portion hat 350 kcal, 24,2 g Eiweiß und 10,6 g Kohlenhydrate.');
assert.equal(nutritionFooter.portions,'4');assert.equal(nutritionFooter.steps,'Alles verrühren.\nBei 180 Grad 20 Minuten garen.');
const unknownWrap=K.parseText('Gebäck\nZutaten\n1 Becher\nBelag:\n100 g Mehl\nAlles mischen.');assert.ok(!unknownWrap.ingredients.includes('1 Becher Belag'));
console.log('Printed-page structure: literal header exclusion, wrapped adjective/container quantities, old-spelling mixed actions, preserved preparation and author/nutrition footer separation passed.');

const umlautAction=K.parseText('Gemüsetopf\n1 Eßlöffel Öl\n1 Zwiebel\nZwiebel,Ol und Butter andiinsten.\n200 g Gemüse dazugeben.');assert.ok(!umlautAction.ingredients.includes('andiinsten'));assert.ok(umlautAction.steps.includes('Zwiebel,Ol und Butter andiinsten.'));assert.ok(!umlautAction.steps.includes('andünsten'));
console.log('OCR umlaut action variants classify source text without silently correcting words.');

// Repeated explicit units can resolve OCR g/9 glyph alternatives; true conflicts stay open.
assert.equal(K.reviewParallelQuantity(['125 g Zucker','1259 Zucker','125g Zucker'],'125 9 Zucker'),'125 g Zucker');
for(const [reads,source]of [[['1509 Zucker','1509 Zucker'],'1509 Zucker'],[['125 g Zucker','125 g Zucker','225 g Zucker'],'1259 Zucker'],[['125 g Zucker','125 g Zucker'],'2259 Zucker'],[['125 g Zucker','125 g Zucker','1259 g Zucker'],'1259 Zucker'],[['125 g Zucker','125 g Zucker','125 ml Zucker'],'1259 Zucker']])assert.equal(K.reviewParallelQuantity(reads,source),null);
assert.equal(K.reviewParallelParts(['1E','1E'],['Ei','Ei']),'1 Ei');
assert.equal(K.reviewParallelParts(['125g','125g'],['Zucker','Zucker']),'125g Zucker');
for(const args of [[['1E','2E'],['Ei','Ei']],[['1E','1E'],['Ei','El']],[['1509','1509'],['Zucker','Zucker']],[['1E','1E'],['Ei','Ei'],['4 EL Ei']],[['1P','1P'],['Vanillezucker','Vanillezucker']]])assert.equal(K.reviewParallelParts(...args),null);
assert.equal(K.parallelSteps(['Auf den Kuchen streuen','Auf den Kuchen streuen ©','Auf den Kuchen streuen a','Backen.']).join('|'),'Auf den Kuchen streuen|Backen.');
assert.equal(K.parallelSteps(['Rühren.','Garen.','Rühren.']).length,3);
const screenshotFixture=JSON.parse(fs.readFileSync('tools/fixtures/rekek-parallel-screenshot-readings.json','utf8')),screenshotLayout=K.parallelRecipeRegions(screenshotFixture.passes[1],screenshotFixture.width,screenshotFixture.height);
assert.equal(screenshotLayout.rows.filter(r=>r.kind==='ingredient').length,10);assert.equal(screenshotLayout.titleText,'Zwetschgenkuchen');assert.ok(screenshotLayout.rows.some(r=>r.source.includes('QELBEL')));
console.log('Parallel handwritten rows: missing/merged count line retained, close title fragments joined, measured g/9 evidence, name/quantity rereads and adjacent-only repeated instructions.');

const spelling=K.contextSuggestions('1 P Vanillezuccker','alles gut verkne- + auf Blech geben',['Vanillezucker']);assert.ok(spelling.some(x=>x.from==='Vanillezuccker'&&x.to==='Vanillezucker'));assert.ok(spelling.some(x=>x.from==='verkne-'&&x.to==='verkneten'));assert.equal(K.contextSuggestions('1 P Vanillezucker','Kneten.',['Vanillezucker']).length,0);
