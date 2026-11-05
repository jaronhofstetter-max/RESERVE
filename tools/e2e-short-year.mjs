import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.RESERVE_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<html lang="de-CH"><body><input id="barcodeInput" value="7612345678901"><input id="scanName" value="Milch"><div class="grid2"><label>Datum<input id="scanExpiry" type="date"></label></div><button id="scanAdd">Zum Vorrat hinzufügen</button><p id="expiryCameraStatus"></p></body></html>');
 for(const name of ['date-token-guard-v1.js','date-format-v1.js','date-format-ui-v1.js'])await page.addScriptTag({path:name});
 await page.evaluate(()=>{window.added=0;document.getElementById('scanAdd').addEventListener('click',()=>window.added++);window.chooseYear=text=>RESERVE_DATE_FORMAT_UI.showYear(RESERVE_DATE_FORMAT.shortYears(text),row=>{window.confirmed=row;document.getElementById('scanExpiry').type=row.precision==='month'?'month':'date';document.getElementById('scanExpiry').value=row.date;});chooseYear('MHD 24.10.26');});
 assert.equal(await page.locator('#scanExpiry').inputValue(),'');await page.locator('#scanAdd').click();assert.equal(await page.evaluate(()=>window.added),0);
 const year=page.getByLabel('Vollständiges Jahr für 24.10.26');await year.fill('2027');assert.equal(await page.locator('#dateFormatChoices button').count(),0);
 await year.fill('2026');assert.equal(await page.locator('#scanExpiry').inputValue(),'');await page.locator('#dateFormatChoices button').click();assert.equal(await page.locator('#scanExpiry').inputValue(),'2026-10-24');assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);
 await page.locator('#scanAdd').click();assert.equal(await page.evaluate(()=>window.added),1);
 await page.evaluate(()=>{document.getElementById('scanExpiry').value='';chooseYear('MHD 08.14');});await page.getByLabel('Vollständiges Jahr für 08.14').fill('2014');await page.locator('#dateFormatChoices button').click();assert.equal(await page.locator('#scanExpiry').getAttribute('type'),'month');assert.equal(await page.locator('#scanExpiry').inputValue(),'2014-08');
 await page.evaluate(()=>chooseYear('MHD 24.10.26'));await page.getByLabel('Vollständiges Jahr für 24.10.26').fill('2026');await page.locator('#scanName').fill('Anderes Produkt');await page.locator('#dateFormatChoices button').click();assert.equal(await page.evaluate(()=>window.confirmed.date),'2014-08');assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),false);
 await page.evaluate(()=>chooseYear('MHD 24.10.26'));await page.getByLabel('Vollständiges Jahr für 24.10.26').fill('2026');await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.clear());assert.equal(await page.locator('#dateFormatChoices').isVisible(),false);
 await page.evaluate(()=>{const saved=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}});document.getElementById('scanExpiry').type='date';document.getElementById('scanExpiry').value='';window.fixtureText='MHD 24.10.26';window.cloudCalls=0;window.TextDetector=class{async detect(){return[{rawValue:window.fixtureText}]}};window.createImageBitmap=async()=>({width:4,height:4,close(){}});window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:window.fixtureText}}),terminate:async()=>{}})};window.RESERVE_EXPIRY_VISION={available:()=>true,analyze:async()=>{window.cloudCalls++;return{date:'2026-10-24',precision:'day',confidence:.99}}};});
 await page.addScriptTag({path:'expiry-camera-v1.js'});
 await page.evaluate(()=>RESERVE_EXPIRY_CAMERA.processFile(new File(['fixture'],'expiry.jpg')));
 assert.equal(await page.locator('#scanExpiry').inputValue(),'');assert.equal(await page.evaluate(()=>window.cloudCalls),0);assert.equal(await page.evaluate(()=>RESERVE_DATE_FORMAT_UI.pending()),true);
 await page.getByLabel('Vollständiges Jahr für 24.10.26').fill('2026');await page.locator('#dateFormatChoices button').click();assert.equal(await page.locator('#scanExpiry').inputValue(),'2026-10-24');
 console.log('Browser: blank year, wrong suffix rejected, explicit click, month precision, add guard and stale product/reset protection: OK');
}finally{await browser.close();}
