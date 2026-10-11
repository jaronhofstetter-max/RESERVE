import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const source=fs.readFileSync('index.html','utf8');
const html=source.includes('src="personal-recipe-parser-v1.js')?source:source.replace('</body>','<script src="personal-recipe-parser-v1.js"></script><script src="personal-recipes-v1.js"></script></body>');
const server=http.createServer((req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(!file||file==='index.html'?html:fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
fs.mkdirSync('build/rekek-browser-review',{recursive:true});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**',route=>route.abort());
  await page.addInitScript(()=>{window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:'Reisgericht\nZutaten\n200 g Reis\nZubereitung\nReis kochen.\n\nGemüsesuppe\n4 Personen\nZutaten\n1 l Wasser\n200 g Gemüse\nZubereitung\nGemüse kochen.'}}),terminate:async()=>{}})};});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES);
  await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.edit());
  const buffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await page.locator('#personalScreenshots').setInputFiles({name:'original.png',mimeType:'image/png',buffer});
  await page.waitForFunction(()=>document.getElementById('personalStatus').textContent.includes('2 Entwürfe'));
  assert.equal(await page.locator('#personalName').inputValue(),'');
  assert.equal(await page.locator('#personalOriginalPhotos img').count(),1);
  await page.locator('#personalDraftChoice').selectOption('1');
  assert.equal(await page.locator('#personalName').inputValue(),'Gemüsesuppe');
  assert.equal(await page.locator('#personalPortions').inputValue(),'4');
  assert.equal(await page.locator('#personalIngredients').inputValue(),'1 l Wasser\n200 g Gemüse');
  await page.locator('#personalConfirmed').check();
  await page.locator('#personalIngredients').fill('1 l Wasser\n250 g Gemüse');
  assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
  await page.locator('#personalReview button[type=submit]').click();
  assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records().length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.screenshot({path:`build/rekek-browser-review/review-${width}.png`,fullPage:true});
  await page.locator('#personalConfirmed').check();
  await page.locator('#personalReview button[type=submit]').click();
  await page.waitForSelector('#personalRecipePage.active');
  assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records().length),1);
  await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.edit());
  assert.equal(await page.locator('#personalOriginalPhotos img').count(),0);
  assert.equal(await page.locator('#personalSameRecipe').isChecked(),false);
  // Exercise the actual JSON file input and retain preparation variants verbatim.
  await page.locator('#personalDraftFile').setInputFiles({name:'drafts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({drafts:[{title:'Testentwurf',ingredients:[{}],sourceExpressions:[{normalizedExpression:'500 a Hackfleisch'}],preparationVariants:[{text:'Zutaten mischen.'},{text:'Oder backen.'}]}]}))});
  await page.waitForFunction(()=>document.getElementById('personalName').value==='Testentwurf');
  assert.equal(await page.locator('#personalPortions').inputValue(),'');
  assert.equal(await page.locator('#personalSteps').inputValue(),'Zutaten mischen.\nOder backen.');
  assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
  await page.evaluate(()=>{RESERVE_PERSONAL_RECIPES.edit();let calls=0;window.cardReadCalls=0;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>{window.cardReadCalls=++calls;return{data:{text:calls===1?'Unlesbare Karte':'Gemüsetopf\nZutaten:\n200 g Gemüse\n1 l Wasser\n2 Stück Kartoffeln\nZubereitung:\n1. Waschen.\n2. Kochen.\n3. Servieren.'}}}})};});
  await page.locator('#personalScreenshots').setInputFiles({name:'reread.png',mimeType:'image/png',buffer});
  await page.waitForFunction(()=>document.getElementById('personalStatus').textContent.includes('Lesarten stimmen'));
  assert.equal(await page.evaluate(()=>window.cardReadCalls),3);
  assert.equal(await page.locator('#personalName').inputValue(),'Gemüsetopf');
  assert.equal(await page.locator('#personalIngredients').inputValue(),'200 g Gemüse\n1 l Wasser\n2 Stück Kartoffeln');
  assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
  assert.ok((await page.locator('#personalOCREvidence').inputValue()).includes('Unlesbare Karte'));
  assert.ok(!(await page.locator('#personalRaw').inputValue()).includes('Nachlesung PSM'));
  // Pixel-divider card with two conflicting amounts. These are mocked reads,
  // deliberately unrelated to recipe reference labels or real-photo accuracy.
  await page.evaluate(()=>{RESERVE_PERSONAL_RECIPES.edit();let calls=0;const bbox=(x0,y0,x1,y1)=>({x0,y0,x1,y1});const column={text:'Zutaten:\n500 g Fleisch\n1 Ei\n2 EL Kräuter\n1 TL Senf\n1 EL Mehl',lines:[{text:'Zutaten:',bbox:bbox(8,5,120,25)},...['500 g Fleisch','1 Ei','2 EL Kräuter','1 TL Senf','1 EL Mehl'].map((text,i)=>({text,bbox:bbox(10,50+i*50,290,75+i*50)}))]};window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>{calls++;let data;if(calls===1)data={text:'Unlesbare Karte'};else if(calls===2||calls===3)data={text:'Vollbild '+calls,words:Array.from({length:6},(_,i)=>({text:'1',bbox:bbox(100,200+i*45,110,220+i*45)}))};else if(calls===4||calls===6)data={...column,text:column.text+(calls===6?'\nAbweichung':'')};else if(calls===5||calls===7)data={text:'1. Mischen.\n2. Formen.\n3. Garen.'+(calls===7?'\nAbweichung':'')};else data={text:['500 g Fleisch','800 g Fleisch','1 Ei','1 Ei','2 EL Kräuter','2 EL Kräuter','1 TL Senf','','1 EL Mehl','1 EL Mehl'][calls-8]||''};return{data}}})};});
  const card=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,800);x.fillStyle='black';x.fillRect(258,150,2,600);return c.toDataURL('image/png').split(',')[1]}),'base64');
  await page.locator('#personalScreenshots').setInputFiles({name:'row-review.png',mimeType:'image/png',buffer:card});
  await page.waitForFunction(()=>document.getElementById('personalStatus').textContent.includes('Zeilenweise Nachlesung'));
  assert.equal(await page.locator('#personalRowReview tr').count(),6);
  assert.equal(await page.locator('#personalName').inputValue(),'');
  assert.equal(await page.locator('#personalPortions').inputValue(),'');
  assert.ok((await page.locator('#personalIngredients').inputValue()).startsWith('Menge ungeklärt: 500 g Fleisch\n1 Ei'));
  assert.ok((await page.locator('#personalIngredients').inputValue()).includes('Menge ungeklärt: 1 TL Senf'));
  assert.ok((await page.locator('#personalOCREvidence').inputValue()).includes('800 g Fleisch'));
  assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.screenshot({path:`build/rekek-browser-review/ingredient-rows-${width}.png`,fullPage:true});
  await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.edit());
  assert.equal(await page.locator('#personalRowReview').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('REKEK Chromium review: mobile and desktop, original photo upload, candidate choice, confirmation reset, save gating, confirmed save, reset and JSON import passed. Mock OCR only.');
}finally{await browser.close();server.close();}

