import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(),port=4186;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  let pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/')pathname='/index.html';
  const file=path.join(root,pathname.replace(/^\//,''));
  if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('not found');return}
  res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
const listen=()=>new Promise(r=>server.listen(port,'127.0.0.1',r));
const close=()=>new Promise(r=>server.close(r));

await listen();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
try{
  await page.goto(`http://127.0.0.1:${port}/?reserveDiag=0`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.RESERVE_INPUT_GUARD?.version==='1.1'&&window.RESERVE_PERFORMANCE,{timeout:10000});
  await page.evaluate(()=>{try{window.show?.('stock')}catch(_){ }});
  await page.waitForSelector('#scanName',{timeout:10000});
  const result=await page.evaluate(async()=>{
    const input=document.getElementById('scanName');
    const box=document.getElementById('barcodeResult');
    if(box)box.innerHTML='<div class="missing-card"><b>Neues Produkt</b></div>';
    input.value='';input.focus();
    const samples=[];
    for(const ch of 'Joghurt'){
      const started=performance.now();
      input.value+=ch;
      input.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:ch}));
      input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:ch}));
      await new Promise(requestAnimationFrame);
      samples.push(performance.now()-started);
    }
    const refreshStart=performance.now();
    window.refresh?.();
    const refreshBlocking=performance.now()-refreshStart;
    const typed=input.value;
    input.blur();
    return{typed,samples,maxFrame:Math.max(...samples),refreshBlocking,guard:window.RESERVE_INPUT_GUARD?.version};
  });
  if(result.typed!=='Joghurt')throw new Error('Typing regression: '+JSON.stringify(result));
  if(result.maxFrame>250)throw new Error('Input-to-frame budget exceeded: '+JSON.stringify(result));
  if(result.refreshBlocking>100)throw new Error('Refresh blocked while field focused: '+JSON.stringify(result));
  console.log('Input responsiveness OK',JSON.stringify(result));
}finally{
  await browser.close();await close();
}
