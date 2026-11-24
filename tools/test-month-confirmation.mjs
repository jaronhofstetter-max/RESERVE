import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox={document:{getElementById:()=>null},setTimeout:()=>0};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['date-token-guard-v1.js','date-format-v1.js','date-policy-v1.js','expiry-camera-v1.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
const api=sandbox.RESERVE_EXPIRY_CAMERA;
const failure=api.selectConsensus(['1A she a URE GEE SEAR 1\nERR. 03 .2027\n08091 D-10','17 ea UI EG A Se 1\nBRE .03.2027\n18081 D-10']);
assert.equal(failure.kind,'month');assert.equal(failure.date.slice(0,7),'2027-03');
const yearFailure=api.selectConsensus(['ow 12.2015','96.2015\n12.2015 -']);
assert.equal(yearFailure.date.slice(0,7),'2015-12');
// Identical effective dates with different printed precision are separate votes.
const conflict=api.selectConsensus(['MHD 31.03.2027','MHD 03.2027']);
assert.equal(conflict.votes,1);assert.equal(conflict.precisionConflict,true);
assert.equal(api.selectConsensus(['MHD 12.2027','MHD 12.2027']).precisionConflict,false);
assert.equal(api.selectConsensus(['MHD 14.09.2027','MHD 14.09.2027']).date,'2027-09-14');
console.log('Recorded OCR failures and separate precision votes: OK');
