import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context={};vm.runInNewContext(fs.readFileSync('rekek-quantity-core-v1.js','utf8'),context);const C=context.RESERVE_QUANTITY_CORE,read=(reader,text)=>({reader,text});
for(const [text,number,unit]of [['½ Päckchen Backpulver',.5,'Päckchen'],['1½ l Milch',1.5,'l'],['200g Mehl',200,'g'],['200. ml Sahne',200,'ml'],['2 Eier',2,'Ei'],['4 Dosen abgetropfte Mandarinen',4,'Dose']]){const q=C.parse(text);assert.equal(q?.number,number,text);assert.equal(q?.unit,unit,text);}
for(const text of ['.5 g Zucker','2–3 Eier','1/0 l Milch','1.000 g Mehl','2009 Mehl','200 mt Sahne','2 Knoblauehzehen'])assert.equal(C.parse(text),null,text);
let d=C.decide([read('tesseract-dhsd','125 g Zucker'),read('tesseract-layout','125 g Zucker'),read('tesseract-prefix','125 g Zucker')]);assert.equal(d.suggestion.support,1);assert.equal(d.confidence,'single-family');assert.equal(d.verified,false);assert.equal(d.autoCorrections,0);
d=C.decide([read('ctc-htr','125 g Zucker'),read('trocr-int8','125 g Zucker'),read('tesseract-dhsd','12.5 g Zucker')]);assert.equal(d.suggestion.number,125);assert.equal(d.conflict,true);
d=C.decide([read('ctc-htr','200 ml Sahne'),read('trocr-int8','200 g Sahne')]);assert.equal(d.suggestion,null);assert.equal(d.numberHint.number,200);assert.equal(d.numberHint.unit,null);
d=C.decide([read('ctc-htr','2 Knoblauehzehen'),read('trocr-int8','2 unoblauchzehen')]);assert.equal(d.suggestion,null);assert.equal(d.numberHint.number,2);
d=C.decide([read('ctc-htr','2009'),read('trocr-int8','2009'),read('tesseract-dhsd','200 g')]);assert.equal(d.suggestion,null);assert.equal(d.numberHint.number,2009);
d=C.decide([read('ctc-htr','Nudeln'),read('trocr-int8','kleine Dose Tomaten')]);assert.equal(d.suggestion,null);assert.equal(d.numberHint,null);
assert.equal(C.ctc(new Float32Array([1,0,0,0,3,0,0,4,0,4,0,0,0,0,4]),5,3,'ab'),'ab');
console.log('Quantity experiment: fractions, source container counts, family grouping, contradictory amounts, missing units, false numeric dominance, no invented amounts and CTC blank collapse passed. No photo accuracy claim.');
