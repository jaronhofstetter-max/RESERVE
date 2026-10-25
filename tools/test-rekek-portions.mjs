import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};
vm.runInNewContext(fs.readFileSync('personal-recipe-parser-v1.js','utf8'),context);
const parse=servings=>context.window.RESERVE_REKEK.parseText(`Gemüsepfanne\n${servings}\nZutaten\n125 g Gemüse\n½ Päckchen Backpulver\nZubereitung\nAlles vermengen.`);
for(const servings of ['Für 2 Portionen\nFür 4 Portionen','Für 4 Portionen\nFür 2 Portionen','Für 2 Portionen\nFür 4 Portionen\nFür 2 Portionen','Für 2 Portionen / für 4 Portionen']){
 const r=parse(servings);assert.equal(r.portions,'');
 const conflict=r.unresolved.find(x=>x.type==='portion-conflict');assert.ok(conflict);
 assert.ok(conflict.raw.includes('2 Portionen'));assert.ok(conflict.raw.includes('4 Portionen'));
 assert.equal(r.ingredients,'125 g Gemüse\n½ Päckchen Backpulver');assert.equal(r.steps,'Alles vermengen.');
}
for(const servings of ['Für 0 Portionen','Für 200 Portionen','Für 200 Portionen\nFür 2 Portionen','Für 2 Portionen\nFür 0 Portionen','Für 2,5 Portionen','Portionen: 2.5']){
 const r=parse(servings);assert.equal(r.portions,'');assert.ok(r.unresolved.some(x=>x.type==='portion-invalid'));
}
for(const [source,expected]of [['Für 2 Portionen\n2 Portionen','2'],['Für 2–3 Portionen\n2 Portionen','2'],['Für 3–2 Personen','2'],['Portionen: 1','1'],['Für 100 Portionen','100'],['','']])assert.equal(parse(source).portions,expected,source);
const recipes=context.window.RESERVE_REKEK.parseCandidates('Gemüsepfanne\nFür 2 Portionen\nZutaten\n125 g Gemüse\nZubereitung\nGaren.\n\nSuppe\nFür 4 Portionen\nZutaten\n500 ml Wasser\nZubereitung\nKochen.');
assert.equal(recipes.candidates.length,2);assert.equal(recipes.candidates[0].portions,'2');assert.equal(recipes.candidates[1].portions,'4');
console.log('Serving conflicts stay blank, invalid counts remain reviewable, lower range rule and separate recipes passed. Text regressions, not OCR accuracy.');
