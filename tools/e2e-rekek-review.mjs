import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const html=fs.readFileSync('index.html','utf8').replace('</body>','<script src="personal-recipe-parser-v1.js"></script><script src="personal-recipes-v1.js"></script></body>');
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
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('REKEK Chromium review: mobile and desktop, original photo upload, candidate choice, confirmation reset, save gating, confirmed save, reset and JSON import passed. Mock OCR only.');
}finally{await browser.close();server.close();}
