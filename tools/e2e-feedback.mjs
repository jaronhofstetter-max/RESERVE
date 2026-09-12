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
  await page.addInitScript(()=>{
    const answers=['1','Barcode wurde nicht erkannt','Barcode'];
    window.prompt=()=>answers.shift()??null;
    window.open=(url)=>{window.__reserveFeedbackUrl=String(url);return null;};
  });
  await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
  const button=page.locator('#reserve-feedback-button');
  if(await button.count()!==1)throw Error('Feedback button fehlt');
  if(!(await button.isVisible()))throw Error('Feedback button ist nicht sichtbar');
  const box=await button.boundingBox();
  if(!box||box.x<0||box.x+box.width>390||box.y<0||box.y+box.height>844)throw Error('Feedback button im Smartphone-Viewport abgeschnitten');
  if(box.y+box.height>790)throw Error('Feedback button liegt zu tief und kann die mobile Navigation überdecken');
  await button.click();
  const url=await page.evaluate(()=>window.__reserveFeedbackUrl||'');
  if(!url.includes('github.com/jaronhofstetter-max/RESERVE/issues/new'))throw Error('Feedback-Ziel ist falsch: '+url);
  const parsed=new URL(url);
  if(!parsed.searchParams.get('title')?.includes('[RESERVE Pilot Problem]'))throw Error('Pilot-Feedback-Typ fehlt');
  const body=parsed.searchParams.get('body')||'';
  if(!body.includes('Barcode wurde nicht erkannt'))throw Error('Feedback-Beobachtung fehlt');
  if(!body.includes('**Bereich:** Barcode'))throw Error('Feedback-Bereich fehlt');
  if(!body.includes('Viewport: 390×844'))throw Error('Viewport-Kontext fehlt');
  console.log('✓ Pilot-Feedback mobil sichtbar ohne Bottom-Nav-Überdeckung');
  console.log('✓ Reibung, Bereich und technischer Kontext landen im vorbereiteten Issue');
} finally {
  await browser.close();
  server.close();
}
