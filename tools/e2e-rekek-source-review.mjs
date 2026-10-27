import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=process.cwd();
const server=http.createServer((req,res)=>{
  try { const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1));if(!name||name.includes('..'))throw Error();
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(root,name)));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:390,height:844}}), external=[], mutations=[];
  await context.route('**/*',route=>{const r=route.request();if(r.method()!=='GET')mutations.push(r.url());if(!r.url().startsWith(origin+'/')){external.push(r.url());return route.abort();}return route.continue();});
  const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/rekek-test.html');
  const payload=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,800);x.fillStyle='black';x.font='24px sans-serif';
    ['Prüfrezept','200 g Butter','400 ml Sahne','250 gr. Zucker'].forEach((s,i)=>x.fillText(s,30,70+i*75));
    return c.toDataURL().split(',')[1];
  });
  await page.evaluate(()=>{window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:'Prüfrezept\nZutaten\n2007 Büter\n100 ml dahre\n250.000. Zucker\nZubereitung\nAlles verrühren.',lines:[{text:'2007 Büter',bbox:{x0:30,y0:110,x1:250,y1:155}},{text:'100 ml dahre',bbox:{x0:30,y0:185,x1:250,y1:230}},{text:'250.000. Zucker',bbox:{x0:30,y0:260,x1:280,y1:305}}]}})})};});
  await page.locator('#photos').setInputFiles({name:'review-controls.png',mimeType:'image/png',buffer:Buffer.from(payload,'base64')});
  await page.locator('#submit').click();await page.locator('#results').waitFor({state:'visible'});
  const button=page.locator('#download-reviewed');assert.equal(await button.isDisabled(),true);
  const ingredient=page.locator('.review-field.ingredient').first();
  assert.equal(await ingredient.locator('select').inputValue(),'page-1-line-1');
  await ingredient.getByRole('button',{name:'Quelle anzeigen'}).click();await page.locator('.source-view canvas').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('.source-view canvas').evaluate(c=>[c.width,c.height]),[236,61]);
  // Confirming every field is insufficient until omissions on the full page are checked.
  for(const c of await page.locator('.field-confirm').all())await c.check();assert.equal(await button.isDisabled(),true);
  await page.locator('.page-confirm').check();assert.equal(await button.isEnabled(),true);
  await page.getByRole('button',{name:'Seite 1 ansehen',exact:true}).click();
  assert.ok(Math.abs(await page.locator('.source-view').evaluate(e=>e.getBoundingClientRect().top))<2);
  await page.getByRole('button',{name:'Zur gewählten Angabe',exact:true}).click();
  // Editing any text or section revokes that field and the page completeness assertion.
  await ingredient.locator('textarea').fill('200 g Butter');assert.equal(await ingredient.locator('.field-confirm').isChecked(),false);assert.equal(await page.locator('.page-confirm').isChecked(),false);assert.equal(await button.isDisabled(),true);
  await ingredient.locator('input[type=text]').fill('Teig');await ingredient.locator('.field-confirm').check();await page.locator('.page-confirm').check();
  await ingredient.locator('input[type=text]').fill('Belag');assert.equal(await ingredient.locator('.field-confirm').isChecked(),false);assert.equal(await page.locator('.page-confirm').isChecked(),false);
  // Missing ingredients and removed misclassifications remain auditable.
  await page.getByRole('button',{name:'+ Fehlende Zutat ergänzen',exact:true}).click();const added=page.locator('.review-field.ingredient').last();await added.locator('textarea').fill('1 Ei');
  await page.locator('.review-field.ingredient').nth(2).getByRole('button',{name:'Fehlzuordnung entfernen'}).click();
  await page.getByRole('button',{name:'+ Fehlendes Rezept ergänzen',exact:true}).click();
  assert.equal(await button.isDisabled(),true);
  await page.locator('.recipe').last().getByRole('button',{name:'Diese Rezeptfehlzuordnung entfernen',exact:true}).click();
  for(const c of await page.locator('.field-confirm').all())await c.check();await page.locator('.page-confirm').check();
  const event=page.waitForEvent('download');await button.click();const exported=JSON.parse(fs.readFileSync(await(await event).path(),'utf8'));
  assert.equal(exported.verified,false);assert.equal(exported.review.status,'human_confirmed');assert.equal(exported.review.fallible,true);
  assert.match(exported.pages[0].raw,/2007 Büter/);assert.match(exported.recipes[0].ingredients,/2007 Büter/);
  const fields=exported.review.recipes[0].fields;const corrected=fields.find(f=>f.original==='2007 Büter');assert.equal(corrected.text,'200 g Butter');assert.equal(corrected.section,'Belag');assert.equal(corrected.source.line_id,'page-1-line-1');
  assert.equal(fields.find(f=>f.text==='1 Ei').source.line_id,null);assert.equal(exported.review.excluded_recipes.length,1);assert.equal(exported.review.recipes.length,1);assert.equal(exported.review.removed.length,1);assert.equal(exported.review.removed[0].original,'250.000. Zucker');assert.ok(!JSON.stringify(exported).includes('data:image'));
  // Long OCR/source text and narrow screens must not force horizontal scrolling.
  await ingredient.locator('textarea').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.review-editor img').count(),0);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow at ${width}`);}
  if(process.env.REKEK_UI_SCREENSHOT_DIR){fs.mkdirSync(process.env.REKEK_UI_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.REKEK_UI_SCREENSHOT_DIR,'review-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(process.env.REKEK_UI_SCREENSHOT_DIR,'review-phone.png'),fullPage:true});}
  // Page grouping changes, photo changes and clearing must destroy previous reviews.
  await page.locator('#same-recipe').check();assert.equal(await page.locator('#results').isHidden(),true);assert.equal(await page.locator('#download-reviewed').count(),0);
  await page.locator('#submit').click();await page.locator('#results').waitFor({state:'visible'});assert.equal(await page.locator('.field-confirm:checked').count(),0);
  await page.locator('#clear').click();assert.equal(await page.locator('#recipes img').count(),0);
  // Ambiguous duplicate OCR lines must not silently acquire a source box.
  await page.evaluate(()=>{window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:'Test\nZutaten\n200 g Butter\nZubereitung\nRühren.',lines:[{text:'200 g Butter',bbox:{x0:1,y0:2,x1:20,y1:12}},{text:'200 g Butter',bbox:{x0:1,y0:22,x1:20,y1:32}}]}})})};});
  await page.locator('#photos').setInputFiles({name:'duplicate-lines.png',mimeType:'image/png',buffer:Buffer.from(payload,'base64')});await page.locator('#submit').click();await page.locator('#results').waitFor({state:'visible'});
  assert.equal(await page.locator('.ingredient select').first().inputValue(),'page-1');
  await page.locator('#clear').click();
  // A completely missed page in a mixed upload needs an explicit finding,
  // not just confirmation of the successfully parsed page's fields.
  await page.evaluate(()=>{let count=0;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:count++===0?'Test\nZutaten\n200 g Butter\nZubereitung\nRühren.':'',lines:[]}})})};});
  await page.locator('#photos').setInputFiles([{name:'read.png',mimeType:'image/png',buffer:Buffer.from(payload,'base64')},{name:'missed.png',mimeType:'image/png',buffer:Buffer.from(payload,'base64')}]);await page.locator('#submit').click();await page.locator('#results').waitFor({state:'visible'});
  assert.match(await page.locator('.empty-page-warning').innerText(),/Seite 2: Kein Text erkannt/);
  for(const c of await page.locator('.field-confirm,.page-confirm').all())await c.check();assert.equal(await page.locator('#download-reviewed').isDisabled(),true);
  await page.locator('.page-completeness textarea').fill('Seite 2: Inhalt am Original geprüft und ausdrücklich als unleserlich markiert.');
  for(const c of await page.locator('.field-confirm,.page-confirm').all())await c.check();
  const reviewedEvent=page.waitForEvent('download');await page.locator('#download-reviewed').click();const withFinding=JSON.parse(fs.readFileSync(await(await reviewedEvent).path(),'utf8'));
  assert.equal(withFinding.review.page_findings.length,1);assert.equal(withFinding.review.page_findings[0].source.page_id,'page-2');assert.match(withFinding.review.page_findings[0].text,/unleserlich/);assert.equal(withFinding.verified,false);
  await page.locator('#clear').click();
  assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);
  console.log('Review controls passed: source geometry, conservative attribution, full-page omission gate, edits/sections revoke confirmation, missing/removal audit, immutable raw OCR, fallible export, safe text, 320/390/1280px, reset and no uploads/storage. Controlled OCR, not an accuracy test.');
  // Optional replay of five previously tested handwritten pages. Keep private photos and raw files outside git.
  if(process.env.REKEK_SAVED_PAGE_DIR){
    const folder=process.env.REKEK_SAVED_PAGE_DIR, assembled=JSON.parse(fs.readFileSync(path.join(folder,'assembled.json'),'utf8'));
    for(const id of ['P01','P02','P03','P04','P05']){
      const saved=assembled.find(r=>r.page_id===id&&r.method==='whole');assert.ok(saved);
      await page.goto(origin+'/rekek-test.html');await page.evaluate(raw=>{window.Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:{text:raw,lines:[]}})})};},saved.raw);
      const photo=fs.readdirSync(path.join(folder,'originals')).find(f=>f.startsWith(`${id.slice(1)}-`));assert.ok(photo);
      await page.locator('#photos').setInputFiles(path.join(folder,'originals',photo));await page.locator('#submit').click();await page.locator('#results').waitFor({state:'visible'});
      assert.equal(await page.locator('#download-reviewed').isDisabled(),true);assert.equal(await page.locator('.field-confirm:checked').count(),0);assert.equal(await page.locator('.source-view img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
      assert.ok((await page.locator('#raw-text').textContent()).includes(saved.raw));
      console.log(`${id}: saved whole-page OCR replayed unchanged, original visible, export blocked. No new inference or human confirmation.`);
    }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);
  await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
