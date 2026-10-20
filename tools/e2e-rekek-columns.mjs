import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Exercise the real browser import pipeline with captured failure-shaped OCR and synthetic geometry.
// This does not assert real OCR accuracy on the user's original photograph.
const source=fs.readFileSync('index.html','utf8');
const html=source.includes('src="personal-recipe-parser-v1.js')?source:source.replace('</body>','<script src="personal-recipe-parser-v1.js"></script><script src="personal-recipes-v1.js"></script></body>');
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':'text/html');res.end(p==='/'?html:fs.readFileSync('.'+p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>{
  const box=(text,x0,y0,x1,y1)=>({text,bbox:{x0,y0,x1,y1}});
  const original='Hähnchenbrust in\nHonig-Senf-Marinade\nFür ca. 3–4 Personen\nZUTATEN ZUBEREITUNG\n600 g Hähnchenbrustfilet 1. Hähnchenbrust in Stücke schneiden.\n12 EL Honig 2. Zutaten verrühren.';
  const full={text:original,words:[box('ZUTATEN',100,450,230,480),box('ZUBEREITUNG',540,450,750,480)],lines:[box('Hähnchenbrust in',160,100,800,150),box('Honig-Senf-Marinade',120,160,850,210)]};
  const left={text:'ZUTATEN\n600 g Hähnchenbrustfilet\n2 EL Senf\n1½ EL Honig\n2 EL Öl\n1 Knoblauchzehe\nSalz & Pfeffer nach Geschmack\n½ TL Paprikapulver'};
  const right={text:'ZUBEREITUNG\n1. Hähnchenbrust in Stücke schneiden.\n2. Zutaten in einer Schüssel verrühren.\n3. Hähnchen zur Marinade geben und vermengen.\n4. Abgedeckt im Kühlschrank ziehen lassen.\n5. Alternativ roh mit Marinade einfrieren.\n6. Nach dem Auftauen vollständig durchgaren.\nfoodchaos.daily'};
  const results=[full,full,full,left,right,left,right,{text:'Hähnchenbrust in\nHonig-Senf-Marinade'},{text:'Hähnchenbrust in Honig-Senf-Marinade'}];let n=0;
  window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{if(n>=results.length)throw Error('Unexpected extra OCR call');return{data:results[n++]};},terminate:async()=>{}})};
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES);
 await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.edit());
 const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=1500;c.getContext('2d').fillStyle='white';c.getContext('2d').fillRect(0,0,1000,1500);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('#personalScreenshots').setInputFiles({name:'two-column-regression.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await page.waitForFunction(()=>document.getElementById('personalCancelOCR').hidden);
 assert.equal(await page.locator('#personalName').inputValue(),'Hähnchenbrust in Honig-Senf-Marinade');
 assert.equal(await page.locator('#personalPortions').inputValue(),'');
 const ingredients=await page.locator('#personalIngredients').inputValue(),steps=await page.locator('#personalSteps').inputValue();
 assert.equal(ingredients.split('\n').length,7);assert.ok(ingredients.includes('1½ EL Honig'));assert.ok(!ingredients.includes('12 EL'));assert.ok(!ingredients.includes('Hähnchen zur Marinade'));
 assert.equal(steps.split('\n').length,6);assert.ok(!steps.includes('foodchaos.daily'));assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
 // The reviewed OCR draft must reach the same saved recipe view as manual entries.
 await page.locator('#personalPortions').fill('4');
 await page.locator('#personalConfirmed').check();
 await page.locator('#personalReview').evaluate(form=>form.requestSubmit());
 await page.locator('#personalRecipeDetail h2').waitFor({state:'visible'});
 const detail=await page.locator('#personalRecipeDetail').innerText();
 assert.ok(detail.includes('Hähnchenbrust in Honig-Senf-Marinade'));
 assert.ok(detail.includes('1½ EL Honig'));
 assert.ok(!detail.includes('12 EL Honig'));
 assert.ok(detail.includes('Nach dem Auftauen vollständig durchgaren.'));
 assert.equal(await page.locator('.personal-ingredients .ingredient').count(),7);
 assert.equal(await page.locator('[data-personal-step]').count(),6);
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('reservePersonalRecipesV1'))[0]);
 assert.equal(record.portions,4);
 assert.equal(record.prepMinutes,null);assert.equal(record.cookMinutes,null);
 assert.deepEqual(record.ingredientLines,ingredients.split('\n'));
 assert.deepEqual(record.steps,steps.split('\n'));
 await page.locator('[data-personal-step="0"]').check();
 await page.reload();
 await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES);
 await page.locator('#personalRecipesHome').click();
 await page.locator('[data-personal]').first().click();
 await page.locator('#personalRecipeDetail h2').waitFor({state:'visible'});
 assert.equal(await page.locator('#personalRecipeDetail').innerText(),detail);
 assert.equal(await page.locator('[data-personal-step="0"]').isChecked(),true);
 await page.locator('#personalEdit').click();
 assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
 assert.equal(await page.locator('#personalIngredients').inputValue(),ingredients);
 assert.equal(await page.locator('#personalSteps').inputValue(),steps);
 assert.deepEqual(errors,[]);console.log('REKEK browser pipeline: separated columns, complete title, fractions, serving review, saved recipe view and reload persistence OK (mock OCR).');
}finally{await browser?.close();server.close();}
