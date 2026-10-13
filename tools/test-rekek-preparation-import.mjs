import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const parser=fs.readFileSync('personal-recipe-parser-v1.js','utf8');let app=fs.readFileSync('personal-recipes-v1.js','utf8');
const begin=app.indexOf('async function imageCanvas('),end=app.indexOf('async function compress(',begin);assert.ok(begin>0&&end>begin);
app=app.slice(0,begin)+"async function imageCanvas(){return window.__testCanvas}\n"+app.slice(end);
class Element{value='';checked=false;hidden=false;disabled=false;textContent='';children=[];replaceChildren(){this.children=[]}append(...x){this.children.push(...x)}getContext(){return{drawImage(){},getImageData(){return{width:20,height:20,data:new Uint8ClampedArray(20*20*4).fill(255)}}}}width=20;height=20;toDataURL(){return 'data:image/png;base64,test'}closest(){return{open:false}}}
const original='Gemüsesuppe\nFür 2 Personen\nZutaten\n200 g Gemüse\n500 ml Wasser\n1 TL Öl';
const prose='Zubereitung:\nGemüse schneiden und im Öl braten.\nWasser zugeben und zehn Minuten kochen.\n\nDie Suppe servieren.';
async function run(reads,initial=original){const ids=new Map();const el=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)};let pass=0,saved=0;
 const c={window:{__testCanvas:new Element(),Tesseract:{createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:[initial,...reads][pass++]||''}})})}},document:{readyState:'loading',addEventListener(){},getElementById:el,createElement:()=>new Element()},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout,clearTimeout,console,localStorage:{getItem:()=>null,setItem(){saved++}}};vm.createContext(c);vm.runInContext(parser,c);vm.runInContext(app,c);el('personalConfirmed').checked=true;
 await c.window.RESERVE_PERSONAL_RECIPES.importScreenshots([{name:'test.png',type:'image/png'}]);return{el,pass,saved};}
const ok=await run(['Anderer OCR-Kopf\nZutaten\n800 g Gemüse\n'+prose,'OCR-Kopf\nZutaten\n900 g Gemüse\n'+prose]);
assert.equal(ok.el('personalName').value,'Gemüsesuppe');assert.equal(ok.el('personalPortions').value,'2');assert.equal(ok.el('personalIngredients').value,'200 g Gemüse\n500 ml Wasser\n1 TL Öl');assert.match(ok.el('personalSteps').value,/zehn Minuten kochen/);assert.equal(ok.el('personalConfirmed').checked,false);assert.equal(ok.saved,0);assert.equal(ok.pass,3);assert.match(ok.el('personalStatus').textContent,/Zubereitung aus übereinstimmenden/);
const conflict=await run([prose,prose.replace('zehn','zwanzig')]);assert.equal(conflict.el('personalSteps').value,'');assert.equal(conflict.saved,0);
const missing=await run([prose,prose.replace('Zubereitung:','Text:')]);assert.equal(missing.el('personalSteps').value,'');
const existing=await run([prose,prose],original+'\nZubereitung\nOriginalschritt erhalten.');assert.equal(existing.el('personalSteps').value,'Originalschritt erhalten.');
const multi=await run([prose,prose],original+'\n\nZweites Rezept\nZutaten\n100 g Reis\nZubereitung\nReis kochen.');assert.equal(multi.el('personalSteps').value,'');
console.log('Preparation import integration passed: only empty single-recipe steps filled; ingredient/name/serving preservation; conflicting/missing headings rejected; existing steps and multi-recipe selection preserved; no confirmation or storage writes. Mocked OCR/canvas, not browser accuracy.');
