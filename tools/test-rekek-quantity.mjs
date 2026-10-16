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
// g/9 collisions without a recognised unit must not become decimal/count hints.
for(const text of ['200,9 frischer Lachs','200.9 Mehl','2009 Zucker']){
 const result=C.decide([read('ctc-htr',text),read('tesseract-dhsd',text)]);
 assert.equal(result.suggestion,null,text);assert.equal(result.numberHint,null,text);
}
d=C.decide([read('ctc-htr','200.9 frischer Lachs'),read('tesseract-dhsd-trim','200 g frischer Lachs')]);
assert.equal(d.suggestion?.number,200);assert.equal(d.suggestion?.unit,'g');assert.equal(d.verified,false);
const evidence=[{reader:'ctc-htr',text:'200.9 frischer Lachs',fullLine:true},{reader:'tesseract-dhsd-trim',text:'200 g frischer Lachs',fullLine:true},{reader:'tesseract-dhsd-prefix',text:'200g',fullLine:false}];
assert.equal(C.reviewText(evidence,d),'200 g frischer Lachs');
assert.equal(C.reviewText([evidence[0],evidence[2]],d),'200 g frischer Lachs','A matching actual crop reading can supply the explicitly labelled review draft');
assert.equal(C.reviewText([evidence[0]],d),'200.9 frischer Lachs','Never turn 9 into g without actual crop evidence');
assert.equal(C.reviewText([evidence[0],{...evidence[2],text:'250g'}],d),'200.9 frischer Lachs','A different crop number must not justify repair');
const bbox=(x0,y0,x1,y1)=>({x0,y0,x1,y1});
const tall=[{text:'OO',bbox:bbox(140,270,275,365)},{text:'frischer',bbox:bbox(285,255,440,315)},{text:'Lachs',bbox:bbox(465,245,605,290)}];
const trims=C.trimmedPrefixes(tall);assert.equal(trims.length,9);assert.ok(trims.some(t=>t.fullLine&&t.bbox.x1>=605&&t.bbox.y1<365));
assert.equal(C.trimmedPrefixes(tall.slice(1)).length,0);
const w=120,h=100,rgba=new Uint8ClampedArray(w*h*4).fill(255);
for(let y=0;y<h;y++)for(let x=0;x<5;x++)rgba.set([0,0,0,255],(y*w+x)*4);
for(let y=30;y<60;y++)for(let x=30;x<95;x++)if(y%8<3)rgba.set([30,40,110,255],(y*w+x)*4);
const ink=C.inkMap(rgba,w,h);assert.equal(ink.blueMode,true);assert.equal(ink.coverage(bbox(0,0,5,100)),0);assert.ok(ink.coverage(bbox(30,30,95,60))>0);
const regions=C.lineRegions([{words:[{text:'edge',bbox:bbox(0,0,5,99)},{text:'quantity',bbox:bbox(30,30,95,60)}]}],w,h,ink);
assert.equal(regions.length,1);assert.equal(regions[0].words.length,1);assert.equal(regions[0].words[0].text,'quantity');
console.log('Crop regressions: seeded ink rejects page edges; descending first words receive sloped full-line refinements; g/9 collisions do not become numeric hints; review text uses an actual full-line reading.');
