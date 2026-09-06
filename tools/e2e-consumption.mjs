import { chromium } from 'playwright';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);if(!f.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('not found')}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b)})});
await new Promise(r=>server.listen(4174,'127.0.0.1',r));
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4174',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.RESERVE_CONSUMPTION?.recordBatch&&window.RESERVE_PANTRY_INTELLIGENCE?.quantityForecast&&window.RESERVE_STOCK_PROTECTION);
 const result=await page.evaluate(()=>{
   localStorage.removeItem('reserveConsumptionHistoryV1');
   const now=Date.now(),day=86400000;
   [21,14,7,0].forEach(d=>RESERVE_CONSUMPTION.record({name:'Lernreis',amount:100,unit:'g',source:'cooking',at:new Date(now-d*day).toISOString()}));
   stock=[{n:'Lernreis',q:'800 g',e:'2030-01-01',reserveQty:100,reserve:false}];
   localStorage.setItem('reserveStock',JSON.stringify(stock));
   const learned=RESERVE_CONSUMPTION.forecast('Lernreis','g',7,90);
   const row=RESERVE_PANTRY_INTELLIGENCE.quantityForecast(7).find(x=>x.name==='Lernreis');
   RESERVE_PANTRY_INTELLIGENCE.renderCoverage();
   const text=document.getElementById('stockCoverage')?.innerText||'';
   return{learned,row:row?{normal:row.normal,protected:row.protected,confidence:row.learned?.confidence,coverage:row.normalCoverageDays,runout:row.estimatedRunout}:null,text};
 });
 if(!result.learned?.known||result.learned.events!==4||result.learned.confidence!=='medium')throw new Error('Verbrauchslernen Regression: '+JSON.stringify(result));
 if(result.row?.normal!==700||result.row?.protected!==100||result.row?.confidence!=='medium'||!Number.isFinite(result.row?.coverage)||result.row.coverage<=0)throw new Error('Reichweitenprognose Regression: '+JSON.stringify(result));
 if(!result.text.includes('Lernreis')||!result.text.includes('Normalbestand reicht voraussichtlich')||!result.text.includes('Mittlere Datensicherheit'))throw new Error('Reichweiten-UI Regression: '+JSON.stringify(result));
 if(errors.length)throw new Error('Browserfehler: '+errors.join(' | '));
 console.log('✓ Verbrauchslernen bestanden',result.learned);
 console.log('✓ Reichweitenprognose bestanden',result.row);
 console.log('✓ Reichweitenanzeige bestanden');
}finally{await browser.close();server.close()}
