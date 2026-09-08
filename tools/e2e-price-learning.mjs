import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port=4182,server=spawn('python3',['-m','http.server',String(port)],{stdio:'ignore'});await new Promise(r=>setTimeout(r,700));
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
try{
 await page.goto(`http://127.0.0.1:${port}/index.html`);await page.waitForFunction(()=>window.RESERVE_PRICE_LEARNING&&window.RESERVE_WEEKLY_PRICE);
 const result=await page.evaluate(()=>{localStorage.setItem('reserveStock',JSON.stringify([{n:'Milch',q:'2 l',purchasePriceCHF:4.4,captureSource:'receipt-import',capturedAt:new Date().toISOString()}]));location.reload();return true});
 await page.waitForLoadState('load');await page.waitForFunction(()=>window.RESERVE_PRICE_LEARNING&&window.RESERVE_WEEKLY_PRICE);
 const x=await page.evaluate(()=>({rate:RESERVE_PRICE_LEARNING.learnedRate('Milch','l'),known:RESERVE_WEEKLY_PRICE.priceShopping([{name:'Milch',amount:3,unit:'l'}]),unknown:RESERVE_WEEKLY_PRICE.priceShopping([{name:'Unbekannt',amount:2,unit:'kg'}])}));
 if(Math.abs(x.rate-2.2)>.001)throw new Error('learned rate mismatch');if(x.known.learned!==1||Math.abs(x.known.total-6.6)>.001)throw new Error('observed estimate mismatch');if(x.unknown.fallback!==1||Math.abs(x.unknown.total-10)>.001)throw new Error('fallback estimate mismatch');console.log('Price Learning v1.0 E2E passed');
}finally{await browser.close();server.kill('SIGTERM')}
