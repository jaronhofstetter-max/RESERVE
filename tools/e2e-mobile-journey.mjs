import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)){res.writeHead(403);return res.end();}
  fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('not found');}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b);});
});
await new Promise(r=>server.listen(4174,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4174',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  const first=await page.evaluate(()=>({stock:JSON.parse(localStorage.getItem('reserveStock')||'[]').length,onboarding:!!document.getElementById('onboarding')?.textContent.trim(),width:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(first.stock!==0||!first.onboarding||first.width>first.viewport+2)throw Error('Mobile first-run regression: '+JSON.stringify(first));

  const nav=await page.evaluate(()=>Array.from(document.querySelectorAll('button,a')).filter(el=>{const t=(el.textContent||'').trim().toLowerCase();return t.includes('vorrat')||t.includes('profil')||t.includes('einkauf')||t.includes('rezepte')||t.includes('plan');}).map(el=>({text:(el.textContent||'').trim(),w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})).filter(x=>x.w>0&&x.h>0));
  if(nav.length<3)throw Error('Mobile Navigation nicht ausreichend sichtbar: '+JSON.stringify(nav));

  const controls=await page.evaluate(()=>Array.from(document.querySelectorAll('button,input,select,textarea')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}).map(el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,w:r.width,h:r.height,left:r.left,right:r.right};}));
  const clipped=controls.filter(x=>x.left<-2||x.right>innerWidth+2);
  if(clipped.length)throw Error('Mobile Bedienelemente abgeschnitten: '+JSON.stringify(clipped.slice(0,5)));

  const state=await page.evaluate(()=>{
    stock=[{n:'Reis',q:'500 g',e:'2030-12-31'}];
    shopping=[{n:'Tomaten',q:'2 Stück'}];
    localStorage.setItem('reserveStock',JSON.stringify(stock));
    localStorage.setItem('reserveShopping',JSON.stringify(shopping));
    if(typeof refresh==='function')refresh();
    return{stock:JSON.parse(localStorage.getItem('reserveStock')).length,shopping:JSON.parse(localStorage.getItem('reserveShopping')).length,recipes:Array.isArray(recipes)?recipes.length:0};
  });
  if(state.stock!==1||state.shopping!==1||state.recipes<100)throw Error('Mobile journey state regression: '+JSON.stringify(state));

  const after=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,body:document.body.scrollWidth}));
  if(after.width>after.viewport+2||after.body>after.viewport+2)throw Error('Horizontales Mobile-Overflow: '+JSON.stringify(after));
  if(errors.length)throw Error('Browserfehler: '+errors.join(' | '));
  console.log('✓ Mobile first-run ohne Demo-Vorrat');
  console.log('✓ Mobile Navigation sichtbar');
  console.log('✓ Mobile Bedienelemente nicht horizontal abgeschnitten');
  console.log('✓ Vorrat/Einkauf/Rezeptdaten im Smartphone-Viewport aktiv');
  console.log('✓ Kein horizontaler Seiten-Overflow');
} finally {
  await browser.close();
  server.close();
}
