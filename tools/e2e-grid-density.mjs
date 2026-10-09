import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const server=http.createServer((req,res)=>{const n=new URL(req.url,'http://localhost').pathname;try{const f=n==='/'?'index.html':n.slice(1);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('https://**',r=>r.abort());await page.addInitScript(()=>localStorage.setItem('reserveStock',JSON.stringify([{n:'Reis',q:'500 g',barcode:'1234567890123'}])));
try{
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForSelector('#reserveCabinet',{state:'attached'});
await page.evaluate(()=>show('stock',document.querySelector('nav .tab[onclick*="stock"]')));
const count=()=>page.locator('#reserveCabinet').evaluate(el=>el.style.getPropertyValue('--cab-columns'));
assert.equal(await page.locator('.cab-grid-controls').count(),0);
assert.equal(await page.locator('#cabinetCount').isVisible(),false);
assert.equal(await page.locator('#cabinetSearch').getAttribute('placeholder'),'Im Vorrat suchen');
assert.equal(await count(),'2');
await page.locator('#reserveCabinet').evaluate(host=>{const t=d=>[new Touch({identifier:1,target:host,clientX:20,clientY:100}),new Touch({identifier:2,target:host,clientX:20+d,clientY:100})];host.dispatchEvent(new TouchEvent('touchstart',{cancelable:true,touches:t(200)}));host.dispatchEvent(new TouchEvent('touchmove',{cancelable:true,touches:t(20)}));host.dispatchEvent(new TouchEvent('touchend',{touches:[]}))});
assert.equal(await count(),'10');
for(const width of [320,390,690,1200]){await page.setViewportSize({width,height:844});const layout=await page.locator('.cab-frame').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,width:el.clientWidth,scroll:el.scrollWidth}));assert.equal(layout.columns,10);assert.ok(layout.scroll<=layout.width+1)}
await page.reload();await page.waitForSelector('#reserveCabinet',{state:'attached'});assert.equal(await count(),'10');
await page.evaluate(()=>show('stock',document.querySelector('nav .tab[onclick*="stock"]')));
const pinch=async(start,end)=>page.locator('#reserveCabinet').evaluate((host,{start,end})=>{
const send=(type,d)=>{const touches=d===null?[]:[new Touch({identifier:1,target:host,clientX:20,clientY:100}),new Touch({identifier:2,target:host,clientX:20+d,clientY:100})];host.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches,targetTouches:touches,changedTouches:touches}))};
send('touchstart',start);send('touchmove',end);send('touchend',null);
},{start,end});
await pinch(100,200);assert.equal(await count(),'5');
await pinch(200,100);assert.equal(await count(),'10');
await pinch(100,1000);assert.equal(await count(),'2');
await page.waitForTimeout(550);await page.locator('.cab-product').first().click();await page.waitForSelector('#cabinetProduct.active');
console.log('Grid density: clean header, 2–10 bounds, pinch both directions, persistence, narrow layouts and product opening OK');
}finally{await browser.close();server.close()}
