// Customer manual entry, persistence and regression checks. No OCR fixtures or remote model calls.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(body);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],readerRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',req=>{if(/(?:tesseract|rekek-|recipe-vision|personal-recipe-pdf)/i.test(req.url()))readerRequests.push(req.url());});
await page.route('https://**',route=>route.abort());
await page.addInitScript(()=>{if(!localStorage.getItem('reserveStock'))localStorage.setItem('reserveStock',JSON.stringify([{n:'Reis',q:'500 g'},{n:'Eier',q:'2 Stück'}]));});
const openBook=async()=>{await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RESERVE_PERSONAL_RECIPES);await page.locator('#personalRecipesHome').click();};
const save=async()=>{await page.locator('#personalConfirmed').check();await page.locator('#personalReview button[type=submit]').click();await page.locator('#personalRecipePage.active').waitFor();};
try{
 await openBook();await page.locator('#personalNew').click();
 assert.equal(await page.locator('#personalScreenshot,#personalPDF,#personalRecipeCamera,#personalDigitTest,#personalDraftImport,#personalParseText').count(),0);
 assert.equal(await page.evaluate(()=>typeof RESERVE_PERSONAL_RECIPES.importScreenshots),'undefined');
 assert.equal(await page.evaluate(()=>typeof RESERVE_PERSONAL_RECIPES.importREKEKDraft),'undefined');
 // A partially entered first ingredient survives leaving/reloading even without a title.
 await page.locator('#personalIngredientName').fill('Reis');await page.locator('#personalIngredientAmount').fill('200');await page.locator('#personalIngredientUnit').fill('g');
 await openBook();await page.locator('#personalResume').click();
 assert.equal(await page.locator('#personalIngredientName').inputValue(),'Reis');
 assert.equal(await page.locator('#personalIngredientAmount').inputValue(),'200');
 assert.equal(await page.locator('#personalIngredientUnit').inputValue(),'g');
 await page.locator('#personalAddIngredient').click();
 assert.equal(await page.locator('#personalIngredients').inputValue(),'200 g Reis');
 await page.locator('#personalName').fill('Meine Reispfanne');await page.locator('#personalPortions').fill('2');
 await page.locator('#personalIngredientAmount').fill('2');await page.locator('#personalIngredientUnit').fill('Stück');await page.locator('#personalIngredientName').fill('Eier');await page.locator('#personalAddIngredient').click();
 await page.locator('#personalSteps').fill('Reis garen.\nEier hinzufügen.');
 // A started but not added ingredient must never disappear silently on save.
 await page.locator('#personalIngredientName').fill('Salz');await page.locator('#personalConfirmed').check();await page.locator('#personalReview button[type=submit]').click();
 assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records().length),0);
 assert.match(await page.locator('#personalStatus').textContent(),/angefangene Zutat/);
 await page.locator('#personalIngredientName').fill('');await save();
 const id=await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records()[0].id);
 assert.equal(await page.evaluate(id=>recipes.find(r=>r.id===id).ingredients[0].amount,id),100);
 // Dish photos remain available; they are never read as recipes.
 const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').fillRect(0,0,32,32);return c.toDataURL().split(',')[1];}),'base64');
 await page.locator('#personalPhotoGallery').click();await page.locator('#personalGallery').setInputFiles({name:'dish.png',mimeType:'image/png',buffer});await page.locator('.personal-hero').waitFor();
 await openBook();await page.evaluate(id=>RESERVE_PERSONAL_RECIPES.view(id),id);await page.locator('.personal-hero').waitFor();
 // Edit draft survives reload and updates the same stored recipe instead of duplicating it.
 await page.locator('#personalEdit').click();await page.locator('#personalName').fill('Reispfanne bearbeitet');
 await openBook();await page.locator('#personalResume').click();assert.equal(await page.locator('#personalName').inputValue(),'Reispfanne bearbeitet');
 assert.equal(await page.locator('#personalConfirmed').isChecked(),false);await save();
 assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records().length),1);
 assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records()[0].id),id);
 await page.locator('[data-personal-step]').nth(0).check();await page.locator('[data-personal-step]').nth(1).check();await page.locator('#personalFinish').click();
 await page.waitForFunction(()=>document.getElementById('personalFinishStatus')?.textContent==='Vorrat aktualisiert.');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('reserveStock')).find(x=>x.n==='Reis').q),'400 g');
 // Unmeasured packaging is saveable but never turned into guessed grams.
 await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.open());await page.locator('#personalNew').click();
 await page.locator('#personalName').fill('Eigenes <img src=x onerror=alert(1)>');await page.locator('#personalPortions').fill('2');
 await page.locator('#personalIngredients').fill('1 Becher Schmand');await page.locator('#personalSteps').fill('Alles verrühren.');await save();
 assert.equal(await page.locator('#personalFinish').isDisabled(),true);
 assert.equal(await page.locator('#personalRecipeDetail img').count(),0);
 assert.match(await page.locator('#personalRecipeDetail').textContent(),/1 Becher Schmand/);
 // Unicode mixed fractions entered through the helper keep their original text.
 await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.open());await page.locator('#personalNew').click();
 await page.locator('#personalIngredientAmount').fill('1½');await page.locator('#personalIngredientUnit').fill('EL');await page.locator('#personalIngredientName').fill('Olivenöl');await page.locator('#personalAddIngredient').click();
 assert.equal(await page.locator('#personalIngredients').inputValue(),'1½ EL Olivenöl');
 await page.locator('#personalName').fill('Ölrezept');await page.locator('#personalPortions').fill('2');await page.locator('#personalSteps').fill('Öl einrühren.');await save();
 assert.equal(await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.records().find(r=>r.name==='Ölrezept').ingredientLines[0]),'1½ EL Olivenöl');
 // Existing draft schema (without helper fields) stays readable, including old raw text.
 await page.evaluate(()=>localStorage.setItem('reservePersonalRecipeDraftsV1',JSON.stringify([{key:'new',updatedAt:new Date().toISOString(),fields:{personalName:'Alter Entwurf',personalPortions:'2',personalIngredients:'100 g Reis',personalSteps:'Reis garen.',personalDiet:'Alles',personalRaw:'Bisheriger ungespeicherter Text'}}])));
 await openBook();await page.locator('#personalResume').click();assert.equal(await page.locator('#personalName').inputValue(),'Alter Entwurf');
 assert.equal(await page.locator('#personalIngredientName').inputValue(),'');assert.equal(await page.locator('#personalLegacyText').isVisible(),true);await save();
 // Full cookbook export keeps records and dish photos; restore round trip preserves IDs.
 await page.evaluate(()=>RESERVE_PERSONAL_RECIPES.open());const downloadPromise=page.waitForEvent('download');await page.locator('#personalExport').click();const download=await downloadPromise;
 const bundle=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(bundle.recipes.length,4);assert.ok(bundle.photos[id].startsWith('data:image/jpeg;base64,'));
 assert.equal(await page.evaluate(()=>RESERVE_SYNC.validate(RESERVE_SYNC.snapshot())),null);
 await page.locator('#personalRestore').click();page.once('dialog',dialog=>dialog.accept());
 await page.locator('#personalRestoreFile').setInputFiles({name:'cookbook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
 await page.waitForFunction(()=>RESERVE_PERSONAL_RECIPES.records().length===4);
 assert.equal(await page.evaluate(()=>new Set(RESERVE_PERSONAL_RECIPES.records().map(r=>r.id)).size),4);
 await page.locator('#personalSearch').fill('Alter Entwurf');assert.equal(await page.locator('.personal-tile').count(),1);
 await page.locator('#personalSearch').fill('');await page.locator('#personalNew').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 fs.mkdirSync('build/manual-recipe-review',{recursive:true});await page.screenshot({path:'build/manual-recipe-review/editor-mobile.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:'build/manual-recipe-review/editor-desktop.png',fullPage:true});
 assert.deepEqual(readerRequests,[]);assert.deepEqual(errors,[]);
 console.log('Manual cookbook: entry, partial drafts, reload, edit, fractions, photos, cooking, unknown quantities, escaping, export/restore, existing drafts, responsive layout and no reader requests OK.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
