import { chromium } from 'playwright';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);if(!f.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('not found')}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(4178,'127.0.0.1',r));
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4178',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.RESERVE_SMART_PRIORITIES?.version==='1.1'&&window.RESERVE_TODAY?.version==='1.1');
 const result=await page.evaluate(async()=>{
  const d=new Date();d.setDate(d.getDate()+2);const expiry=d.toISOString().slice(0,10);
  stock=[{n:'Test Karotte',q:'500 g',e:expiry,c:'Gemüse & Früchte'}];
  recipes=[{id:'smart-today-test',name:'Karotten Test Menü',ingredients:[{name:'Test Karotte',amount:100,unit:'g'}],steps:['Kochen']}];
  const priorities=RESERVE_SMART_PRIORITIES.recipePriorities();
  RESERVE_TODAY.render();await new Promise(r=>setTimeout(r,20));
  const before=document.getElementById('reserveToday')?.innerText||'';
  stock=[];document.body.dispatchEvent(new Event('click',{bubbles:true}));await new Promise(r=>setTimeout(r,30));
  const after=document.getElementById('reserveToday')?.innerText||'';
  return{priority:priorities[0]?.recipe?.name||'',before,after};
 });
 if(result.priority!=='Karotten Test Menü')throw new Error('Smart-Priorities Rezeptzugriff Regression: '+JSON.stringify(result));
 if(!result.before.includes('Test Karotte')||!result.before.includes('Karotten Test Menü'))throw new Error('Heute-Dashboard Initialrender Regression: '+JSON.stringify(result));
 if(result.after.includes('Test Karotte')||!result.after.includes('kein Vorrat besonders dringend'))throw new Error('Heute-Dashboard Aktualisierung Regression: '+JSON.stringify(result));
 if(errors.length)throw new Error('Browserfehler: '+errors.join(' | '));
 console.log('✓ Smart Priorities → Heute-Dashboard → Live-Aktualisierung bestanden',result);
}finally{await browser.close();server.close()}
