// Observe real paint opportunities while late shell modules are deliberately delayed.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',file.endsWith('.html')?'no-store':'public, max-age=600');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});let slow=true;
 await context.route('**/*',async route=>{const url=route.request().url();if(!url.startsWith(origin))return route.abort();if(slow&&/\/(sidebar-navigation-v1|autopilot-v2)\.js/.test(url))await new Promise(r=>setTimeout(r,1000));await route.continue();});
 await context.addInitScript(()=>{
  localStorage.setItem('reserveOnboardingDone','1');
  window.__startupFrames={frames:0,waiting:0,bad:[]};
  function watch(){const s=window.__startupFrames,h=document.querySelector('body>header'),m=document.querySelector('body>main'),visible=e=>!!e&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';s.frames++;if(document.documentElement.classList.contains('reserve-starting'))s.waiting++;if(visible(h)&&!document.getElementById('reserveMenuToggle'))s.bad.push('legacy navigation');if(visible(m)&&document.querySelector('.panel.active')?.id==='home'&&(!document.getElementById('autopilotV2')||document.getElementById('smartNow')?.getAttribute('data-reserve-render')!=='ready'))s.bad.push('unfinished Home');requestAnimationFrame(watch);}requestAnimationFrame(watch);
 });
 const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.reserveStartup==='ready');await page.waitForTimeout(300);
 const first=await page.evaluate(()=>window.__startupFrames);assert.deepEqual(first.bad,[]);assert.ok(first.waiting>0,'exercise a delayed first load');assert.equal(await page.locator('#reserveStartupStatus').count(),0);assert.ok(await page.locator('#reserveMenuToggle').isVisible());assert.ok(await page.locator('#autopilotV2').isVisible());
 fs.mkdirSync('build/startup-review',{recursive:true});await page.screenshot({path:'build/startup-review/mobile-ready.png',fullPage:false});
 slow=false;await context.unroute('**/*');
 // Routing disables Chromium's HTTP cache. Warm it after removing interception,
 // then verify a subsequent load actually receives cached script resources.
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.reserveStartup==='ready');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.reserveStartup==='ready');await page.waitForTimeout(300);const repeat=await page.evaluate(()=>({frames:window.__startupFrames,cached:performance.getEntriesByType('resource').filter(e=>e.name.includes('.js')&&e.transferSize===0).length}));assert.deepEqual(repeat.frames.bad,[]);assert.ok(repeat.cached>0,'repeat load must exercise the real HTTP cache');
 await page.goto(origin+'/#reserve-capture',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.reserveStartup==='ready');assert.ok(await page.locator('#reserveCapture').isVisible(),'direct scanner route must not wait for a hidden Home dashboard');
 await context.close();
 // A missing essential script shows a retry action rather than exposing the old shell.
 const failed=await browser.newContext({viewport:{width:390,height:844}});let blocked=true;await failed.route('**/*',r=>{const url=r.request().url();return !url.startsWith(origin)||(blocked&&url.includes('/sidebar-navigation-v1.js'))?r.abort():r.continue();});
 const retry=await failed.newPage();await retry.goto(origin,{waitUntil:'domcontentloaded'});await retry.getByRole('button',{name:'Neu laden',exact:true}).waitFor({state:'visible',timeout:16000});assert.equal(await retry.locator('body>header').evaluate(el=>getComputedStyle(el).visibility),'hidden');assert.equal(await retry.locator('body>main').evaluate(el=>getComputedStyle(el).visibility),'hidden');blocked=false;await retry.getByRole('button',{name:'Neu laden',exact:true}).click();await retry.waitForFunction(()=>document.documentElement.dataset.reserveStartup==='ready');assert.ok(await retry.locator('#reserveMenuToggle').isVisible());await failed.close();
 console.log('Startup paint: delayed mobile cold start, repeat load, direct scanner route and missing-module retry passed; no legacy navigation or unfinished Home was visible at a sampled paint opportunity.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
