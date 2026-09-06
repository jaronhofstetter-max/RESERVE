import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=createServer(async(req,res)=>{try{const p=join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));const b=await readFile(p);res.writeHead(200,{'content-type':types[extname(p)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end('not found')}});
await new Promise(r=>server.listen(4175,'127.0.0.1',r));
const browser=await chromium.launch({headless:true}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.RESERVE_AUTOPILOT_V2?.version==='2.5');
 const result=await page.evaluate(()=>{
  const api=window.RESERVE_AUTOPILOT_V2;
  const choices=api.cookChoices();
  const labels=choices.map(x=>x.label);
  const unique=new Set(choices.map(x=>x.recipe.id)).size===choices.length;
  const reserveProtected=api.horizon(30).items.every(x=>!(x.reserveWouldBeNeeded&&x.normal<0));
  return{labels,unique,reserveProtected,count:choices.length};
 });
 if(result.count>3)throw new Error(`Expected at most 3 cook choices, got ${result.count}`);
 if(!result.unique)throw new Error('Cook choices must not duplicate the same recipe');
 if(result.count&&result.labels[0]!=='Beste Wahl')throw new Error('First decision must be Beste Wahl');
 if(!result.reserveProtected)throw new Error('Protected reserve invariant failed');
 if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
 console.log('Autopilot v2.5 decision regression OK',result);
}finally{await browser.close();server.close();}
