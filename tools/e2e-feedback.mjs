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
await new Promise(r=>server.listen(4175,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const opened=[];
  await page.addInitScript(()=>{
    const answers=['2','Mehr Übersicht beim Wochenplan'];
    window.prompt=()=>answers.shift()??null;
    window.open=(url)=>{window.__reserveFeedbackUrl=String(url);return null;};
  });
  await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
  const button=page.locator('#reserve-feedback-button');
  if(await button.count()!==1)throw Error('Feedback button fehlt');
  if(!(await button.isVisible()))throw Error('Feedback button ist nicht sichtbar');
  const box=await button.boundingBox();
  if(!box||box.x<0||box.x+box.width>390)throw Error('Feedback button im Smartphone-Viewport abgeschnitten');
  await button.click();
  const url=await page.evaluate(()=>window.__reserveFeedbackUrl||'');
  opened.push(url);
  if(!url.includes('github.com/jaronhofstetter-max/RESERVE/issues/new'))throw Error('Feedback-Ziel ist falsch: '+url);
  const parsed=new URL(url);
  if(!parsed.searchParams.get('title')?.includes('[RESERVE Idee]'))throw Error('Feedback-Typ fehlt');
  if(!parsed.searchParams.get('body')?.includes('Mehr Übersicht beim Wochenplan'))throw Error('Feedback-Beschreibung fehlt');
  console.log('✓ Feedback-Einstieg sichtbar und mobil nutzbar');
  console.log('✓ Problem/Idee erzeugt vorbereiteten GitHub-Issue-Entwurf');
} finally {
  await browser.close();
  server.close();
}
