/* RESERVE barcode camera safe v1.1 — low-load camera scanning for physical mobile devices; recursion-safe stop path. */
(function(){
  'use strict';
  let controls=null,stream=null,scanTimer=null,running=false,backend='none';
  const $=id=>document.getElementById(id);
  const emit=(state,extra={})=>{try{window.dispatchEvent(new CustomEvent('reserve:camera-state',{detail:{state,backend,...extra}}))}catch(_){ }};
  function status(text,type=''){
    const el=$('barcodeStatus');if(!el)return;
    el.className='small '+(type==='bad'?'bad':type==='good'?'good':'muted');el.textContent=text;
  }
  function setButtons(active){const a=$('startScan'),b=$('stopScan');if(a)a.style.display=active?'none':'inline-block';if(b)b.style.display=active?'inline-block':'none'}
  function video(){return $('barcodeVideo')}
  function finish(code){code=String(code||'').replace(/\D/g,'');if(!code)return false;safeStop();const input=$('barcodeInput');if(input)input.value=code;emit('detected',{code});setTimeout(()=>window.RESERVE_BARCODE?.lookup?.(code),0);return true}
  function safeStop(){
    running=false;if(scanTimer)clearTimeout(scanTimer);scanTimer=null;
    if(controls){try{controls.stop()}catch(_){ }controls=null}
    if(stream){try{stream.getTracks().forEach(t=>t.stop())}catch(_){ }stream=null}
    const v=video();if(v){try{v.pause()}catch(_){ }try{v.srcObject=null}catch(_){ }v.style.display='none'}
    setButtons(false);emit('stopped');
  }
  async function nativeStart(){
    backend='native';const formats=await BarcodeDetector.getSupportedFormats();const wanted=['ean_13','ean_8','upc_a','upc_e'].filter(x=>formats.includes(x));const detector=new BarcodeDetector({formats:wanted.length?wanted:formats});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640,max:960},height:{ideal:480,max:720}},audio:false});
    const v=video();v.srcObject=stream;v.style.display='block';await v.play();status('Kamera aktiv – Barcode vor die Kamera halten.','');emit('started');
    const scan=async()=>{if(!running||!stream)return;const t=performance.now();try{const codes=await detector.detect(v);emit('attempt',{duration:performance.now()-t});if(codes?.length&&finish(codes[0].rawValue))return}catch(_){ }if(running)scanTimer=setTimeout(scan,700)};scanTimer=setTimeout(scan,250);
  }
  async function zxingStart(){
    backend='zxing';const ZX=await window.RESERVE_BARCODE?.loadZXing?.();if(!ZX)throw new Error('ZXing unavailable');
    const v=video();v.style.display='block';
    let reader;try{reader=new ZX.BrowserMultiFormatOneDReader(undefined,{delayBetweenScanAttempts:900,delayBetweenScanSuccess:1200})}catch(_){reader=new ZX.BrowserMultiFormatOneDReader()}
    try{if('timeBetweenDecodingAttempts'in reader)reader.timeBetweenDecodingAttempts=900}catch(_){ }
    status('Schonender Kamera-Scanner aktiv – Barcode ruhig vor die Kamera halten.','');emit('starting');
    controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640,max:960},height:{ideal:480,max:720},frameRate:{ideal:15,max:20}}},v,(result,error)=>{if(!running)return;if(result){finish(result.getText?.()||result.text||'');return}if(error?.name&&error.name!=='NotFoundException')emit('decode-error',{name:error.name})});
    emit('started');
  }
  async function safeStart(){
    if(!navigator.mediaDevices?.getUserMedia){status('Dieser Browser erlaubt keinen Kamerazugriff. Du kannst die Barcode-Nummer weiterhin eingeben.','bad');return}
    safeStop();running=true;setButtons(true);status('Kamera wird gestartet…','');emit('start-request');
    try{if('BarcodeDetector'in window)await nativeStart();else await zxingStart()}catch(e){safeStop();status('Kamera-Scanner konnte nicht gestartet werden. Bitte Barcode eintippen oder Kamera erneut starten.','bad');emit('error',{name:e?.name||'Error'})}
  }
  function install(){
    const start=$('startScan'),stop=$('stopScan');if(!start||!stop)return setTimeout(install,120);
    if(start.dataset.reserveSafeCamera==='1')return;
    const startClone=start.cloneNode(true),stopClone=stop.cloneNode(true);start.replaceWith(startClone);stop.replaceWith(stopClone);
    startClone.dataset.reserveSafeCamera='1';stopClone.dataset.reserveSafeCamera='1';startClone.addEventListener('click',safeStart);stopClone.addEventListener('click',safeStop);
    if(window.RESERVE_BARCODE){window.RESERVE_BARCODE.startCamera=safeStart;window.RESERVE_BARCODE.stopCamera=safeStop}
    window.addEventListener('pagehide',safeStop,{once:true});emit('installed');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.RESERVE_CAMERA_SAFE={version:'1.1',start:safeStart,stop:safeStop,get state(){return{running,backend}}};
})();
