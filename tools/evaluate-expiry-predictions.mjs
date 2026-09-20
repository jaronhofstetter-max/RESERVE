#!/usr/bin/env node
/* Evaluate model predictions without allowing a weak model to replace production OCR. */
import fs from 'node:fs';
const [manifest,predictions]=process.argv.slice(2);
if(!manifest||!predictions)throw Error('Usage: node tools/evaluate-expiry-predictions.mjs <validation.jsonl> <predictions.jsonl>');
const lines=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse),truth=lines(manifest),pred=lines(predictions),byId=new Map(pred.map(x=>[x.id,x]));
let exact=0,covered=0;const errors=[];
for(const row of truth){const p=byId.get(row.id);if(!p)continue;covered++;if(p.predicted===row.target)exact++;else errors.push({id:row.id,target:row.target,predicted:p.predicted||''})}
const result={examples:truth.length,covered,exact,accuracy:covered?exact/covered:0,errors:errors.slice(0,25),productionEligible:truth.length>=200&&covered===truth.length&&exact/covered>=.97};
console.log(JSON.stringify(result,null,2));
if(!result.productionEligible)process.exitCode=2;
