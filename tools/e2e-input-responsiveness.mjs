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
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve(performance.now())));
    const measureField=async(input,text)=>{
      input.value='';input.focus();
      const sync=[],frames=[];
      for(const ch of text){
        const t0=performance.now();
        input.value+=ch;
        input.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:ch}));
        input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:ch}));
        const t1=performance.now();
        sync.push(t1-t0);
        const frame=await nextFrame();frames.push(frame-t1);
      }
      return{value:input.value,sync,frames,maxSync:Math.max(...sync),maxFrame:Math.max(...frames)};
    };

    // Headless mobile Chromium can throttle animation frames. Measure a plain field
    // in the same document so the regression gate judges RESERVE overhead, not CI cadence.
    const baseline=document.createElement('input');baseline.id='reservePerfBaseline';baseline.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01';document.body.appendChild(baseline);
    const baselineResult=await measureField(baseline,'Joghurt');baseline.remove();

    const input=document.getElementById('scanName');
    const box=document.getElementById('barcodeResult');
    if(box)box.innerHTML='<div class="missing-card"><b>Neues Produkt</b></div>';
    const scanResult=await measureField(input,'Joghurt');

    const refreshStart=performance.now();window.refresh?.();const refreshBlocking=performance.now()-refreshStart;
    const frameOverhead=Math.max(0,scanResult.maxFrame-baselineResult.maxFrame);
    input.blur();
    return{baseline:baselineResult,scan:scanResult,frameOverhead,refreshBlocking,guard:window.RESERVE_INPUT_GUARD?.version};
  });
  if(result.scan.value!=='Joghurt')throw new Error('Typing regression: '+JSON.stringify(result));
  if(result.scan.maxSync>80)throw new Error('Synchronous input handlers exceed budget: '+JSON.stringify(result));
  if(result.frameOverhead>150)throw new Error('RESERVE frame overhead exceeds baseline budget: '+JSON.stringify(result));
  if(result.refreshBlocking>100)throw new Error('Refresh blocked while field focused: '+JSON.stringify(result));
  console.log('Input responsiveness OK',JSON.stringify(result));
}finally{
  await browser.close();await close();
}
