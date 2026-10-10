import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.cwd(),server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=url.pathname==='/'?'index.html':url.pathname.slice(1);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(root+'/'+file))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>{const texts=['Gemüsetopf\nFür 2 Portionen\nZutaten\n200 g\nKarotten','1 bis 2 Prisen Salz\nSchritt-für-Schritt-Kochen\nleicht gemacht! Zum\nStarten antippen.','Zubereitung\nSchritt 1\nGemüse schneiden.\nSchritt 2\nGaren.\nErfasst von: Testautor'];let i=0;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:texts[i++]||''}}),terminate:async()=>{}})};});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES&&window.RESERVE_REKEK);
 const result=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const blob=await new Promise(r=>canvas.toBlob(r));
  await RESERVE_PERSONAL_RECIPES.importScreenshots(Array.from({length:3},(_,i)=>new File([blob],'page-'+i+'.png',{type:'image/png'})));
  const get=id=>document.getElementById(id),out={version:RESERVE_REKEK.version,name:get('personalName').value,ingredients:get('personalIngredients').value,steps:get('personalSteps').value,warning:get('personalUncertain').textContent,rangeUncertain:RESERVE_RECIPE_PARSER.ingredient('1 bis 2 Prisen Salz').uncertain};
  RESERVE_PERSONAL_RECIPES.edit();out.newWarning=get('personalUncertain').textContent;out.newIngredients=get('personalIngredients').value;return out;
 });
 assert.equal(result.version,'0.3.0');assert.equal(result.name,'Gemüsetopf');assert.equal(result.ingredients,'200 g Karotten\n1 bis 2 Prisen Salz');assert.equal(result.steps,'Gemüse schneiden.\nGaren.');assert.ok(result.rangeUncertain);assert.match(result.warning,/1 Zutat/);assert.ok(!result.warning.includes('Prisen'));assert.equal(result.newWarning,'');assert.equal(result.newIngredients,'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 console.log('REKEK mobile import: split quantities, ranges, page noise, steps, concise warning and fresh editor OK. Mock OCR, not photo accuracy.');
}finally{await browser.close();server.close();}
