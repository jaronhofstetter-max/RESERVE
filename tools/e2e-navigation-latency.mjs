import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(),port=4196;
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
  await page.waitForFunction(()=>window.RESERVE_PERFORMANCE&&window.RESERVE_CABINET);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{
    stock=Array.from({length:33},(_,i)=>({n:'Penne '+i,q:'500 g',c:'Getreide & Beilagen'}));
    recipes=Array.from({length:3000},(_,i)=>({id:'stress-'+i,name:'Pasta '+i,mealTimes:[currentMeal()],diet:'Alles',type:'Hauptmahlzeit',cuisine:'Test',difficulty:'Einfach',prepMinutes:5,cookMinutes:10,ingredients:[{name:'Pasta',amount:100,unit:'g'}],steps:[],nutrition:{}}));
  });
  const measurements=await page.evaluate(async()=>{
    const result=[];
    for(const id of ['home','stock','search','home','shopping','stock']){
      const start=performance.now();
      document.querySelector(`nav .tab[onclick*="'${id}'"]`).click();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      result.push({id,ms:performance.now()-start,active:document.querySelector('.panel.active')?.id});
    }
    return result;
  });
  for(const x of measurements){if(x.active!==x.id||x.ms>1000)throw new Error('Navigation stalled: '+JSON.stringify(x))}
  console.log('Navigation at 4x CPU slowdown, 3000 recipes / 33 pantry rows:',JSON.stringify(measurements));
}finally{await browser.close();await close()}
