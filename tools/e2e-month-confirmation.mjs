import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.RESERVE_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<html lang="de"><body><input id="barcodeInput" value="7612345678901"><input id="scanName" value="Testprodukt"><div class="grid2"><label>Datum<input id="scanExpiry" type="date"></label></div><button id="scanAdd">Zum Vorrat hinzufügen</button></body></html>');
 await page.evaluate(()=>{
  window.added=0;document.getElementById('scanAdd').addEventListener('click',()=>window.added++);
  const saved=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}});
  window.fixtureTexts=[];window.readIndex=0;window.cloudCalls=0;window.cloudResult=null;
  window.TextDetector=class{async detect(){return[]}};
  window.createImageBitmap=async()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;return canvas;};
  window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:window.fixtureTexts[Math.min(window.readIndex++,window.fixtureTexts.length-1)]||''}}),terminate:async()=>{}})};
  window.RESERVE_EXPIRY_VISION={available:()=>true,analyze:async()=>{window.cloudCalls++;return window.cloudResult;}};
 });
 for(const file of ['date-token-guard-v1.js','date-format-v1.js','date-format-ui-v1.js','date-policy-v1.js','expiry-camera-v1.js'])await page.addScriptTag({path:file});
 async function scan(texts,vision=null){await page.evaluate(async({texts,vision})=>{window.fixtureTexts=texts;window.readIndex=0;window.cloudCalls=0;window.cloudResult=vision;await RESERVE_EXPIRY_CAMERA.processFile(new File(['fixture'],'date.jpg'));},{texts,vision});}
 const field=page.locator('#scanExpiry'),month=page.getByLabel('Monat und Jahr auf der Packung'),check=page.getByLabel('Auf der Packung steht kein Tag. Monat und Jahr habe ich geprüft.'),confirm=page.getByRole('button',{name:'Monat und Jahr übernehmen'});
 // These are the exact two OCR outputs from the recorded precision-loss failure.
 await scan(['1A she a URE GEE SEAR 1\nERR. 03 .2027\n08091 D-10','17 ea UI EG A Se 1\nBRE .03.2027\n18081 D-10']);
 assert.equal(await field.inputValue(),'');assert.equal(await month.inputValue(),'2027-03');assert.equal(await confirm.isDisabled(),true);assert.equal(await page.evaluate(()=>window.cloudCalls),0);
 await page.locator('#scanAdd').click();assert.equal(await page.evaluate(()=>window.added),0);
 // A printed day is entered explicitly rather than silently discarded.
 await field.fill('2027-03-08');assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);assert.equal(await field.inputValue(),'2027-03-08');
 // The wrong year remains blank in the product field until the customer corrects it.
 await scan(['ow 12.2015','96.2015\n12.2015 -']);assert.equal(await field.inputValue(),'');
 await month.fill('2012-12');assert.equal(await confirm.isDisabled(),true);await check.check();await confirm.click();
 assert.equal(await field.inputValue(),'2012-12');assert.equal(await field.getAttribute('type'),'month');
 assert.equal(await field.getAttribute('data-date-precision'),'month');assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);
 await page.locator('#scanAdd').click();assert.equal(await page.evaluate(()=>window.added),1);
 // No confirmation is reused for a new scan, a different product, or a reset.
 await scan(['MHD 12.2027','MHD 12.2027']);assert.equal(await field.inputValue(),'');assert.equal(await check.isChecked(),false);
 await check.check();await page.locator('#scanName').fill('Anderes Produkt');await confirm.click();assert.equal(await field.inputValue(),'');
 await scan(['MHD 12.2027','MHD 12.2027']);await page.evaluate(()=>RESERVE_EXPIRY_CAMERA.resetCapture());assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);
 // The bounded public reader must not trigger an automatic cloud request.
 await scan([], {date:'2027-12-31',precision:'month',confidence:.99});assert.equal(await field.inputValue(),'');assert.equal(await page.evaluate(()=>window.cloudCalls),0);assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);
 // Conflicting printed precision cannot manufacture an automatic daily result.
 await scan(['MHD 31.03.2027','MHD 03.2027','MHD 31.03.2027']);assert.equal(await field.inputValue(),'');assert.match(await page.locator('#expiryCameraStatus').innerText(),/Tag, Monat und Jahr/);assert.equal(await page.evaluate(()=>window.cloudCalls),0);
 // Unambiguous complete dates keep their existing behavior.
 await scan(['MHD 14.09.2027','MHD 14.09.2027']);assert.equal(await field.inputValue(),'');assert.equal(await page.getByLabel('Gelesenes Datum prüfen').inputValue(),'2027-09-14');
 await page.getByLabel('Ich habe das Datum mit der Packung verglichen.').check();await page.getByRole('button',{name:'Geprüftes Datum übernehmen'}).click();assert.equal(await field.inputValue(),'2027-09-14');
 console.log('Month review: recorded failures, explicit precision/year correction, add guard, stale/reset, no cloud fallback and reviewed full-date regression: OK');
}finally{await browser.close();}
