import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dates,normalize} from '../experiments/date-mobile-build/date-parser.js';
import {resolveDateOrders} from '../experiments/date-mobile-build/date-order.js';
import {guardPrediction} from '../experiments/date-mobile-build/regions.js';
const R=createRequire(import.meta.url)('../experiments/date-mobile-build/date-roles.cjs');
const line=(text,y=0,confidence=.99,x=0,w=240)=>({text:normalize(text),bbox:[x,y,x+w,y+15],confidence,parsed_dates:dates(normalize(text))});
const raw=lines=>({id:'constructed',width:1000,height:1000,lines,seconds:0});
const numeric=(p,i)=>p.raw.lines[i].parsed_dates.map(c=>c.date);
const target='EXP 12.01.2021';
let input=raw([line('SELL BY 23.12.2020'),line(target,40)]),before=structuredClone(input),p=resolveDateOrders(input);
assert.deepEqual(input,before);assert.equal(p.resolved,1);assert.deepEqual(numeric(p,1),['2021-01-12']);assert.equal(p.raw.lines[1].parsed_dates[0].kind,'dmy');assert.ok(p.raw.lines[1].parsed_dates[0].order_evidence.length);
assert.equal(R.select(p.raw).strict_expiry.date,'2021-01-12');assert.equal(guardPrediction(R.select(p.raw),{complete:false}).strict_expiry,null);
assert.equal(R.select(p.raw).candidates.find(c=>c.date==='2020-12-23').role,'sell_by');
p=resolveDateOrders(raw([line('MFG 12/23/2020'),line('EXP 01/02/2021',40)]));assert.deepEqual(numeric(p,1),['2021-01-02']);assert.equal(R.select(p.raw).strict_expiry.date,'2021-01-02');assert.equal(R.select(p.raw).candidates.find(c=>c.date==='2020-12-23').role,'manufactured');
const noResolve=[
 [line(target)],
 [line('EXP 09.10.2021'),line(target,40)], // two ambiguous dates do not establish a format
 [line('23.12.2020',0,.89),line(target,40)],
 [line('23.12.2020'),line(target,40,.89)],
 [line('23.12.2020'),line(target,300)],
 [line('23.12.2020',0,.99,0),line(target,40,.99,700)],
 [line('23/12/2020'),line(target,40)],
 [line('2020-12-23'),line(target,40)], // ISO format says nothing about another numeric format
 [line('23.12.2020'),line(target,40),line('12.23.2020',80)], // contradictory local evidence
 [line('LOT 23.12.2020'),line(target,40)],
 [line('X23.12.2020'),line(target,40)],
 [line('23.12.2020X'),line(target,40)],
 [line('31.02.2020'),line(target,40)],
 [line('12.12.2020'),line(target,40)], // equal day and month do not establish order
 [line('23.12.2020'),line(target,40,NaN)],
];
for(const ls of noResolve){const r=resolveDateOrders(raw(ls));assert.equal(r.resolved,0,ls.map(l=>l.text).join(' | '));}
assert.deepEqual(dates('12/23/2020').map(c=>c.date),['2020-12-23']);assert.deepEqual(dates('31/02/2020'),[]);assert.deepEqual(dates('02/29/2024').map(c=>c.date),['2024-02-29']);assert.deepEqual(dates('02/29/2023'),[]);
assert.equal(dates('12.01.2021').length,2);assert.equal(dates('01.01.2021').length,1);assert.equal(dates('07.2017')[0].precision,'month');assert.deepEqual(dates('29.08.23'),[]);
// A pair of unknown-role dates can resolve its format without becoming an MHD.
p=resolveDateOrders(raw([line('23.12.2020'),line('12.01.2021',40)]));assert.equal(p.resolved,1);assert.equal(R.select(p.raw).suggestion,null);assert.equal(R.select(p.raw).strict_expiry,null);
p=resolveDateOrders(raw([line('EXP 23.12.2020'),line('EXP 12.01.2021',40)]));assert.equal(p.resolved,1);assert.equal(R.select(p.raw).strict_expiry,null);assert.equal(R.select(p.raw).suggestion,null);
// Geometry invariance and standalone ambiguity are preserved.
const moved=raw(before.lines.map(l=>({...l,bbox:l.bbox.map(v=>v*2+500)})));assert.deepEqual(numeric(resolveDateOrders(moved),1),['2021-01-12']);
console.log('✓ Local DMY/MDY evidence, mixed separators/conflicts, weak/distant/batch/invalid evidence, calendar validity, immutable input and independent date-role/partial-read protection. Constructed cases, not accuracy evidence.');
