import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fields,agree,confirmChoice} from './fields.js';
import {dateKind,typedOffer,confirmTypedChoice,collectTypedOffers} from './date-kind.js';
const rows=[];
function test(name,fn){try{fn();rows.push({name,passed:true});}catch(e){rows.push({name,passed:false,error:e.message});}}
const high=text=>({text,confidence:.99}),role={role:'expiry'};
for(let month=1;month<=12;month++)for(const year of [2020,2026,2031])test(`month-${year}-${month}`,()=>{
 const text=`MHD ${String(month).padStart(2,'0')}.${year}`,expected=`${year}-${String(month).padStart(2,'0')}`;
 const a=high(text),b=high(text),old=agree(a,b,role),next=typedOffer(a,b,role);
 assert.deepEqual(next.choices,old.choices);
 for(const result of [confirmChoice(old,0,{expiryConfirmed:true}),confirmTypedChoice(next,0,{expiryConfirmed:true,dateKind:'best_before'})]){
  assert.equal(result.date,expected);assert.equal(result.precision,'month');assert.ok(!('day'in result));
 }
});
for(const [text,kind] of [
 ['MHD 03.2031','best_before'],['BBE 03.2031','best_before'],['Best before 03.2031','best_before'],['B.B. 03.2031','best_before'],['Mindestens haltbar bis 03.2031','best_before'],
 ['Zu verbrauchen bis 31.12.2031','use_by'],['Use by 31.12.2031','use_by'],['À consommer de préférence avant 03.2031','best_before'],['À consommer jusqu’au 31.12.2031','use_by'],['Da consumarsi preferibilmente entro 03.2031','best_before'],['Da consumarsi entro 31.12.2031','use_by'],
 ['MFG 31.12.2031','production'],['Prod. 31.12.2031','production'],['Hergestellt 31.12.2031','production'],['Packed 31.12.2031','packed'],['Sell by 31.12.2031','sell_by'],['LOT 31122031','batch'],['L31.12.2031','batch'],['Charge 31122031','batch'],['EXP 03.2031','unknown'],['03.2031','unknown'],
 ['MHD 03.2031 / Use by 31.12.2031','ambiguous'],['Prod. 31.12.2030 / MHD 03.2031','ambiguous']
])test(`kind-${text}`,()=>assert.equal(dateKind(text),kind));
for(const text of ['13.2031','00.2031','00.03.2031','31.02.2031','L28/02/27','122031','18:10','07.07.20 /2'])test(`reject-${text}`,()=>assert.equal(fields(text).dates.length,0));
for(const [a,b] of [['MHD 03.2031','Use by 03.2031'],['MFG 03.2031','MHD 03.2031'],['Packed 03.2031','MHD 03.2031'],['LOT 03.2031','MHD 03.2031']])test(`conflict-${a}`,()=>assert.equal(typedOffer(high(a),high(b),role).choices.length,0));
test('explicit-kind-required',()=>{const o=typedOffer(high('03.2031'),high('03.2031'),{role:'unknown'});assert.throws(()=>confirmTypedChoice(o,0,{expiryConfirmed:true}));assert.equal(confirmTypedChoice(o,0,{expiryConfirmed:true,dateKind:'best_before'}).dateKind,'best_before');});
test('no-silent-kind-change',()=>{const o=typedOffer(high('Use by 31.12.2031'),high('Use by 31.12.2031'),role);assert.throws(()=>confirmTypedChoice(o,0,{expiryConfirmed:true,dateKind:'best_before'}));assert.equal(confirmTypedChoice(o,0,{expiryConfirmed:true,dateKind:'use_by'}).dateKind,'use_by');});
test('confidence-gates-kept',()=>assert.equal(typedOffer({text:'MHD 03.2031',confidence:.79},high('MHD 03.2031'),role).choices.length,0));
test('no-automatic-acceptance',()=>{const o=typedOffer(high('MHD 03.2031'),high('MHD 03.2031'),role);assert.equal(o.automaticExpiryAllowed,false);assert.throws(()=>confirmTypedChoice(o,0,{dateKind:'best_before'}));});
test('missing-year-not-filled',()=>{const o=typedOffer(high('MHD 21.11'),high('MHD 21.11'),role);assert.throws(()=>confirmTypedChoice(o,0,{expiryConfirmed:true,dateKind:'best_before'}));});
test('reader-disagreement-kept',()=>assert.equal(typedOffer(high('MHD 03.2031'),high('MHD 04.2031'),role).choices.length,0));
test('multiple-dates-kept-blocked',()=>assert.equal(typedOffer(high('MHD 31.12.2031 / 01.01.2032'),high('MHD 31.12.2031 / 01.01.2032'),role).choices.length,0));
test('nearest-context-preserved',()=>{const o=typedOffer(high('03.2031'),high('03.2031'),{role:'expiry',evidence:[{text:'MHD',distance:0},{text:'Use by',distance:2}]});assert.equal(o.dateKind,'best_before');assert.equal(o.choices.length,1);});
test('near-context-conflict-blocked',()=>assert.equal(typedOffer(high('03.2031'),high('03.2031'),{role:'expiry',evidence:[{text:'MHD',distance:0},{text:'Use by',distance:.1}]}).choices.length,0));
test('reader-context-conflict-blocked',()=>assert.equal(typedOffer(high('Use by 03.2031'),high('Use by 03.2031'),{role:'expiry',evidence:[{text:'MHD',distance:0}]}).choices.length,0));
test('dedup-preserves-role-conflict',()=>{const a=typedOffer(high('MHD 03.2031'),high('MHD 03.2031'),role),b=typedOffer(high('Use by 03.2031'),high('Use by 03.2031'),role);assert.deepEqual(collectTypedOffers([{decision:a},{decision:b}]),[]);});
test('dedup-keeps-unknown-review',()=>{const a=typedOffer(high('MHD 03.2031'),high('MHD 03.2031'),role),b=typedOffer(high('03.2031'),high('03.2031'),{role:'unknown'});assert.equal(collectTypedOffers([{decision:a},{decision:b}])[0].dateKind,'unknown');});
const result={syntheticOnly:true,ocrExecuted:false,trainingPerformed:false,productionChanged:false,baselineCommit:'f2639239dc986c4a315e4df481566733598f4ba9',tests:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,rows};
if(process.env.RESERVE_SEMANTICS_RESULTS)fs.writeFileSync(process.env.RESERVE_SEMANTICS_RESULTS,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:rows.filter(r=>!r.passed)},null,2));if(result.failed)process.exitCode=1;
