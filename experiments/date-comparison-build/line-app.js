import Formats from '../../date-format-v1.js';
import {regionPixels} from './line-guard.js';
const $=id=>document.getElementById(id),attempts=[],diagnostics=[];
let ready=false,busy=false,worker=null,pending=null,seq=0,generation=0,downloadAbort=null,loadTimer=null,loadStarted=null,loadElapsedMs=null,loadMs=null,manifest=null,photo=null,image=null,imageWidth=0,imageHeight=0,selection=null,drag=null,active=null;
const session={phase:'not_started',filesLoaded:0,filesTotal:null,lastValidationError:null};
const labels={'model-v4':'Basisleser wird vorbereitet …','model-v5':'Zusatzleser wird vorbereitet …','read-v4':'Basisleser prüft die markierte Zeile …','read-v5':'Zusatzleser prüft die markierte Zeile …'};
const reasons={agreement:'Beide Leser stimmen überein. Bitte Datum und Reihenfolge auf der Packung prüfen.',low_confidence:'Die Zeile wurde nicht sicher genug gelesen. Bitte Markierung prüfen oder das Datum selbst eintragen.',not_date:'Kein reines Datumsformat mit vierstelligem Jahr erkannt. Uhrzeit, Code oder gemischter Text werden nicht als Datum übernommen.',disagreement:'Die Leser sind uneinig. Bitte Datum selbst prüfen und eintragen.'};
function phase(name,text){session.phase=name;if(text)$('status').textContent=text;}
function controls(){
 $('load').disabled=busy;$('cancel').hidden=!busy;$('photo').disabled=!ready||busy;$('resetRegion').disabled=!image||busy;$('singleLine').disabled=!selection||busy;
 $('run').disabled=!ready||busy||!photo||!regionPixels(selection,imageWidth,imageHeight)||!$('singleLine').checked;
 $('remember').disabled=busy||!active||active.status!=='complete'||!!active.review;
 $('regionCanvas').style.pointerEvents=busy?'none':'auto';for(const b of $('choices').querySelectorAll('button'))b.disabled=busy||!!active?.review;
}
function invalidate(){active=null;session.lastValidationError=null;$('results').hidden=true;$('choices').replaceChildren();$('reference').value='';$('reviewStatus').textContent='';}
function stop(message='Abgebrochen. Bitte Leser erneut laden.'){
 if(active?.status==='running'){active.status='cancelled';active.totalMs=Math.round(performance.now()-active.started);delete active.started;}
 if(loadStarted!==null&&loadMs===null)loadElapsedMs=Math.round(performance.now()-loadStarted);generation++;clearTimeout(loadTimer);downloadAbort?.abort();downloadAbort=null;worker?.terminate();worker=null;ready=false;busy=false;drag=null;
 if(pending){clearTimeout(pending.timer);pending.reject(Error(message));pending=null;}
 if(message){diagnostics.push({at:new Date().toISOString(),stage:'stopped',message});phase('stopped',message);}controls();
}
function request(type,payload={},transfer=[]){
 const id=++seq;return new Promise((resolve,reject)=>{pending={id,resolve,reject,timer:setTimeout(()=>stop('Die Verarbeitung dauert zu lange. Bitte neu laden.'),60000)};worker.postMessage({type,id,...payload},transfer);});
}
function receive({data}){
 if(!pending||data.id!==pending.id)return;if(data.type==='phase'){phase(data.name,labels[data.name]||'Verarbeitung läuft …');return;}
 if(!['ready','result','error'].includes(data.type))return;clearTimeout(pending.timer);const p=pending;pending=null;if(data.type==='error')p.reject(Error(data.message));else p.resolve(data);
}
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function load(){
 stop('');invalidate();busy=true;loadMs=null;loadElapsedMs=null;loadStarted=performance.now();session.filesLoaded=0;session.filesTotal=null;phase('loading_runtime','Laufzeitdateien werden geladen …');$('export').disabled=false;controls();const epoch=generation;downloadAbort=new AbortController();loadTimer=setTimeout(()=>stop('Das Laden dauert zu lange. Bitte Verbindung prüfen und erneut laden.'),120000);
 try{
  const response=await fetch('../assets/date-comparison/line-manifest.json',{credentials:'omit',signal:downloadAbort.signal,cache:'no-store'});if(!response.ok)throw Error('Laufzeitbeschreibung konnte nicht geladen werden.');manifest=await response.json();if(manifest.schema!=='reserve-manual-date-line-runtime-v1'||!Array.isArray(manifest.files))throw Error('Unbekannter Laufzeitstand.');
  $('downloadNote').textContent='Einmal etwa '+Math.ceil(manifest.totalBytes/1000000)+' MB. Fotos bleiben auf dem Gerät.';session.filesTotal=manifest.files.length;
  const files={};for(const file of manifest.files){const url=new URL(file.url,location.href);if(url.origin!==location.origin||!Number.isFinite(file.bytes)||file.bytes<=0||file.bytes>80*1024*1024)throw Error('Ungültige Laufzeitdatei.');url.searchParams.set('sha',file.sha256.slice(0,16));const r=await fetch(url,{credentials:'omit',signal:downloadAbort.signal});if(!r.ok)throw Error('Laufzeitdatei konnte nicht geladen werden.');const b=await r.arrayBuffer();if(b.byteLength!==file.bytes||hex(await crypto.subtle.digest('SHA-256',b))!==file.sha256)throw Error('Laufzeitdatei stimmt nicht mit dem geprüften Stand überein.');if(epoch!==generation)return;files[file.key]=b;session.filesLoaded++;phase('loading_runtime','Laufzeit laden: '+session.filesLoaded+'/'+session.filesTotal);}
  const url=URL.createObjectURL(new Blob([files.worker],{type:'text/javascript'}));delete files.worker;worker=new Worker(url);worker.onmessage=receive;worker.onerror=()=>{if(epoch===generation)stop('Browser-Erkennung konnte nicht starten. Bitte neu laden.');};try{await request('init',{files},Object.values(files));}finally{URL.revokeObjectURL(url);}if(epoch!==generation)return;ready=true;loadMs=Math.round(performance.now()-loadStarted);phase('ready','Bereit. Laden und Start: '+(loadMs/1000).toFixed(1)+' Sekunden.');
 }catch(e){if(epoch===generation){ready=false;phase('load_error','Ladefehler: '+e.message);diagnostics.push({at:new Date().toISOString(),stage:'load_error',message:e.message});}}finally{if(epoch===generation){clearTimeout(loadTimer);loadElapsedMs=Math.round(performance.now()-loadStarted);busy=false;controls();}}
}
async function decode(file,epoch){
 let timer,expired=false;const bitmap=await Promise.race([createImageBitmap(file).then(b=>{if(expired||epoch!==generation){b.close();throw Error('Abgebrochen.');}return b;}),new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Das Foto konnte nicht rechtzeitig geöffnet werden.'));},15000);})]).finally(()=>clearTimeout(timer));return bitmap;
}
function paint(){
 if(!image)return;const canvas=$('regionCanvas'),x=canvas.getContext('2d');x.clearRect(0,0,canvas.width,canvas.height);x.drawImage(image,0,0);
 if(selection){x.strokeStyle='#183d2e';x.lineWidth=3;x.fillStyle='rgba(255,255,255,.22)';const a=[selection.x*canvas.width,selection.y*canvas.height,selection.w*canvas.width,selection.h*canvas.height];x.fillRect(...a);x.strokeRect(...a);}
}
function updateSelection(){
 $('singleLine').checked=false;const rect=regionPixels(selection,imageWidth,imageHeight);$('regionPreview').hidden=!rect;
 if(rect){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(selection.w*image.width));c.height=Math.max(1,Math.round(selection.h*image.height));c.getContext('2d').drawImage(image,selection.x*image.width,selection.y*image.height,selection.w*image.width,selection.h*image.height,0,0,c.width,c.height);$('regionPreview').src=c.toDataURL('image/png');$('selectionStatus').textContent='Markierung bereit. Alle Zeichen und etwas Rand prüfen; die Zeile darunter auslassen.';}
 else $('selectionStatus').textContent=selection?'Bitte einen waagerechten Streifen mit allen Datumszeichen markieren.':'Noch keine Zeile markiert.';paint();controls();
}
const point=e=>{const c=$('regionCanvas'),r=c.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left-c.clientLeft)/c.clientWidth)),y:Math.max(0,Math.min(1,(e.clientY-r.top-c.clientTop)/c.clientHeight))};};
$('regionCanvas').onpointerdown=e=>{if(busy||!image)return;e.preventDefault();invalidate();drag={...point(e),id:e.pointerId};selection=null;$('regionCanvas').setPointerCapture(e.pointerId);updateSelection();};
$('regionCanvas').onpointermove=e=>{if(!drag||drag.id!==e.pointerId||busy)return;e.preventDefault();const p=point(e);selection={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};paint();};
$('regionCanvas').onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);selection={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};drag=null;$('regionCanvas').releasePointerCapture(e.pointerId);updateSelection();};
$('regionCanvas').onpointercancel=()=>{drag=null;selection=null;updateSelection();};
$('resetRegion').onclick=()=>{invalidate();selection=null;drag=null;updateSelection();};$('singleLine').onchange=controls;
$('photo').onchange=async()=>{
 if(busy)return;invalidate();selection=null;image=null;imageWidth=0;imageHeight=0;photo=$('photo').files[0]||null;$('regionCanvas').hidden=true;$('regionPreview').hidden=true;$('singleLine').checked=false;if(!photo){controls();return;}
 $('export').disabled=false;busy=true;controls();phase('decoding_photo','Foto wird geöffnet …');const epoch=generation;
 try{if(photo.size>20*1024*1024)throw Error('Bitte ein Foto unter 20 MB auswählen.');const b=await decode(photo,epoch);try{if(b.width*b.height>30000000)throw Error('Bitte ein kleineres Foto auswählen.');if(epoch!==generation)return;imageWidth=b.width;imageHeight=b.height;image=document.createElement('canvas');const scale=Math.min(1,640/b.width);image.width=Math.round(b.width*scale);image.height=Math.round(b.height*scale);image.getContext('2d').drawImage(b,0,0,image.width,image.height);const c=$('regionCanvas');c.width=image.width;c.height=image.height;c.hidden=false;phase('choose_region','Bitte genau eine Datumszeile markieren.');}finally{b.close();}
 }catch(e){if(epoch===generation){image=null;phase('photo_error',e.message);diagnostics.push({at:new Date().toISOString(),stage:'photo_error',message:e.message});}}finally{if(epoch===generation){busy=false;updateSelection();}}
};
async function run(){
 if(!ready||busy||!photo||!regionPixels(selection,imageWidth,imageHeight)||!$('singleLine').checked)return;
 invalidate();const entry={id:attempts.length+1,at:new Date().toISOString(),status:'running',region:{...selection},loadMs,review:null,userConfirmedDatePurpose:'expiry',assistedOnly:true,automaticAccuracyEvaluated:false,started:performance.now()};attempts.push(entry);active=entry;busy=true;controls();phase('reading_region','Markierte Datumszeile wird gelesen …');const epoch=generation,file=photo;
 try{const bitmap=await decode(file,epoch);if(epoch!==generation){bitmap.close();return;}const result=await request('line',{bitmap,region:entry.region,confirmed:true},[bitmap]);if(epoch!==generation||active!==entry)return;entry.status='complete';entry.totalMs=Math.round(performance.now()-entry.started);delete entry.started;entry.result={accepted:result.accepted,reason:result.reason,choices:result.choices,confidences:result.confidences,times:result.times,width:result.width,height:result.height};$('results').hidden=false;$('decision').textContent=reasons[result.reason]||'Bitte Datum selbst prüfen.';$('timing').textContent=JSON.stringify({Laden_und_Start_ms:loadMs,Bereich_gesamt_ms:entry.totalMs,...result.times},null,2);
  for(const choice of result.choices){const button=document.createElement('button');button.textContent=Formats.format(choice.date,{locale:'de-CH',long:true})+' bestätigen und merken';button.onclick=()=>remember(choice,'reader_choice',entry);$('choices').append(button);}
  phase('awaiting_confirmation','Bereich gelesen. Bitte auf der Packung prüfen.');
 }catch(e){if(epoch===generation){entry.status='error';entry.totalMs=Math.round(performance.now()-entry.started);delete entry.started;entry.error=e.message;phase('line_error',e.message);diagnostics.push({at:new Date().toISOString(),stage:'line_error',message:e.message});}}finally{if(epoch===generation){busy=false;updateCount();controls();}}
}
function reference(value){
 const v=value.trim();let m=/^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);if(m){const date=Formats.iso(m[1],m[2],m[3]||1);return date?{date:m[3]?date:date.slice(0,7),precision:m[3]?'day':'month'}:null;}
 m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v);if(m){const date=Formats.iso(m[3],m[2],m[1]);return date?{date,precision:'day'}:null;}
 m=/^(\d{1,2})\.(\d{4})$/.exec(v);if(m){const date=Formats.iso(m[2],m[1],1);return date?{date:date.slice(0,7),precision:'month'}:null;}return null;
}
function remember(choice,source='manual_entry',entry=active){
 if(busy||!entry||entry!==active||entry.status!=='complete'||entry.review)return;const target=choice||reference($('reference').value);
 if(!target){session.lastValidationError='Bitte ein gültiges Datum mit vierstelligem Jahr eingeben, zum Beispiel 01.11.2025 oder 11.2025.';$('reviewStatus').textContent=session.lastValidationError;return;}
 session.lastValidationError=null;entry.review={at:new Date().toISOString(),target,source,matchedRegionChoice:entry.result.choices.some(c=>c.date===target.date&&c.precision===target.precision)};$('reference').value=target.date;$('reviewStatus').textContent='Bereichsprüfung gemerkt. Sie zählt als Hilfe, nicht als automatischer Treffer.';phase('saved','Bereichsprüfung gemerkt.');updateCount();controls();
}
function updateCount(){$('count').textContent=attempts.length+' Bereichsversuch(e), davon '+attempts.filter(x=>x.review).length+' mit bestätigtem Datum.';}
$('load').onclick=load;$('cancel').onclick=()=>stop();$('run').onclick=run;$('remember').onclick=()=>remember();
$('export').onclick=()=>{const data={schema:'reserve-mobile-date-line-v1',reportVersion:1,at:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},assistedOnly:true,automaticAccuracyEvaluated:false,dateRoleAutomaticallyInferred:false,physicalDeviceVerified:false,photosIncluded:false,ocrTextIncluded:false,session:{...session,ready,busy,loadMs,loadElapsedMs:loadStarted===null?null:loadMs??(busy?Math.round(performance.now()-loadStarted):loadElapsedMs),attemptCount:attempts.length,reviewCount:attempts.filter(x=>x.review).length,region:selectedRegion()},attempts:attempts.map(({started,...entry})=>({...entry,...(started===undefined?{}:{elapsedMs:Math.round(performance.now()-started)})})),diagnostics};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='reserve-datumszeile-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
function selectedRegion(){return selection?{...selection}:null;}
globalThis.RESERVE_LINE_PILOT={get state(){return{ready,busy,phase:session.phase,selection:selectedRegion(),attempts:attempts.length,reviewCount:attempts.filter(x=>x.review).length,active};}};
controls();
