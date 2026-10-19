/* Test-only UI. No inventory API, user-photo upload or automatic persistence. */
import manifest from './generated-runtime-manifest.json';
const $=id=>document.getElementById(id),ASSET='../assets/date-mobile-test/',CACHE='reserve-date-mobile-runtime-v1';
const roleNames={best_before:'Mindesthaltbarkeit',use_by:'Verbrauchsdatum',expiry:'Haltbarkeitsdatum',manufactured:'Herstellung',sell_by:'Verkaufen bis',packed:'Verpackung',batch:'Charge',unknown:'Bedeutung unklar'};
let files=null,worker=null,ready=false,job=null,loading=null,startupCancel=null,photo=null,previewURL='',rows=[],last=null,sequence=0;
const violations=[];
let preparation=null;
function phase(diagnostic,stage,metrics={}){
 const safe={};for(const key of ['width','height','lineCount','totalLines','selectedLines','resolvedOrders','unresolvedOrders'])if(Number.isFinite(metrics[key]))safe[key]=metrics[key];
 diagnostic.events.push({stage,ms:Math.round(performance.now()-diagnostic.started),...safe});
}
function snapshot(diagnostic){return diagnostic?{lastStage:diagnostic.events.at(-1)?.stage||null,events:diagnostic.events,coverage:diagnostic.coverage||null}:null;}

document.addEventListener('securitypolicyviolation',e=>{violations.push({directive:e.violatedDirective,uri:e.blockedURI});});
function say(t){$('status').textContent=t;}
function busy(on){$('strategy').disabled=on;$('prepare').disabled=on;$('capture').disabled=on||!ready;$('gallery').disabled=on||!ready;$('cancel').hidden=!on;$('progress').hidden=!on;$('status').setAttribute('aria-busy',String(on));}
function stopWorker(){const reject=startupCancel;startupCancel=null;worker?.terminate();worker=null;ready=false;reject?.();}
function clearPhoto(){photo=null;if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';$('preview').removeAttribute('src');$('preview').hidden=true;}
function resetReview(){last=null;$('review').hidden=true;$('expectedDate').value='';$('expectedRole').value='';$('result').textContent='';$('inspectionDetails').hidden=true;$('inspectionText').textContent='';}
async function verifiedAsset(entry,signal,progress){
 const url=new URL(ASSET+entry.name,location.href).href;
 let cache=null,response=null;try{cache=await caches.open(CACHE);response=await cache.match(url);}catch{}
 let data=null;
 for(let attempt=0;attempt<2;attempt++){
  if(!response)response=await fetch(url,{signal,credentials:'omit',redirect:'error',cache:'no-cache'});
  if(!response.ok)throw Error('Datei konnte nicht geladen werden: '+entry.name);
  data=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
  if(data.byteLength===entry.bytes&&hash===entry.sha256)break;
  try{await cache?.delete(url);}catch{}
  response=null;data=null;
 }
 if(!data)throw Error('Dateiprüfung fehlgeschlagen. Bitte nochmals vorbereiten.');
 if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');
 try{await cache?.put(url,new Response(data,{headers:{'content-type':entry.name.endsWith('.js')||entry.name.endsWith('.mjs')?'text/javascript':'application/octet-stream'}}));}catch{}
 progress(data.byteLength);return data;
}
async function startWorker(){
 stopWorker();
 const instance=new Worker(new URL(ASSET+'date-worker.js?v=20261020-open-cases-1',location.href));worker=instance;
 const initialization={started:performance.now(),events:[]};phase(initialization,'worker_start');
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{startupCancel=null;if(worker===instance)stopWorker();reject(Error('Vorbereitung dauert zu lange. Bitte erneut versuchen.'));},30000);
  startupCancel=()=>{clearTimeout(timer);reject(new DOMException('Abgebrochen','AbortError'));};
  const startupError=e=>{clearTimeout(timer);startupCancel=null;if(job){const active=job;job=null;clearTimeout(active.timer);stopWorker();busy(false);say('Nicht erkannt. Bitte manuell prüfen.');showReview({suggestion:null,strict_expiry:null},performance.now()-active.started,'error',active.diagnostic);}reject(Error(e.message||'Dieser Browser kann die Erkennung nicht starten.'));};
  instance.onerror=startupError;
  instance.onmessage=({data})=>{
   if(instance!==worker)return;
   if(data.type==='phase'){if(job&&data.id===job.id)phase(job.diagnostic,data.stage,data.metrics);else if(!data.id&&!ready)phase(initialization,data.stage,data.metrics);return;}
   if(data.type==='ready'){clearTimeout(timer);startupCancel=null;phase(initialization,'ready');preparation=snapshot(initialization);ready=true;resolve();}
   else if(data.type==='error'&&!data.id){clearTimeout(timer);startupCancel=null;reject(Error(data.message));}
   else if(job&&data.id===job.id&&(data.type==='result'||data.type==='error')){
    const active=job;job=null;clearTimeout(active.timer);busy(false);
    if(data.type==='error'){say('Nicht erkannt. Bitte manuell prüfen.');showReview({suggestion:null,strict_expiry:null},performance.now()-active.started,'error',active.diagnostic);}
    else{say(data.coverage?.complete===false?'Ausschnitt gelesen. Datum und Datumsart manuell prüfen.':'Bitte Datum und Datumsart prüfen.');active.diagnostic.coverage=data.coverage;phase(active.diagnostic,'complete');showReview(data.prediction,performance.now()-active.started,'complete',active.diagnostic);$('inspectionText').textContent=(data.inspection||[]).map(l=>`${Math.round(l.confidence*100)} % · ${l.text}${l.dates.length?' → '+l.dates.join(', '):''}`).join('\n');$('inspectionDetails').hidden=false;}
   }
  };
  instance.postMessage({type:'init',files});
 });
}
async function prepare(){
 if(loading||job)return;
 resetReview();const controller=new AbortController();loading=controller;busy(true);$('progress').value=0;say('Test wird vorbereitet…');
 try{
  if(!globalThis.Worker||!globalThis.OffscreenCanvas||!globalThis.createImageBitmap||!globalThis.crypto?.subtle)throw Error('Bitte einen aktuellen Browser wie Chrome verwenden.');
  if(!files){let done=0;const downloaded={};for(const entry of manifest.files){downloaded[entry.name]=await verifiedAsset(entry,controller.signal,n=>{done+=n;$('progress').value=done/manifest.totalBytes*100;say('Vorbereitung: '+Math.round(done/manifest.totalBytes*100)+' %');});}files=downloaded;}
  if(controller.signal.aborted)throw new DOMException('Abgebrochen','AbortError');
  say('Erkennung wird gestartet…');await startWorker();if(controller.signal.aborted)throw new DOMException('Abgebrochen','AbortError');say('Bereit. MHD samt Hinweis fotografieren oder aus der Galerie wählen.');
 }catch(e){stopWorker();if(controller.signal.aborted)files=null;say(e.name==='AbortError'?'Vorbereitung abgebrochen.':e.message);}
 finally{if(loading===controller)loading=null;busy(false);}
}
function showReview(prediction,ms,state,diagnostic){
 last={id:'test-'+(++sequence),at:new Date().toISOString(),prediction,ms:Math.round(ms),state,strategy:diagnostic?.strategy||'full',diagnostics:snapshot(diagnostic),preparation};
 const p=prediction.suggestion;$('result').textContent=p?`${p.date} · ${roleNames[p.role]||'Bedeutung unklar'}${prediction.strict_expiry?'':' · unbestätigt'}`:'Kein eindeutiger Vorschlag.';
 $('precision').value=p?.precision==='month'?'month':'day';$('expectedDate').type=$('precision').value==='month'?'month':'date';$('expectedDate').value=p?.date||'';
 $('expectedRole').value=prediction.strict_expiry?(p.role==='best_before'?'best_before':p.role==='use_by'?'use_by':'expiry'):'';$('review').hidden=false;
}
async function picked(file){
 if(!file||job||loading)return;if(!ready){say('Bitte zuerst den Test vorbereiten.');return;}
 clearPhoto();resetReview();photo=file;previewURL=URL.createObjectURL(file);$('preview').src=previewURL;$('preview').hidden=false;busy(true);say('Datum wird erkannt…');const id='photo-'+Date.now(),started=performance.now();
 const timer=setTimeout(()=>{if(job?.id!==id)return;job=null;stopWorker();busy(false);say('Nach zehn Sekunden abgebrochen. Datum bitte manuell prüfen.');showReview({suggestion:null,strict_expiry:null},performance.now()-started,'timeout',diagnostic);},10000);const diagnostic={started,events:[],strategy:$('strategy').value||'full'};phase(diagnostic,'image_decode');job={id,started,timer,diagnostic};
 try{const bitmap=await createImageBitmap(file);if(job?.id!==id){bitmap.close();return;}phase(diagnostic,'worker_dispatch');worker.postMessage({type:'recognize',id,bitmap,strategy:diagnostic.strategy},[bitmap]);}
 catch{if(job?.id!==id)return;clearTimeout(timer);job=null;busy(false);say('Foto konnte nicht gelesen werden. Bitte ein anderes Bild wählen.');clearPhoto();}
}
function cancel(){
 if(loading){loading.abort();stopWorker();}
 if(job){clearTimeout(job.timer);job=null;stopWorker();busy(false);say('Erkennung abgebrochen. Bei Bedarf erneut vorbereiten.');clearPhoto();resetReview();}
}
function saveReview(empty=false){
 if(!last)return;
 const date=$('expectedDate').value,precision=$('precision').value,role=$('expectedRole').value;
 if(!empty&&(!date||!$('expectedDate').validity.valid||!role)){say('Bitte das gedruckte Datum und die Datumsart angeben.');return;}
 rows.push({...last,review:empty?{readable:false,date:null,precision:null,role:'unknown'}:{readable:true,date,precision,role},photoIncluded:false});
 $('count').textContent=rows.length+' Fotos geprüft.';$('export').disabled=false;clearPhoto();resetReview();say('Prüfung gespeichert. '+(ready?'Nächstes Foto auswählen.':'Für ein weiteres Foto bitte erneut vorbereiten.'));
}
$('prepare').onclick=prepare;$('cancel').onclick=cancel;
$('capture').onclick=()=>$('cameraInput').click();$('gallery').onclick=()=>$('galleryInput').click();
for(const id of ['cameraInput','galleryInput'])$(id).onchange=()=>{const f=$(id).files?.[0];$(id).value='';void picked(f);};
$('precision').onchange=()=>{const value=$('expectedDate').value,month=$('precision').value==='month';$('expectedDate').type=month?'month':'date';$('expectedDate').value=month?value.slice(0,7):value.length===10?value:'';};
$('confirm').onclick=()=>saveReview(false);$('unreadable').onclick=()=>saveReview(true);
$('export').onclick=()=>{const a=document.createElement('a'),data={schema:'reserve-date-mobile-review-v2',at:new Date().toISOString(),pipeline:manifest.pipeline,roleModuleSha:manifest.roleModuleSha,dateOrderModuleSha:manifest.dateOrderModuleSha,dateParserModuleSha:manifest.dateParserModuleSha,modelManifest:manifest.files.map(x=>({name:x.name,sha256:x.sha256})),limitMs:10000,device:navigator.userAgent,violations,rows};a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='reserve-mhd-handytest-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
busy(false);
