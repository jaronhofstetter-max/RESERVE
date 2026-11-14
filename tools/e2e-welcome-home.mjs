// Exercise actual home navigation, optional setup and inventory on phone and desktop.
import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const server=http.createServer((req,res)=>{const n=new URL(req.url,'http://localhost').pathname;try{const f=n==='/'?'index.html':n.slice(1);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':f.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`,errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**',r=>r.abort());
 await page.route('**/reserve-account-config-v1.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.RESERVE_ACCOUNT_CONFIG={enabled:true,trial:true,url:'https://test-reserve.supabase.co',publishableKey:'sb_publishable_fixture'};window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};"}));
 await page.goto(base);await page.waitForFunction(()=>!!window.RESERVE_WELCOME);await page.waitForSelector('#home.active #reserveHomeCapture');
 assert.match(await page.locator('#reserveHomeExpiry').innerText(),/noch leer/);
 assert.equal(await page.locator('#reserveQuickSetup').getAttribute('open'),null);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const box=await page.locator('#reserveHomeCapture').boundingBox();assert.ok(box.y+box.height<844);assert.equal(await page.locator('#reserveAccountBadge').evaluate(b=>getComputedStyle(b).position),'static');}
 await page.setViewportSize({width:390,height:844});
 await page.locator('#reserveHomeCapture').click();await page.waitForSelector('#reserveCapture.active');
 await page.evaluate(()=>RESERVE_WELCOME.navigate('home'));await page.locator('[data-home-section="stock"]').first().click();await page.waitForSelector('#stock.active');
 await page.evaluate(()=>RESERVE_WELCOME.navigate('home'));await page.locator('[data-home-section="search"]').click();await page.waitForSelector('#search.active');
 await page.evaluate(()=>RESERVE_WELCOME.navigate('home'));await page.locator('#reserveQuickSetup summary').click();await page.locator('#homePeople').fill('3');await page.locator('#homeDiet').selectOption('Vegetarisch');await page.locator('#homeAvoid').fill('Milch');await page.locator('#reserveQuickSetupForm button[type=submit]').click();
 const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('reserveProfile')));assert.equal(profile.people,3);assert.equal(profile.diet,'Vegetarisch');assert.equal(profile.avoid,'Milch');
 await page.reload();await page.waitForSelector('#reserveHomeCapture');assert.equal(await page.locator('#reserveQuickSetup').count(),0);
 await page.evaluate(()=>RESERVE_WELCOME.navigate('profile'));for(const id of ['people','diet','avoid','dislikes','goal','maxMinutes'])assert.ok(await page.locator('#'+id).evaluate(f=>f.labels.length>0),id+' has a visible field label');
 await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+2);stock=[{n:'Reis',q:'500 g',e:d.toISOString().slice(0,10)}];saveStock();RESERVE_WELCOME.navigate('home');RESERVE_WELCOME.render();});
 assert.match(await page.locator('#reserveHomeStockCount').innerText(),/1 erfasste Position/);assert.match(await page.locator('#reserveHomeExpiry').innerText(),/Reis/);
 await page.screenshot({path:'build/welcome-home-mobile.png'});assert.deepEqual(errors,[]);console.log('Welcome home: trial startup, 320/390/1280px, capture, stock, recipes, optional setup persistence, field labels, live inventory and non-overlapping account status OK.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
