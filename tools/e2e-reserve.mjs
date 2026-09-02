import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';let f=path.join(root,p);if(!f.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('not found')}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b)})});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Array.isArray(window.recipes)&&window.recipes.length>=50);
  await page.waitForFunction(()=>window.RESERVE_AUTOPILOT&&typeof window.RESERVE_AUTOPILOT.plan==='function');
  const result=await page.evaluate(()=>{
    const p=RESERVE_AUTOPILOT.plan(7),flat=RESERVE_AUTOPILOT.flatten(p),shopping=RESERVE_AUTOPILOT.shoppingFor(flat);
    return {days:p.days.length,slots:p.days.map(d=>d.map(x=>x.slot)),meals:flat.length,shopping:Array.isArray(shopping),autopilotCard:!!document.getElementById('reserveAutopilot'),sync:!!window.RESERVE_SYNC,barcode:!!document.querySelector('[id*=barcode i], [class*=barcode i]')||document.body.innerText.toLowerCase().includes('barcode')};
  });
  if(result.days!==7)throw new Error(`Autopilot plant ${result.days} statt 7 Tage`);
  for(const slots of result.slots)for(const required of ['Frühstück','Mittagessen','Abendessen'])if(!slots.includes(required))throw new Error(`Mahlzeit-Slot fehlt: ${required}`);
  if(result.meals<14)throw new Error(`Zu wenige Mahlzeiten geplant: ${result.meals}`);
  if(!result.shopping)throw new Error('Einkaufsberechnung liefert keine Liste');
  if(!result.autopilotCard)throw new Error('Autopilot UI fehlt');
  if(!result.sync)throw new Error('Backup/Sync Modul nicht aktiv');
  if(errors.length)throw new Error('Browserfehler: '+errors.join(' | '));
  console.log('✓ RESERVE Browser-E2E bestanden',result);
}finally{await browser.close();server.close()}
