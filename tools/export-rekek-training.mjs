import fs from 'node:fs';import {validate} from './check-recipe-training.mjs';
try{
 const paths=process.argv.slice(2);if(!paths.length)throw Error('JSON-Dateien angeben; JSONL wird auf stdout ausgegeben.');
 const records=paths.flatMap(p=>{const r=JSON.parse(fs.readFileSync(p,'utf8'));return Array.isArray(r)?r:[r];});
 const errors=validate(records);if(errors.length)throw Error(errors.join('\n'));
 for(const r of records.filter(r=>r.split==='train'))console.log(JSON.stringify({id:r.id,recipeGroup:r.recipeGroup,input:r.pages.map(p=>({image:p.image||null,ocr:p.ocr||null})),target:r.expected,source:r.source}));
 // Validation/test records are intentionally never emitted as training data.
}catch(e){console.error(e.message);process.exitCode=1;}
