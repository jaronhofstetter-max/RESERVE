import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {dates} from '../experiments/date-mobile-build/date-parser.js';
const sandbox={document:{getElementById:()=>null,addEventListener:()=>{},readyState:'complete'},setTimeout:()=>0,console};sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['date-token-guard-v1.js','expiry-camera-v1.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
const live=sandbox.RESERVE_EXPIRY_CAMERA;
const cases=[
 ['29/10/202108:58V07','2021-10-29'],
 ['2022. 11.1 4',''],
 ['2020.11:06 F2 iste','2020-11-06'],
 ['2022.01:04','2022-01-04'],
 ['29/10/202124:58',''],
 ['29/10/202108:99',''],
 ['2022.02:30',''],
 ['10:11:2022',''],
 ['2022.11.14 4','2022-11-14'],
 ['29/10/2021 08:58','2021-10-29'],
 ['😀 EXP 29/10/202108:58V07','2021-10-29'],
 ['2022.01:04:15',''],
 ['2022.11.1 4',''],
 ['2022.11.14','2022-11-14'],
];
for(const [text,want] of cases){
 assert.deepEqual(dates(text).map(c=>c.date),want?[want]:[],`experimental: ${text}`);
 assert.equal(live.parseDate(text),want,`live: ${text}`);
 for(const c of dates(text))assert.equal(c.printed,text.slice(c.start,c.end));
}
assert.equal(dates('2022.01')[0].precision,'month');
assert.equal(live.parseDate('MHD Ende 01.2022'),'2022-01-31');
assert.equal(live.parseDate('MHD 27/01/26'),'2026-01-27');
assert.deepEqual(dates('27/01/26'),[]);
console.log('Date token guards: four observed errors, clocks, split digits, invalid dates, Unicode offsets and preserved date formats OK. Constructed regression cases, not independent accuracy evidence.');
