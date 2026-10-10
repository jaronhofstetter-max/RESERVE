import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const imports=JSON.parse(fs.readFileSync('data/quality-batch-chuchitisch-v1.json','utf8'));
const scripts=['ingredient-identity-v1.js','reserve-core-v3.js','recipe-detail-runtime-v1.js'];
const html=fs.readFileSync('index.html','utf8').replace("fetch('data/recipes.json',{cache:'no-store'})","fetch('data/recipe-catalog.json',{cache:'no-store'})").replace('</body>',scripts.map(f=>`<script src="${f}"></script>`).join('')+'</body>');
const server=http.createServer((req,res)=>{
  const path=req.url.split('?')[0];
  try{
    res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.webp')?'image/webp':'text/html');
    res.end(path==='/'?html:fs.readFileSync('.'+path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>recipes.some(r=>r.id==='chuchitisch-spaghetti-tomatensauce'));
  for(const recipe of imports){
    await page.evaluate(id=>startCook(id),recipe.id);
    await page.waitForSelector('#cookView .recipe-source');
    assert.equal(await page.locator('#cookView h2').innerText(),recipe.name);
    await page.waitForFunction(()=>{const img=document.querySelector('#cookView .recipe-visual img');return img?.complete&&img.naturalWidth>0;});
    assert.equal(await page.evaluate(()=>{const visual=document.querySelector('#cookView .recipe-visual'),img=visual.querySelector('img'),credit=document.querySelector('#cookView .recipe-photo-credit'),title=document.querySelector('#cookView .cook-title');return img.getBoundingClientRect().bottom<=visual.getBoundingClientRect().bottom+1&&visual.getBoundingClientRect().bottom<=credit.getBoundingClientRect().top+1&&credit.getBoundingClientRect().bottom<=title.getBoundingClientRect().top+1;}),true);
    assert.equal(await page.locator('#cookView details.recipe-source').getAttribute('open'),null);
    assert.ok((await page.locator('#cookView').innerText()).includes('Nährwerte pro Person · Schätzung'));
    await page.locator('#cookView .recipe-source summary').click();
    assert.ok((await page.locator('#cookView .recipe-source').innerText()).includes('CC BY-SA 3.0'));
    assert.equal(await page.locator('#cookView .recipe-source a').first().getAttribute('href'),recipe.recipeCredit.source);
  }
  await page.evaluate(()=>startCook('chuchitisch-minestrone'));
  await page.waitForSelector('#cookView .recipe-source');
  assert.ok((await page.locator('#cookView').innerText()).includes('+ 12 Std. Einweichen'));
  await page.evaluate(()=>{localStorage.setItem('reserveProfile',JSON.stringify({people:2,diet:'Alles',avoid:'',dislikes:'',goal:'Schnell',maxMinutes:180}));});
  await page.evaluate(()=>startCook('chuchitisch-broccoli-linsen-salat'));
  const lentils=page.locator('#cookView .ingredient').filter({hasText:'Beluga-Linsen'});
  assert.ok((await lentils.innerText()).includes('150 g'));
  assert.ok((await lentils.innerText()).includes('75 g / Person'));
  await page.evaluate(()=>{avoid.value='Soja';saveProfile();});
  assert.equal(await page.evaluate(()=>allowed(recipes.find(r=>r.id==='chuchitisch-broccoli-linsen-salat'))),false);
  assert.deepEqual(errors,[]);
  console.log('Chuchitisch: original photos, lazy recipe details, licenses, estimated nutrition, soaking time, household portions and soy exclusion OK');
}finally{await browser?.close();server.close();}