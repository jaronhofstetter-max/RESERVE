import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {evaluate,parseOCR,quantity,validateRecipes} from './rekek-page-evaluation.mjs';
import {main} from './run-rekek-page-evaluation.mjs';
const ingredient=(quantity,unit,name)=>({quantity,unit,name});
const recipe={title:'Gemüsepfanne',portions:'2',ingredients:[ingredient('125','g','Gemüse'),ingredient('½','Päckchen','Backpulver')],steps:['Alles vermengen.','Bei 180 Grad garen.']};
const clone=x=>JSON.parse(JSON.stringify(x));
assert.equal(evaluate([recipe],[recipe]).exact,true);
let altered=clone(recipe);altered.ingredients[0].quantity='12.5';let r=evaluate([recipe],[altered]);assert.equal(r.counts.wrong_quantity,1);assert.equal(r.correctIngredients,1);
altered=clone(recipe);altered.ingredients[0].unit='ml';assert.equal(evaluate([recipe],[altered]).counts.wrong_unit,1);
altered=clone(recipe);altered.ingredients.pop();assert.equal(evaluate([recipe],[altered]).counts.missing_ingredient,1);
altered=clone(recipe);altered.ingredients.push(ingredient('1','g','Salz'));assert.equal(evaluate([recipe],[altered]).counts.extra_ingredient,1);
altered=clone(recipe);altered.ingredients[1].quantity='112';assert.equal(evaluate([recipe],[altered]).counts.wrong_quantity,1);
altered=clone(recipe);altered.ingredients[1].quantity='0,5';assert.equal(evaluate([recipe],[altered]).exact,true);
altered=clone(recipe);altered.ingredients[0]=ingredient('0.125','kg','Gemüse');assert.equal(evaluate([recipe],[altered]).exact,true);
altered=clone(recipe);altered.ingredients[0].quantity=null;assert.equal(evaluate([recipe],[altered]).counts.wrong_quantity,1);
altered=clone(recipe);altered.portions='4';assert.equal(evaluate([recipe],[altered]).counts.wrong_portions,1);
altered=clone(recipe);altered.portions='2–3';assert.equal(evaluate([recipe],[altered]).exact,true);
altered=clone(recipe);altered.steps[1]='Bei 160 Grad garen.';assert.equal(evaluate([recipe],[altered]).counts.steps_differ,1);
altered=clone(recipe);altered.steps.reverse();assert.equal(evaluate([recipe],[altered]).counts.steps_differ,1);
altered=clone(recipe);altered.ingredients[0].name='Mehl';r=evaluate([recipe],[altered]);assert.equal(r.counts.missing_ingredient,1);assert.equal(r.counts.extra_ingredient,1);
const repeated={...recipe,ingredients:[ingredient('100','g','Mehl'),ingredient('200','g','Mehl')]};
assert.equal(evaluate([repeated],[{...repeated,ingredients:repeated.ingredients.slice().reverse()}]).exact,true);
r=evaluate([repeated],[{...repeated,ingredients:[ingredient('200','g','Mehl')]}]);assert.equal(r.correctIngredients,1);assert.equal(r.counts.missing_ingredient,1);
const swapped={...recipe,ingredients:[ingredient('½','g','Gemüse'),ingredient('125','Päckchen','Backpulver')]};assert.equal(evaluate([recipe],[swapped]).counts.wrong_quantity,2);
assert.equal(evaluate([recipe],[]).counts.missing_recipe,1);
assert.equal(evaluate([], [recipe]).counts.extra_recipe,1);
assert.equal(evaluate([recipe],[recipe]).correctionBurdenMeasured,false);
assert.throws(()=>validateRecipes([{...recipe,portions:2}]));assert.throws(()=>validateRecipes([{...recipe,steps:'Garen.'}]));
assert.equal(quantity('1 ½'),1.5);assert.equal(quantity('1/0'),null);assert.equal(quantity('12.5 g'),null);assert.equal(quantity('2–3'),null);
const parsed=parseOCR('Gemüsepfanne\nFür 2 Portionen\nZutaten\n125 g Gemüse\n½ Päckchen Backpulver\nZubereitung\nAlles vermengen.\nBei 180 Grad garen.');
assert.equal(evaluate([recipe],parsed).exact,true);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rekek-page-evaluation-'));
try{
 const bytes=fs.readFileSync('tests/fixtures/rekek-digit-1.png');fs.writeFileSync(path.join(tmp,'input.png'),bytes);
 const row={id:'diagnostic-1',group:'diagnostic',pageCount:1,path:'input.png',sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 const manifest={schema:1,cases:[row]},file=path.join(tmp,'manifest.json'),output=path.join(tmp,'results');
 const run=(reader='tesseract',extra=[])=>spawnSync(process.execPath,['tools/run-rekek-page-evaluation.mjs',file,output,reader,...extra],{encoding:'utf8',env:{...process.env,MISTRAL_API_KEY:'',OPENAI_API_KEY:'',REKEK_MODEL:''}});
 fs.writeFileSync(file,JSON.stringify(manifest));let child=run('tesseract',['--dry-run']);assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).requestsSent,0);assert.equal(fs.existsSync(output),false);
 child=run('mistral');assert.notEqual(child.status,0);assert.match(child.stderr,/MISTRAL_API_KEY/);assert.equal(fs.existsSync(output),false);
 child=run('openai');assert.notEqual(child.status,0);assert.match(child.stderr,/OPENAI_API_KEY and REKEK_MODEL/);assert.equal(fs.existsSync(output),false);
 child=run('openai',['--dry-run']);assert.equal(child.status,0);assert.equal(JSON.parse(child.stdout).requestsSent,0);
 manifest.cases.push({...row,id:'copy'});fs.writeFileSync(file,JSON.stringify(manifest));assert.match(run('tesseract',['--dry-run']).stderr,/Duplicate source/);
 manifest.cases=[{...row,sha256:'0'.repeat(64)}];fs.writeFileSync(file,JSON.stringify(manifest));assert.match(run('tesseract',['--dry-run']).stderr,/checksum mismatch/);
 manifest.cases=[{...row,group:'blind'}];fs.writeFileSync(file,JSON.stringify(manifest));assert.match(run('tesseract',['--dry-run']).stderr,/previouslyUsed/);
 manifest.cases=[{...row,expected:[recipe]}];fs.writeFileSync(file,JSON.stringify(manifest));assert.match(run('tesseract',['--dry-run']).stderr,/verified reference/);
 manifest.cases=[row];fs.writeFileSync(file,JSON.stringify(manifest));fs.mkdirSync(output);assert.match(run('tesseract',['--dry-run']).stderr,/already exists/);
 // Exercise the provider boundary with an injected transport, not a live API.
 const originalFetch=globalThis.fetch,originalKey=process.env.MISTRAL_API_KEY;
 process.env.MISTRAL_API_KEY='test-only-not-a-real-key';let calls=0;
 const responseText=JSON.stringify({pages:[{markdown:'OCR text'}],document_annotation:JSON.stringify({recipes:[recipe]})});
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.mistral.ai/v1/ocr');const request=JSON.parse(options.body);assert.equal(request.model,'mistral-ocr-4-0');assert.equal(request.document_annotation_format.type,'json_schema');assert.ok(request.document.image_url.startsWith('data:image/png;base64,'));return{ok:true,text:async()=>responseText};};
 try{
  manifest.cases=[{...row,referenceStatus:'verified',expected:[recipe]}];fs.writeFileSync(file,JSON.stringify(manifest));
  const modelOutput=path.join(tmp,'mock-provider-output');await main([file,modelOutput,'mistral']);
  assert.equal(calls,1);assert.equal(fs.readFileSync(path.join(modelOutput,row.id,'response-original.json'),'utf8'),responseText);
  const summary=JSON.parse(fs.readFileSync(path.join(modelOutput,'summary.json')));assert.equal(summary.groups.diagnostic.exactCases,1);assert.equal(summary.independentAccuracyEstablished,false);
  const freeze=fs.readFileSync(path.join(modelOutput,'freeze.json'),'utf8');assert.ok(!freeze.includes('test-only-not-a-real-key'));
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=originalKey;}
 const originalOpenAIKey=process.env.OPENAI_API_KEY,originalModel=process.env.REKEK_MODEL;
 process.env.OPENAI_API_KEY='test-openai-key';process.env.REKEK_MODEL='test-vision-model';let openAICalls=0;
 const rich={...recipe,page_ids:['page-1'],ingredients:recipe.ingredients.map(x=>({...x,source_line:`${x.quantity} ${x.unit} ${x.name}`,page_id:'page-1'})),unclear:[]};
 const openAIRaw=JSON.stringify({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify({recipes:[rich]})}]}]});
 globalThis.fetch=async(url,options)=>{openAICalls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'test-vision-model');assert.equal(body.store,false);return new Response(openAIRaw,{status:200});};
 try{
  const openAIOutput=path.join(tmp,'mock-openai-output');await main([file,openAIOutput,'openai']);
  assert.equal(openAICalls,1);assert.equal(fs.readFileSync(path.join(openAIOutput,row.id,'response-original.json'),'utf8'),openAIRaw);
  const summary=JSON.parse(fs.readFileSync(path.join(openAIOutput,'summary.json')));assert.equal(summary.groups.diagnostic.exactCases,1);assert.equal(summary.independentAccuracyEstablished,false);
  const freeze=JSON.parse(fs.readFileSync(path.join(openAIOutput,'freeze.json')));assert.equal(freeze.model,'test-vision-model');assert.equal(freeze.adapterSha256.length,64);assert.ok(!JSON.stringify(freeze).includes('test-openai-key'));
 }finally{globalThis.fetch=originalFetch;if(originalOpenAIKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalOpenAIKey;if(originalModel===undefined)delete process.env.REKEK_MODEL;else process.env.REKEK_MODEL=originalModel;}
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('Page evaluation: wrong amounts, units, missing/extra/duplicate ingredients, swapped assignments, steps, portions, input freeze and no-key/no-request guards passed. Synthetic functional tests only.');
