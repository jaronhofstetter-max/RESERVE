import assert from 'node:assert/strict';import{fields,agree,rankLines,confirmChoice,rowRegions}from'./fields.js';
const high=text=>({text,confidence:.99}),expiry={role:'expiry'};
assert.equal(fields('MHD: 31.12.2028').dates[0].options[0].date,'2028-12-31');
assert.deepEqual(fields('04.2028').dates[0].options,[{precision:'month',month:4,year:2028,date:'2028-04'}]);
for(const text of ['P20200112','122023','L28/02/27','L16 01 2028','18:10','CH-2001','04.01:2027','24/0/2026'])assert.deepEqual(fields(text).dates,[],text);
const y=agree(high('21.11 L20991234'),high('21.11'),expiry);assert.equal(y.needsYear,true);assert.throws(()=>confirmChoice(y,0,{expiryConfirmed:true}));assert.equal(confirmChoice(y,0,{year:2028,expiryConfirmed:true}).date,'2028-11-21');
const short=agree(high('06.11.28'),high('06.11.28'),expiry);assert.equal(short.needsFormat,true);assert.throws(()=>confirmChoice(short,0,{year:2027,expiryConfirmed:true}));
const compact=agree(high('16012028'),high('16 01 2028'),expiry);assert.equal(compact.needsStructureReview,true);assert.throws(()=>confirmChoice(compact,0,{expiryConfirmed:true}));assert.equal(confirmChoice(compact,0,{expiryConfirmed:true,structureConfirmed:true}).date,'2028-01-16');assert.deepEqual(agree(high('16012028'),high('16012028'),expiry).choices,[]);
const old=agree(high('15.12.2003-1'),high('15.12.2003-1'),expiry);assert.throws(()=>confirmChoice(old,0,{expiryConfirmed:true}));assert.equal(confirmChoice(old,0,{expiryConfirmed:true,suffixConfirmed:true}).date,'2003-12-15');
const l=(text,y)=>({text,confidence:.99,box:[[0,y],[300,y],[300,y+30],[0,y+30]]});const candidates=rankLines([l('Prod. 16 01 2025',0),l('B.B. 16 01 2028',70),l('CHF 6.10',140)]);assert.equal(candidates.length,1);assert.equal(candidates[0].line,1);assert.equal(candidates[0].role.role,'expiry');
assert.deepEqual(agree({text:'31.12.2028',confidence:NaN},high('31.12.2028'),expiry).choices,[]);console.log('Browser date-field grammar, role, precision and confirmation checks passed.');


// Synthetic regressions for complete date followed by numeric codes.
for(const value of ['31.12.2029 / 6789 / 012345','31.12.2029/6789/012345','MHD: 31.12.2029 / 6789']){
 const f=fields(value);assert.equal(f.dates.length,1,value);assert.equal(f.dates[0].printed,'31.12.2029');assert.equal(f.dates[0].options[0].date,'2029-12-31');assert.equal(f.codes.at(-1).kind,'adjacent_numeric_codes');const d=agree(high(value),high(value),expiry);assert.equal(d.needsSuffixReview,true);assert.throws(()=>confirmChoice(d,0,{expiryConfirmed:true}));assert.equal(confirmChoice(d,0,{expiryConfirmed:true,suffixConfirmed:true}).date,'2029-12-31');
}
assert.equal(fields('04.2029 / 6789').dates[0].options[0].precision,'month');
for(const value of ['31.12.29 / 6789','31122029 / 6789','31.12.2029.04','L31.12.2029 / 6789','07.07.20 /2'])assert.deepEqual(fields(value).dates,[],value);
console.log('Adjacent-code boundaries preserve the date and mandatory review; ambiguous/malformed controls remain blocked.');

const multiple=high('31.12.2029 / 01.01.2030');assert.equal(fields(multiple.text).dates.length,2);assert.deepEqual(agree(multiple,multiple,expiry).choices,[]);
const timed=fields('31.12.2029 / 19:02');assert.equal(timed.dates.length,1);assert.equal(timed.times.length,1);assert.ok(!timed.codes.some(c=>c.kind==='adjacent_numeric_codes'));

for(const text of ['31.12.2029 / 08/2030','04.2029 / 12/2030','31.12.2029 / 26/08/2030']){
 assert.ok(!fields(text).codes.some(c=>c.kind==='adjacent_numeric_codes'),text);const r=high(text);assert.deepEqual(agree(r,r,expiry).choices,[],text);
}

// v3.2 recovery regressions: synthetic dates differ from private development photos.
{
const high=text=>({text,confidence:.99}),expiry={role:'expiry'},box=(text,x,y,w,h=30)=>({text,confidence:.99,box:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]});
const lines=[box('Prod. 19 03',0,0,200),box('2031',210,0,80),box('B.B.',0,60,80),box('19 03',100,60,100),box('2034',210,60,80)];
const regions=rowRegions(lines);const candidates=rankLines([...lines,...regions]);assert.ok(candidates.some(c=>c.proposalFields.dates.some(d=>d.options.some(o=>o.date==='2034-03-19'))&&c.role.role==='expiry'));
assert.ok(!candidates.some(c=>c.proposalFields.dates.some(d=>d.options.some(o=>o.date==='2031-03-19'))));
for(const label of ['B.B.','MHD:','EXP']){const d=agree(high(label+'19032034'),high(label+' 19 03 2034'),expiry);assert.equal(d.choices[0].date,'2034-03-19');assert.equal(d.needsStructureReview,true);assert.throws(()=>confirmChoice(d,0,{expiryConfirmed:true}));assert.equal(confirmChoice(d,0,{expiryConfirmed:true,structureConfirmed:true}).date,'2034-03-19');}
for(const [a,b] of [['Prod.19032034','MHD 19 03 2034'],['B.B.19032031','B.B. 19 03 2034'],['B.B.19032034 0900','B.B. 19 03 2034'],['19032034','19032034'],['L19032034','B.B. 19 03 2034']])assert.deepEqual(agree(high(a),high(b),expiry).choices,[],a);
assert.deepEqual(agree(high('Prod.19032034'),high('Prod. 19 03 2034'),{role:'non_expiry'}).choices,[]);
assert.equal(rowRegions([box('19 03',0,0,100),box('2034',120,100,80)]).length,0,'Separate rows must not supply a year');
assert.equal(rowRegions([box('19 03',0,0,100),box('2034',400,0,80)]).length,0,'Distant text must not supply a year');
assert.deepEqual(agree({text:'07.2034',confidence:.79},high('07.2034'),expiry).choices,[],'Confidence gate unchanged');
assert.equal(agree(high('19032034'),high('B.B. 19 03 2034'),{role:'unknown'}).needsRole,true,'Unproven role still needs confirmation');
console.log('Split-row dates, labelled structure confirmation, production exclusions and low-confidence guards passed.');

}
