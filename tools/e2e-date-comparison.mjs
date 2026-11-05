import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),requests=[],violations=[];
const server=http.createServer((req,res)=>{
 requests.push({method:req.method,url:req.url});if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm','.txt':'text/plain'};
 try{res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.RESERVE_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('blob:')||url.startsWith('data:'))return route.continue();if(!url.startsWith(origin+'/')){violations.push(url);return route.abort();}return route.continue();});
 await page.goto(origin+'/experiments/date-comparison.html');assert.equal(await page.locator('h1').textContent(),'MHD-Vergleich auf dem Handy');
 assert.equal(await page.locator('#photo').isDisabled(),true);await page.locator('#load').click();
 await page.waitForFunction(()=>window.RESERVE_MOBILE_COMPARE?.state.ready||document.getElementById('status').textContent.startsWith('Ladefehler'),null,{timeout:120000});
 assert.equal(await page.evaluate(()=>RESERVE_MOBILE_COMPARE.state.ready),true,await page.locator('#status').textContent());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const before=requests.length;await context.setOffline(true);
 const fixture=async(text,force=true)=>page.evaluate(async({text,force})=>{const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=240;const x=canvas.getContext('2d');x.fillStyle='white';x.fillRect(0,0,canvas.width,canvas.height);x.fillStyle='black';x.font='64px Arial';x.fillText(text,35,130);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const file=new File([blob],'synthetic.png',{type:'image/png'});return force?RESERVE_MOBILE_COMPARE.runFixture(file):null;},{text,force});
 const actual=await fixture('MHD 31.12.2027');assert.ok(actual,await page.locator('#status').textContent());assert.ok(actual.v4Lines>0);assert.ok(actual.v5Lines>0);assert.equal(actual.baseline?.date,'2027-12-31');assert.equal(actual.supplement?.date,'2027-12-31');assert.equal(actual.usedFallback,false);
 const short=await fixture('MHD 24.10.26');assert.ok(short.shortYears.length>0);assert.equal(short.candidate,null);await page.getByLabel('Vollständiges Jahr bestätigen').first().fill('2026');await page.locator('#yearChoices button').first().click();assert.equal(await page.locator('#reference').inputValue(),'2026-10-24');await page.locator('#remember').click();assert.equal(await page.evaluate(()=>RESERVE_MOBILE_COMPARE.state.rows),1);
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const downloaded=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.equal(exported.photosIncluded,false);assert.equal(exported.physicalDeviceVerified,false);assert.equal(exported.rows[0].candidateCorrect,false);assert.equal(exported.rows[0].assisted.date,'2026-10-24');assert.ok(!JSON.stringify(exported).includes('data:image'));
 const blank=await fixture('');assert.equal(blank.usedFallback,true);assert.equal(blank.candidate,null);
 const cancelled=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=1000;const b=await new Promise(resolve=>c.toBlob(resolve));const job=RESERVE_MOBILE_COMPARE.runFixture(new File([b],'cancel.png',{type:'image/png'}));RESERVE_MOBILE_COMPARE.stop();return job;});assert.equal(cancelled,null);assert.equal(await page.evaluate(()=>RESERVE_MOBILE_COMPARE.state.ready),false);assert.equal(await page.evaluate(()=>RESERVE_MOBILE_COMPARE.state.current),null);
 await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(requests.length,before,'Photo processing attempted an HTTP request after model loading');assert.equal(requests.some(r=>r.method!=='GET'),false);assert.deepEqual(violations,[]);
 console.log(JSON.stringify({schema:'browser-comparison-smoke',v4ActualInference:true,v5ActualInference:true,blankFallback:true,explicitYearConfirmation:true,exportWithoutPhotos:true,cancelAndStaleGuard:true,widths:[390,320],offlinePhotoInference:true,physicalPhoneTest:false,nativeAccuracyParity:false,syntheticOnly:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
