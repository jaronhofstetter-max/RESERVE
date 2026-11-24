import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.RESERVE_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<html><body><input id="barcodeInput" value="test"><input id="scanName" value="Product"><div><input id="scanExpiry" type="date"></div><button id="scanAdd">Hinzufügen</button></body></html>');
 await page.evaluate(()=>{
  const store=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  window.reads=0;window.text='MHD 22.09.2022';window.hang=false;window.added=0;window.cloudCalls=0;
  document.querySelector('#scanAdd').addEventListener('click',()=>window.added++);
  window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{window.reads++;if(window.hang)return new Promise(()=>{});return {data:{text:window.text}}},terminate:async()=>{}})};
  window.RESERVE_EXPIRY_VISION={available:()=>true,analyze:async()=>{window.cloudCalls++;return {date:'2027-12-19',confidence:1}}};
 });
 for(const file of ['date-token-guard-v1.js','date-format-v1.js','date-format-ui-v1.js','date-policy-v1.js','expiry-region-v1.js','expiry-camera-v1.js'])await page.addScriptTag({path:file});
 const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,400);x.fillStyle='black';x.fillText('fixture',100,180);return c.toDataURL().split(',')[1]});
 const photo={name:'photo.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')};
 async function upload(){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Datumsfoto aus Galerie auswählen'}).click();await (await chooser).setFiles(photo);await page.locator('#expiryRegionDialog').waitFor();}
 await upload();assert.equal(await page.evaluate(()=>window.reads),0);assert.equal(await page.locator('#expiryRegionRead').isDisabled(),true);
 // Actual pointer selection maps the displayed canvas to a smaller source image.
 const canvas=page.locator('#expiryRegionCanvas'),box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.1,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.9,box.y+box.height*.7);await page.mouse.up();
 assert.equal(await page.locator('#expiryRegionRead').isDisabled(),false);
 await page.locator('#expiryRegionRead').click();await page.getByLabel('Gelesenes Datum prüfen').waitFor();
 assert.equal(await page.locator('#scanExpiry').inputValue(),'');assert.equal(await page.getByLabel('Gelesenes Datum prüfen').inputValue(),'2022-09-22');
 await page.locator('#scanAdd').click();assert.equal(await page.evaluate(()=>window.added),0);
 const accept=page.getByRole('button',{name:'Geprüftes Datum übernehmen'});assert.equal(await accept.isDisabled(),true);
 // Correct the actual observed 25 -> 22 type of failure before accepting.
 await page.getByLabel('Gelesenes Datum prüfen').fill('2022-09-25');await page.getByLabel('Ich habe das Datum mit der Packung verglichen.').check();await accept.click();assert.equal(await page.locator('#scanExpiry').inputValue(),'2022-09-25');
 assert.equal(await page.evaluate(()=>window.reads<=2&&window.cloudCalls===0),true);
 // Selecting another photo and cancelling starts no reading and preserves the manually reviewed value.
 const count=await page.evaluate(()=>window.reads);await upload();await page.getByRole('button',{name:'Abbrechen',exact:true}).click();assert.equal(await page.evaluate(()=>window.reads),count);assert.equal(await page.locator('#scanExpiry').inputValue(),'2022-09-25');
 // Keyboard selection also works. A stale product must not receive an old crop.
 await upload();await page.locator('#expiryRegionRotate').click();assert.equal(await canvas.evaluate(c=>c.height>c.width),true);await canvas.press('Enter');assert.equal(await page.locator('#expiryRegionRead').isDisabled(),false);await page.evaluate(()=>document.querySelector('#scanName').value='Other');await page.locator('#expiryRegionRead').click();await page.locator('#expiryRegionDialog').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.reads),count);
 // Review is bound to its product, and manual typing cancels ongoing OCR.
 await page.evaluate(async data=>{window.photo=new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],'fixture.png',{type:'image/png'});await RESERVE_EXPIRY_CAMERA.processFile(window.photo)},fixture);
 await page.locator('#scanName').fill('Third');await page.getByLabel('Ich habe das Datum mit der Packung verglichen.').check();await page.getByRole('button',{name:'Geprüftes Datum übernehmen'}).click();assert.equal(await page.locator('#scanExpiry').inputValue(),'');
 await page.evaluate(()=>{window.hang=true;window.pendingScan=RESERVE_EXPIRY_CAMERA.processFile(window.photo)});await page.locator('#scanExpiry').fill('2027-12-19');await page.evaluate(()=>window.pendingScan);assert.equal(await page.locator('#scanExpiry').inputValue(),'2027-12-19');
 // A hung OCR does not block the form beyond the total deadline.
 const start=Date.now();await page.evaluate(()=>RESERVE_EXPIRY_CAMERA.processFile(window.photo));assert.ok(Date.now()-start<6000);assert.equal(await page.locator('#scanExpiry').inputValue(),'');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Reviewed fast reader: no auto-fill, real crop selection, keyboard/cancel/stale guards, manual correction and bounded hang: OK (stubbed OCR)');
}finally{await browser.close()}
