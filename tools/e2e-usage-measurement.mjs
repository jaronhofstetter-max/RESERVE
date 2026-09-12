import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd();
const port=4176;
const server=http.createServer((req,res)=>{
  const rel=(req.url||'/').split('?')[0]==='/'?'index.html':decodeURIComponent((req.url||'').split('?')[0].replace(/^\//,''));
  const file=path.join(root,rel);
  if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){
    res.writeHead(404);res.end('not found');return;
  }
  const ext=path.extname(file);
  const type=ext==='.js'||ext==='.mjs'?'text/javascript':ext==='.json'?'application/json':'text/html';
  res.writeHead(200,{'content-type':type});
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.reserveUsageMeasurementV1?.version==='2.0');

  await page.evaluate(()=>{
    localStorage.setItem('reserveOnboardingDone','1');
    localStorage.setItem('reserveStock',JSON.stringify([{name:'Test',amount:1,unit:'Stück'}]));

    const recipes=document.createElement('button');
    recipes.id='usage-test-recipes';
    recipes.textContent='Rezepte';
    document.body.appendChild(recipes);
    recipes.click();

    const scan=document.createElement('button');
    scan.id='usage-test-scan';
    scan.setAttribute('aria-label','Barcode scannen');
    document.body.appendChild(scan);
    scan.click();

    const add=document.createElement('button');
    add.id='scanAdd';
    add.textContent='Produkt hinzufügen';
    document.body.appendChild(add);
    add.click();

    const feedback=document.createElement('button');
    feedback.id='reserve-feedback-button';
    feedback.textContent='Feedback';
    document.body.appendChild(feedback);
    feedback.click();
  });

  await page.waitForTimeout(900);
  const summary=await page.evaluate(()=>window.reserveUsageMeasurementV1.getSummary());
  if(summary.version!==2)throw new Error('usage metrics version missing');
  if(summary.sessions<1)throw new Error('session was not counted');
  if(summary.onboardingCompleted!==true)throw new Error('onboarding milestone was not detected');
  if(summary.firstStockCreated!==true)throw new Error('first stock milestone was not detected');
  if(summary.activated!==true)throw new Error('pilot activation was not detected');
  if((summary.sectionVisits?.rezepte||0)<1)throw new Error('recipe section visit was not counted');
  if((summary.barcodeScans||0)<1)throw new Error('barcode scan usage was not counted');
  if((summary.barcodeAdds||0)<1)throw new Error('barcode add usage was not counted');
  if((summary.feedbackOpened||0)<1)throw new Error('feedback usage was not counted');

  const raw=await page.evaluate(()=>localStorage.getItem('reserveUsageMetricsV1')||'');
  if(/Test|reserveStock|allerg|ingredient|email/i.test(raw))throw new Error('usage metrics contain disallowed user content');

  console.log('Usage measurement v2 pilot metrics E2E passed');
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
