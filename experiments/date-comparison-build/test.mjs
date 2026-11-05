import assert from 'node:assert/strict';
import {choose} from './choice.js';
import {dates} from '../date-mobile-build/date-parser.js';
import Formats from '../../date-format-v1.js';
const a={suggestion:{date:'2027-12-31'},candidates:[{date:'2027-12-31'}]},b={suggestion:{date:'2028-01-31'},candidates:[{date:'2028-01-31'}]};
assert.equal(choose(a,b).prediction,a);assert.equal(choose(a,b).usedFallback,false);
const ambiguous={suggestion:null,candidates:[{},{}]};assert.equal(choose(ambiguous,b).prediction,ambiguous);
const empty={suggestion:null,candidates:[]};assert.equal(choose(empty,b).prediction,b);assert.equal(choose(empty,null).prediction,empty);
console.log('Hybrid guard: preserve existing/ambiguous candidate lists; fallback only for zero candidates.');

assert.deepEqual(dates('M6P11 112028'),[]);
assert.deepEqual(dates('24.10.26'),[]);
const token=Formats.shortYears('24.10.26')[0];assert.equal(token.date,undefined);assert.equal(Formats.confirmYear(token,'2026')[0].date,'2026-10-24');
console.log('Compact-code hallucinations and short years remain unselected until explicit confirmation.');
