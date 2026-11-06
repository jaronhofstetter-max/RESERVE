import assert from 'node:assert/strict';import{fields,agree,rankLines,confirmChoice}from'./fields.js';
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
