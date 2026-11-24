import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.RESERVE_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<html><body><div><input id="scanExpiry" type="date"></div><div><button id="startScan">Barcode scannen</button><button id="stopScan">Stop</button></div><video id="barcodeVideo"></video><p id="barcodeStatus"></p><input id="barcodeInput"></body></html>');
 await page.evaluate(()=>{
  window.cameraCalls=0;window.lookups=[];window.codes=['4061459956436'];window.ocrCalls=0;
  const store=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.cameraCalls++;throw Error('No camera in fixture')}}});
  window.RESERVE_BARCODE={lookup:code=>window.lookups.push(code)};
  window.BarcodeDetector=class{static async getSupportedFormats(){return ['ean_13']}async detect(){return window.codes.map(rawValue=>({rawValue}))}};
  window.ZXingBrowser={BrowserMultiFormatOneDReader:class{decodeFromCanvas(){throw Error('Fixture has no barcode')}}};
  window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{window.ocrCalls++;return {data:{text:'BBD 19.12.2027'}}},terminate:async()=>{}})};
  window.RESERVE_EXPIRY_VISION={available:()=>false};
 });
 for(const file of ['date-token-guard-v1.js','date-format-v1.js','date-policy-v1.js','expiry-camera-v1.js','barcode-camera-safe-v1.js'])await page.addScriptTag({path:file});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=100;return c.toDataURL().split(',')[1]});
 const fixture={name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 async function upload(button){const chooser=page.waitForEvent('filechooser');await button.click();await (await chooser).setFiles(fixture)}
 assert.equal(await page.locator('#expiryCameraInput').getAttribute('capture'),null);
 assert.equal(await page.locator('#barcodeGalleryInput').getAttribute('capture'),null);
 await upload(page.getByRole('button',{name:'Datumsfoto aus Galerie auswählen'}));
 await page.waitForFunction(()=>document.querySelector('#scanExpiry').value==='2027-12-19');
 const first=await page.evaluate(()=>window.ocrCalls);
 await upload(page.getByRole('button',{name:'Datumsfoto aus Galerie auswählen'}));
 await page.waitForFunction(n=>window.ocrCalls>n,first);
 await upload(page.getByRole('button',{name:'Barcodefoto aus Galerie auswählen'}));
 await page.waitForFunction(()=>window.lookups.length===1);
 assert.equal(await page.locator('#barcodeInput').inputValue(),'4061459956436');
 assert.equal(await page.evaluate(()=>window.cameraCalls),0);
 await page.evaluate(()=>window.codes=['4061459956437']);
 await upload(page.getByRole('button',{name:'Barcodefoto aus Galerie auswählen'}));
 await page.getByText('Kein eindeutiger Barcode erkannt.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.lookups.length),1);
 await page.evaluate(()=>window.codes=['4061459956436','4006381333931']);
 await upload(page.getByRole('button',{name:'Barcodefoto aus Galerie auswählen'}));
 await page.getByText('Mehrere Barcodes gefunden.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.lookups.length),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Gallery controls: file selection, same-file retry, no camera request, barcode checksum and ambiguity guard: OK (stubbed OCR/decoders)');
}finally{await browser.close()}
