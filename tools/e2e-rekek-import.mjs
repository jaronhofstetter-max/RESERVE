import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.cwd(),server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=url.pathname==='/'?'index.html':url.pathname.slice(1);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(root+'/'+file))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>{const texts=['Gemüsetopf\nFür 2 Portionen\nZutaten\n200 g\nKarotten','1 bis 2 Prisen Salz\nSchritt-für-Schritt-Kochen\nleicht gemacht! Zum\nStarten antippen.','Zubereitung\nSchritt 1\nGemüse schneiden.\nSchritt 2\nGaren.\nErfasst von: Testautor'];let i=0;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:texts[i++]||''}}),terminate:async()=>{}})};});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES&&window.RESERVE_REKEK);
 const result=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();document.getElementById('personalSameRecipe').checked=true;const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const blob=await new Promise(r=>canvas.toBlob(r));
  await RESERVE_PERSONAL_RECIPES.importScreenshots(Array.from({length:3},(_,i)=>new File([blob],'page-'+i+'.png',{type:'image/png'})));
  const get=id=>document.getElementById(id),out={version:RESERVE_REKEK.version,name:get('personalName').value,ingredients:get('personalIngredients').value,steps:get('personalSteps').value,warning:get('personalUncertain').textContent,rangeUncertain:RESERVE_RECIPE_PARSER.ingredient('1 bis 2 Prisen Salz').uncertain};
  RESERVE_PERSONAL_RECIPES.edit();document.getElementById('personalSameRecipe').checked=true;out.newWarning=get('personalUncertain').textContent;out.newIngredients=get('personalIngredients').value;return out;
 });
 assert.equal(result.version,'0.6.10');assert.equal(result.name,'Gemüsetopf');assert.equal(result.ingredients,'200 g Karotten\n1 bis 2 Prisen Salz');assert.equal(result.steps,'Gemüse schneiden.\nGaren.');assert.ok(result.rangeUncertain);assert.match(result.warning,/1 Zutat/);assert.ok(!result.warning.includes('Prisen'));assert.equal(result.newWarning,'');assert.equal(result.newIngredients,'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 const separated=await page.evaluate(()=>{
  RESERVE_PERSONAL_RECIPES.applyText('Gemüsepfanne\nZutaten: 250 g Gemüse\n2 EL Öl\nGemüse schneiden.\nIn Öl braten.');
  return {ingredients:document.getElementById('personalIngredients').value,steps:document.getElementById('personalSteps').value,confirmed:document.getElementById('personalConfirmed').checked};
 });
 assert.equal(separated.ingredients,'250 g Gemüse\n2 EL Öl');assert.equal(separated.steps,'Gemüse schneiden.\nIn Öl braten.');assert.equal(separated.confirmed,false);
 const focused=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();const canvas=document.createElement('canvas');canvas.width=240;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#465a50';ctx.fillRect(0,0,240,360);ctx.fillStyle='#fff';ctx.fillRect(25,70,190,230);const blob=await new Promise(r=>canvas.toBlob(r));
  const text='Gemüsepfanne\nFür 2 Portionen\nZutaten\n400 g Gemüse\n2 EL Öl\nSalz\nZubereitung\nGemüse schneiden.\nIn Öl braten.';let calls=0;const languages=[];
  window.Tesseract={createWorker:async language=>{languages.push(language);return{setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:calls++===0?text:text.replace('Für 2 Portionen','Für 12 Portionen')}})}}};
  await RESERVE_PERSONAL_RECIPES.importScreenshots([new File([blob],'synthetic-inset-card.png',{type:'image/png'})]);
  return{calls,languages,portions:document.getElementById('personalPortions').value,ingredients:document.getElementById('personalIngredients').value,steps:document.getElementById('personalSteps').value,status:document.getElementById('personalStatus').textContent,evidence:document.getElementById('personalOCREvidence').value,confirmed:document.getElementById('personalConfirmed').checked};
 });
 assert.equal(focused.calls,3);assert.deepEqual(focused.languages,['deu+eng','deu']);assert.equal(focused.portions,'2');assert.equal(focused.ingredients,'400 g Gemüse\n2 EL Öl\nSalz');assert.equal(focused.steps,'Gemüse schneiden.\nIn Öl braten.');assert.match(focused.status,/Abweichende Portionslesart/);assert.match(focused.evidence,/Für 12 Portionen/);assert.equal(focused.confirmed,false);
 const printed=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();const canvas=document.createElement('canvas');canvas.width=80;canvas.height=100;canvas.getContext('2d').fillRect(0,0,80,100);const blob=await new Promise(r=>canvas.toBlob(r));
  const text='Mandel-Rezept\nTeig: 250 g Mehl, 90 g Zucker\n1 Ei\nBelag: 3 Eßlöffel Wasser\n150 g Nüsse\nWasser aufkochen. Nüsse untermischen.';const languages=[];let calls=0;
  window.Tesseract={createWorker:async language=>{languages.push(language);return{setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:++calls===1?'OCR noise\n'+text:'irrelevant page '+calls+' !\n'+text}})}}};
  await RESERVE_PERSONAL_RECIPES.importScreenshots([new File([blob],'synthetic-printed.png',{type:'image/png'})]);
  return{calls,languages,name:document.getElementById('personalName').value,ingredients:document.getElementById('personalIngredients').value,steps:document.getElementById('personalSteps').value,confirmed:document.getElementById('personalConfirmed').checked};
 });
 assert.equal(printed.calls,3);assert.deepEqual(printed.languages,['deu+eng','deu']);assert.equal(printed.name,'Mandel-Rezept');assert.equal(printed.ingredients,'250 g Mehl\n90 g Zucker\n1 Ei\n3 Eßlöffel Wasser\n150 g Nüsse');assert.equal(printed.steps,'Wasser aufkochen. Nüsse untermischen.');assert.equal(printed.confirmed,false);
 const contextReview=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();const canvas=document.createElement('canvas');canvas.width=360;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,360,400);ctx.fillStyle='#000';ctx.font='20px sans-serif';
  const words=['Mändeln','Eßlöffei','EBlöffel','Rutter','unte mischen'];const rows=words.map((text,i)=>{const y=50+i*50;ctx.fillText(text,20,y);return{text,bbox:{x0:20,y0:y-20,x1:180,y1:y},words:text.split(' ').map((text,j)=>({text,bbox:{x0:20+j*75,y0:y-20,x1:95+j*75,y1:y}}))};});
  const text='Probe-Rezept\nTeig: 200 g Butter\n150 g Mändeln\nBelag: 4 Eßlöffei Wasser\n7 EBlöffel Marmelade\nWasser und Rutter aufkochen.\nMandeln unte mischen.\n20 - 30 Min. bei 180° backen.';
  window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text,confidence:60,lines:rows}})})};
  const blob=await new Promise(r=>canvas.toBlob(r));await RESERVE_PERSONAL_RECIPES.importScreenshots([new File([blob],'synthetic-word-review.png',{type:'image/png'})]);
  return{ingredients:document.getElementById('personalIngredients').value,steps:document.getElementById('personalSteps').value,raw:document.getElementById('personalRaw').value,confirmed:document.getElementById('personalConfirmed').checked};
 });
 assert.match(contextReview.ingredients,/Mändeln/);assert.match(contextReview.steps,/Rutter/);assert.equal(contextReview.confirmed,false);
 const contextHost=page.locator('#personalContextReview');assert.equal(await contextHost.locator('.personal-word-review').count(),5);assert.equal(await contextHost.locator('img').count(),5);
 await page.locator('#personalConfirmed').check();
 await contextHost.locator('.personal-word-review').filter({hasText:'Rutter → Butter'}).getByRole('button',{name:'Vorschlag übernehmen',exact:true}).click();
 assert.equal(await page.locator('#personalConfirmed').isChecked(),false);assert.match(await page.locator('#personalSteps').inputValue(),/Butter aufkochen/);assert.equal(await page.locator('#personalRaw').inputValue(),contextReview.raw);
 await contextHost.locator('.personal-word-review').filter({hasText:'Mändeln → Mandeln'}).getByRole('button',{name:'Original beibehalten',exact:true}).click();assert.match(await page.locator('#personalIngredients').inputValue(),/Mändeln/);
 while(await contextHost.getByRole('button',{name:'Vorschlag übernehmen',exact:true}).count())await contextHost.getByRole('button',{name:'Vorschlag übernehmen',exact:true}).first().click();
 const reviewedSteps=await page.locator('#personalSteps').inputValue(),reviewedIngredients=await page.locator('#personalIngredients').inputValue();assert.match(reviewedSteps,/Mandeln untermischen/);assert.match(reviewedSteps,/20 - 30 Min\. bei 180°/);assert.deepEqual(reviewedIngredients.match(/\d+/g),contextReview.ingredients.match(/\d+/g));assert.equal(await page.locator('#personalConfirmed').isChecked(),false);
 await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.edit());assert.equal(await contextHost.isVisible(),false);assert.equal(await contextHost.locator('img').count(),0);
 const textured=await page.evaluate(async()=>{
  RESERVE_PERSONAL_RECIPES.edit();const canvas=document.createElement('canvas');canvas.width=500;canvas.height=600;const ctx=canvas.getContext('2d');ctx.fillStyle='#aaa';ctx.fillRect(0,0,500,600);ctx.fillStyle='#000';ctx.font='24px sans-serif';
  const texts=['Sommercreme','Zutaten','2 Becher Sahne','180 g Zucker','2 Vanillinzucker','Alles verrühren.','Über Nacht kühl stellen.','Fertig'],ys=[30,100,150,190,230,300,340,400],rows=texts.map((text,i)=>{ctx.fillText(text,80,ys[i]+24);let x=80;const words=text.split(' ').map(text=>{const w={text,bbox:{x0:x,y0:ys[i],x1:x+Math.max(12,text.length*10),y1:ys[i]+24}};x=w.bbox.x1+12;return w;});return{text,words,bbox:{x0:80,y0:ys[i],x1:x,y1:ys[i]+24}};});
  const blob=await new Promise(r=>canvas.toBlob(r)),file=new File([blob],'synthetic-texture.png',{type:'image/png'}),outputs=['HR',texts.join('\n'),'Sommercreme','Sommercreme','Zutaten\n2 Becher Sahne\n180 g Zucker\n2 Vanillinzucker','Zutaten\n2 Becher Sahne\n180 g Zucker\n2 Vanillinzucker','Alles verrühren. |\nÜber Nacht kühl stellen. |','Alles verrühren. |\nÜber Nacht kühl stellen. |'];
  let calls=0;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>{const n=calls++;return{data:{text:outputs[n]||'',lines:n===1?rows:[]}};}})};await RESERVE_PERSONAL_RECIPES.importScreenshots([file]);
  const get=id=>document.getElementById(id),out={calls,name:get('personalName').value,ingredients:get('personalIngredients').value,steps:get('personalSteps').value,cook:get('personalCook').value,portions:get('personalPortions').value,confirmed:get('personalConfirmed').checked,evidence:get('personalOCREvidence').value};
  RESERVE_PERSONAL_RECIPES.edit();calls=0;outputs[5]=outputs[5].replace('180 g','900 g');await RESERVE_PERSONAL_RECIPES.importScreenshots([file]);out.conflictingIngredients=get('personalIngredients').value;out.conflictingName=get('personalName').value;return out;
 });
 assert.equal(textured.calls,8);assert.equal(textured.name,'Sommercreme');assert.equal(textured.ingredients,'2 Becher Sahne\n180 g Zucker\n2 Vanillinzucker');assert.equal(textured.steps,'Alles verrühren.\nÜber Nacht kühl stellen.');assert.equal(textured.cook,'');assert.equal(textured.portions,'');assert.equal(textured.confirmed,false);assert.match(textured.evidence,/Original OCR:/);assert.equal(textured.conflictingIngredients,'');assert.equal(textured.conflictingName,'HR');
 console.log('REKEK mobile import: split quantities, ranges, page noise, fresh editor and focused OCR serving conflict preserved for review. Mock OCR, not photo accuracy.');
}finally{await browser.close();server.close();}

