import assert from 'node:assert/strict';
import {labelDistance} from './label-distance.js';
import {roleFor,rankLines,rowRegions} from './fields.js';
const box=(x,y,w,h=20)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const line=(text,b)=>({text,box:b,confidence:.99});
const rotate=(b,angle)=>{const a=angle*Math.PI/180;return b.map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);};
let checks=0;
for(const angle of [-25,-12,0,12,25])for(const swapped of [false,true]){
 // An unrelated longer label ends closer in X but occupies a different row.
 const labels=swapped?['MHD','Sell by']:['Sell by','MHD'];
 const lines=[line(labels[0],rotate(box(0,0,100),angle)),line(labels[1],rotate(box(0,32,235),angle)),line('08.2033',rotate(box(250,0,100),angle)),line('11.2033',rotate(box(250,32,100),angle))];
 // Match the existing maximum neighbourhood by using a sufficiently wide date region.
 for(const l of lines.slice(2))l.box=rotate(box(180,l===lines[2]?0:32,170),angle);
 assert.equal(roleFor(2,lines).role,swapped?'expiry':'non_expiry');
 assert.equal(roleFor(3,lines).role,swapped?'non_expiry':'expiry');
 const candidates=rankLines(lines);assert.equal(candidates.some(c=>c.line===(swapped?3:2)),false);checks+=3;
}
const conflict=[line('MHD',box(0,0,100)),line('Sell by',box(0,0,100)),line('08.2033',box(120,0,100))];assert.equal(roleFor(2,conflict).role,'ambiguous');checks++;
for(const label of ['Prod.','Sell by','verkaufen bis','vendre jusqu','vendere entro']){const lines=[line(label,box(0,0,100)),line('MHD',box(0,50,180)),line('08.2033',box(120,0,100))];assert.equal(roleFor(2,lines).role,'non_expiry');checks++;}
assert.equal(labelDistance(box(0,0,100),box(1000,0,100)),null);checks++;
for(const b of [null,[],[[0,0]],[[0,0],[NaN,0],[0,0],[0,0]],box(0,0,0,0)]){assert.equal(labelDistance(box(0,0,100),b),null);checks++;}
// Nearby rows overlap in page Y after rotation, but never share a printed baseline.
for(const angle of [-25,-12,0,12,25]){
 const lines=[line('Sell by',rotate(box(0,0,100,24),angle)),line('07.2034',rotate(box(140,0,150,30),angle)),line('Best before end',rotate(box(0,50,235,24),angle)),line('11.2034',rotate(box(275,50,150,30),angle))];
 const joined=rowRegions(lines);
 assert.ok(joined.some(l=>l.text==='Sell by 07.2034'));
 assert.ok(joined.some(l=>l.text==='Best before end 11.2034'));
 assert.ok(!joined.some(l=>l.text.includes('Best before')&&l.text.includes('07.2034')));checks+=3;
}
console.log(JSON.stringify({labelGeometryChecks:checks,syntheticOnly:true,privatePhotos:false}));
