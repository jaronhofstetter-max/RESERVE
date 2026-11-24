/* RESERVE barcode camera safe v1.10 — pantry uses the same camera/decode strategy proven by shopping scan. */
(function(){
'use strict';
let stream=null,timer=null,zxingControls=null,running=false,bindTimer=null;const $=id=>document.getElementById(id),ZXING_URL='https://unpkg.com/@zxing/browser@0.2.1/umd/zxing-browser.min.js';
const emit=(state,extra={})=>{try{window.dispatchEvent(new CustomEvent('reserve:camera-state',{detail:{state,...extra}}))}catch{}};
function status(t,bad=false){const e=$('barcodeStatus');if(e){e.textContent=t;e.className='small '+(bad?'bad':'muted')}}
function buttons(active){const a=$('startScan'),b=$('stopScan');if(a)a.style.display=active?'none':'inline-block';if(b)b.style.display=active?'inline-block':'none'}
function stop(){running=false;if(timer)clearTimeout(timer);timer=null;if(zxingControls){try{zxingControls.stop()}catch{}zxingControls=null}if(stream){try{stream.getTracks().forEach(t=>t.stop())}catch{}stream=null}const v=$('barcodeVideo');if(v){try{v.pause()}catch{}try{v.srcObject=null}catch{}v.style.display='none'}buttons(false);emit('stopped')}
function lookup(code){code=String(code||'').replace(/\D/g,'');if(!code)return;const input=$('barcodeInput');if(input)input.value=code;status('Produkt wird gesucht…');try{const verified=window.RESERVE_BARCODE_SEARCH?.resolveVerified?.(code);if(verified)return}catch{}try{const out=window.RESERVE_BARCODE?.lookup?.(code);if(out&&typeof out.catch==='function')out.catch(()=>{})}catch{}}
function scanned(raw){const code=String(raw||'').replace(/\D/g,'');if(!code)return;stop();const input=$('barcodeInput');if(input)input.value=code;emit('detected',{code});lookup(code)}
function loadZXing(){if(window.ZXingBrowser)return Promise.resolve(window.ZXingBrowser);return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=ZXING_URL;s.async=true;s.onload=()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(new Error('ZXing unavailable'));s.onerror=reject;document.head.appendChild(s)})}
async function camera(){if(!navigator.mediaDevices?.getUserMedia){status('Kamera nicht verfügbar. Barcode bitte manuell eingeben.',true);return}stop();running=true;buttons(true);emit('start-request');try{const v=$('barcodeVideo');if(!v)throw new Error('video missing');v.style.display='block';if('BarcodeDetector'in window){const formats=await BarcodeDetector.getSupportedFormats(),wanted=['ean_13','ean_8','upc_a','upc_e'].filter(x=>formats.includes(x)),detector=new BarcodeDetector({formats:wanted.length?wanted:formats});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});v.srcObject=stream;await v.play();status('Barcode vor die Kamera halten.');emit('started',{backend:'native'});const scan=async()=>{if(!running||!stream)return;try{const codes=await detector.detect(v);if(codes.length)return scanned(codes[0].rawValue)}catch{}timer=setTimeout(scan,300)};scan()}else{const ZX=await loadZXing(),reader=new ZX.BrowserMultiFormatOneDReader();status('Barcode vor die Kamera halten.');emit('started',{backend:'zxing'});zxingControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},v,result=>{if(running&&result)scanned(result.getText?.()||result.text||'')})}}catch(e){stop();status('Scanner konnte nicht gestartet werden. Bitte Kameraberechtigung prüfen oder Barcode manuell eingeben.',true);emit('error',{name:e?.name||'Error'})}}
let photoRun=0;
async function photo(file){
 if(!file)return;stop();const run=++photoRun;status('Barcodefoto wird gelesen…');
 let image,url;
 try{
  url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode();
  if(run!==photoRun)return;
  const codes=new Set(),canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  const valid=raw=>{const code=String(raw||'').replace(/\s/g,'');if(!/^(?:\d{8}|\d{12,13})$/.test(code))return false;let sum=0;for(let i=code.length-2,weight=3;i>=0;i--,weight=4-weight)sum+=Number(code[i])*weight;return (10-sum%10)%10===Number(code.at(-1));};
  let native=null;try{if('BarcodeDetector'in window){const supported=await BarcodeDetector.getSupportedFormats(),formats=['ean_13','ean_8','upc_a'].filter(x=>supported.includes(x));if(formats.length)native=new BarcodeDetector({formats});}}catch{}
  let reader=null;try{const ZX=await loadZXing();reader=new ZX.BrowserMultiFormatOneDReader();}catch{}
  if(!native&&!reader)throw new Error('decoder unavailable');
  const scale=Math.min(1,2000/Math.max(image.naturalWidth,image.naturalHeight)),w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
  for(const angle of [0,90,180,270]){
   if(run!==photoRun)return;
   canvas.width=angle%180?h:w;canvas.height=angle%180?w:h;context.translate(canvas.width/2,canvas.height/2);context.rotate(angle*Math.PI/180);context.drawImage(image,-w/2,-h/2,w,h);
   if(native)try{for(const hit of await native.detect(canvas))if(valid(hit.rawValue))codes.add(hit.rawValue);}catch{}
   if(reader)try{const hit=reader.decodeFromCanvas(canvas),raw=hit.getText?.()||hit.text;if(valid(raw))codes.add(raw);}catch{}
  }
  if(run!==photoRun)return;
  if(codes.size===1)scanned([...codes][0]);
  else status(codes.size?'Mehrere Barcodes gefunden. Bitte ein Foto mit nur einem Barcode auswählen.':'Kein eindeutiger Barcode erkannt. Bitte näher fotografieren oder die Nummer eingeben.',true);
 }catch{if(run===photoRun)status('Barcodefoto konnte nicht gelesen werden. Bitte ein anderes Bild auswählen oder die Nummer eingeben.',true);}
 finally{if(url)URL.revokeObjectURL(url);}
}
function installGallery(start){
 if($('barcodeGalleryBtn'))return;
 const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.hidden=true;picker.id='barcodeGalleryInput';
 const button=document.createElement('button');button.type='button';button.id='barcodeGalleryBtn';button.className='secondary';button.textContent='Aus Galerie';button.setAttribute('aria-label','Barcodefoto aus Galerie auswählen');
 button.onclick=()=>picker.click();picker.onchange=()=>{const file=picker.files?.[0];picker.value='';void photo(file)};
 start.after(button);button.after(picker);
}
function bind(){const start=$('startScan'),end=$('stopScan');if(!start||!end)return false;if(start.dataset.reservePantryScanner==='1'){installGallery(start);return true;}const a=start.cloneNode(true),b=end.cloneNode(true);start.replaceWith(a);end.replaceWith(b);a.dataset.reservePantryScanner='1';b.dataset.reservePantryScanner='1';a.addEventListener('click',()=>{photoRun++;camera()});installGallery(a);b.addEventListener('click',stop);if(window.RESERVE_BARCODE){window.RESERVE_BARCODE.startCamera=camera;window.RESERVE_BARCODE.stopCamera=stop}emit('installed');return true}
function install(){if(bind()){if(bindTimer){clearInterval(bindTimer);bindTimer=null}}else if(!bindTimer)bindTimer=setInterval(()=>{if(bind()){clearInterval(bindTimer);bindTimer=null}},250)}
window.addEventListener('reserve:ui-refreshed',install);window.addEventListener('pageshow',install);window.addEventListener('pagehide',stop);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.RESERVE_CAMERA_SAFE={version:'1.10',start:camera,stop,lookup,rebind:install,get state(){return{running,backend:('BarcodeDetector'in window)?'native':'zxing'}}};
})();
