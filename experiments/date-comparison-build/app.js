import Formats from '../../date-format-v1.js';
const $=id=>document.getElementById(id),rows=[],diagnostics=[];let worker=null,ready=false,busy=false,seq=0,lifecycle=0,current=null,previewURL='',loadMs=null,manifest=null,pending=null,downloadAbort=null;
const session={phase:'not_started',updatedAt:new Date().toISOString(),loadStartedAt:null,loadElapsedMs:null,filesLoaded:0,filesTotal:null,lastValidationError:null};let loadStart=null;
const labels={'model-v4':'Basisleser wird vorbereitet …','model-v5':'Zusatzleser wird vorbereitet …','read-v4':'Datumsaufdruck wird gelesen …','read-v5':'Zusatzleser prüft den Aufdruck …'};
function phase(name){session.phase=name;session.updatedAt=new Date().toISOString();}
function status(text){$('status').textContent=text;}
function controls(){ $('load').disabled=busy;$('cancel').hidden=!busy;$('photo').disabled=!ready||busy;$('run').disabled=!ready||busy||!$('photo').files.length;}
function stop(message='Abgebrochen. Bitte Modelle erneut laden.'){
 if(message){diagnostics.push({at:new Date().toISOString(),stage:'stopped',message});phase('stopped');}if(loadStart!==null&&loadMs===null)session.loadElapsedMs=Math.round(performance.now()-loadStart);lifecycle++;seq++;downloadAbort?.abort();downloadAbort=null;worker?.terminate();worker=null;ready=false;busy=false;if(pending){clearTimeout(pending.timer);pending.reject(Error(message));pending=null;}controls();status(message);
}
function request(type,payload={},transfer=[],timeout=60000){
 const id=++seq;return new Promise((resolve,reject)=>{pending={id,resolve,reject,timer:setTimeout(()=>stop('Die Verarbeitung dauert zu lange. Bitte neu starten.'),timeout)};worker.postMessage({type,id,...payload},transfer);});
}
function receive({data}){
 if(!pending||data.id!==pending.id)return;if(data.type==='phase'){phase(data.name);status(labels[data.name]||'Erkennung läuft …');return;}
 if(!['ready','result','error'].includes(data.type))return;clearTimeout(pending.timer);const p=pending;pending=null;if(data.type==='error')p.reject(Error(data.message));else p.resolve(data);
}
const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
async function fetchFile(file,signal){
 const url=new URL(file.url,location.href);if(url.origin!==location.origin||file.bytes>80*1024*1024)throw Error('Ungültige Laufzeitdatei.');
 const response=await fetch(url,{credentials:'omit',signal});if(!response.ok)throw Error('Laufzeitdatei konnte nicht geladen werden.');const data=await response.arrayBuffer();if(data.byteLength!==file.bytes||hex(await crypto.subtle.digest('SHA-256',data))!==file.sha256)throw Error('Laufzeitdatei stimmt nicht mit dem geprüften Stand überein.');return data;
}
async function load(){
 stop('');$('export').disabled=false;busy=true;current=null;$('results').hidden=true;session.lastValidationError=null;loadMs=null;loadStart=performance.now();session.loadStartedAt=new Date().toISOString();session.loadElapsedMs=null;session.filesLoaded=0;session.filesTotal=null;phase('loading_runtime');downloadAbort=new AbortController();const signal=downloadAbort.signal;controls();const generation=lifecycle,start=loadStart;status('Laufzeitdateien werden geladen …');
 try{
  manifest=await (await fetch('../assets/date-comparison/runtime-manifest.json',{credentials:'omit',signal})).json();$('downloadNote').textContent='Einmaliger Download: etwa '+Math.ceil(manifest.totalBytes/1000000)+' MB. Fotos werden nicht hochgeladen.';
  const files={};session.filesTotal=manifest.files.length;let complete=0;for(const entry of manifest.files){files[entry.key]=await fetchFile(entry,signal);if(lifecycle!==generation)return;session.filesLoaded=++complete;status('Laufzeit laden: '+complete+'/'+manifest.files.length);}
  const code=files.worker;delete files.worker;const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));worker=new Worker(url);worker.onmessage=receive;worker.onerror=()=>{if(generation===lifecycle)stop('Browser-Erkennung konnte nicht starten. Bitte erneut laden.');};
  const init=await request('init',{files},Object.values(files),60000);URL.revokeObjectURL(url);if(generation!==lifecycle)return;ready=true;loadMs=Math.round(performance.now()-start);session.loadElapsedMs=loadMs;phase('ready');status('Bereit. Laden und Start: '+(loadMs/1000).toFixed(1)+' Sekunden.');
 }catch(e){if(generation===lifecycle){phase('load_error');session.loadElapsedMs=Math.round(performance.now()-start);status('Ladefehler: '+e.message);diagnostics.push({at:new Date().toISOString(),stage:'load_error',message:e.message,ms:session.loadElapsedMs});ready=false;}}finally{if(generation===lifecycle){busy=false;controls();}}
}
function display(p){return p?Formats.format(p.date,{locale:'de-CH',long:true}):'Kein eindeutiger Vorschlag';}
function show(result){
 current=result;current.saved=false;session.lastValidationError=null;$('remember').disabled=false;phase('awaiting_confirmation');$('results').hidden=false;$('base').textContent=display(result.baseline);$('combined').textContent=display(result.candidate);$('reference').value='';$('assisted').textContent='';$('reviewStatus').textContent='';$('yearChoices').replaceChildren();$('matches').disabled=!result.candidate;
 const times={Laden_und_Start_ms:loadMs,Basis_ms:result.v4Ms,Zusatzleser_ms:result.v5Ms,Gesamt_mit_Dekodierung_ms:result.wallMs,Bildbreite:result.width,Bildhöhe:result.height,Zusatzleser_verwendet:result.usedFallback};$('timing').textContent=JSON.stringify(times,null,2);
 for(const token of result.shortYears||[]){const box=document.createElement('div'),title=document.createElement('p'),label=document.createElement('label'),input=document.createElement('input'),buttons=document.createElement('div');title.textContent='Gelesen: '+token.printed;label.textContent='Vollständiges Jahr bestätigen';input.placeholder='JJJJ';input.type='text';input.inputMode='numeric';input.maxLength=4;label.append(input);input.oninput=()=>{buttons.replaceChildren();for(const choice of Formats.confirmYear(token,input.value)){const b=document.createElement('button');b.className='secondary';b.type='button';b.textContent=display(choice)+' bestätigen und merken';b.onclick=()=>{if(current!==result)return;result.assisted=choice;$('assisted').textContent='Nach deiner Bestätigung: '+display(choice);$('reference').value=choice.date;remember();};buttons.append(b);}};box.append(title,label,buttons);$('yearChoices').append(box);}
}
function decode(file,generation){return new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{done=true;reject(Error('Das Foto konnte nicht rechtzeitig geöffnet werden. Bitte einen kleineren Ausschnitt wählen.'));},15000);createImageBitmap(file).then(bitmap=>{clearTimeout(timer);if(done||generation!==lifecycle){bitmap.close();if(!done)reject(Error('Abgebrochen.'));return;}done=true;resolve(bitmap);},error=>{clearTimeout(timer);if(!done){done=true;reject(error);}});});}
async function run(file,forceV5=false){
 if(!ready||busy||!file)return;$('export').disabled=false;busy=true;controls();$('results').hidden=true;current=null;session.lastValidationError=null;phase('decoding_photo');status('Foto wird vorbereitet …');const start=performance.now(),generation=lifecycle;
 try{
  if(file.size>20*1024*1024)throw Error('Bitte ein Foto unter20MB oder einen Ausschnitt auswählen.');
  const bitmap=await decode(file,generation);if(generation!==lifecycle){bitmap.close();return null;}if(bitmap.width*bitmap.height>30000000){bitmap.close();throw Error('Bitte einen kleineren Bildausschnitt wählen.');}
  const result=await request('photo',{bitmap,forceV5},[bitmap],60000);if(generation!==lifecycle)return null;result.wallMs=Math.round(performance.now()-start);show(result);status('Fertig. Bitte das Ergebnis mit der Packung vergleichen.');return result;
 }catch(e){if(generation===lifecycle){phase('photo_error');status(e.message);diagnostics.push({at:new Date().toISOString(),stage:'photo_error',message:e.message,fileBytes:file.size,ms:Math.round(performance.now()-start)});}return null;}finally{if(generation===lifecycle){busy=false;controls();}}
}
function reference(value){
 value=value.trim();let m=/^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);if(m){const full=Formats.iso(m[1],m[2],m[3]||1);return full?{date:m[3]?full:full.slice(0,7),precision:m[3]?'day':'month'}:null;}
 m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);if(m){const date=Formats.iso(m[3],m[2],m[1]);return date?{date,precision:'day'}:null;}
 m=/^(\d{1,2})\.(\d{4})$/.exec(value);if(m){const date=Formats.iso(m[2],m[1],1);return date?{date:date.slice(0,7),precision:'month'}:null;}return null;
}
function remember(){
 if(!current||current.saved||busy)return;const target=reference($('reference').value);if(!target){session.lastValidationError='Bitte ein gültiges Datum mit vierstelligem Jahr eingeben: zum Beispiel 10.03.2027 oder 03.2027. Bei kurzem Jahr kannst du oben das vollständige Jahr und die passende Reihenfolge bestätigen.';$('reviewStatus').textContent=session.lastValidationError;$('reference').focus();return;}session.lastValidationError=null;
 const match=p=>!!p&&p.date===target.date&&p.precision===target.precision;
 rows.push({at:new Date().toISOString(),baseline:current.baseline,candidate:current.candidate,usedFallback:current.usedFallback,target,baselineCorrect:match(current.baseline),candidateCorrect:match(current.candidate),assisted:current.assisted||null,loadMs,v4Ms:current.v4Ms,v5Ms:current.v5Ms,totalMs:current.wallMs,width:current.width,height:current.height});
 current.saved=true;phase('saved');$('count').textContent=rows.length+' Prüfung(en) auf diesem Gerät gemerkt.';$('reviewStatus').textContent='Prüfung gemerkt. Bitte das nächste Foto wählen.';$('remember').disabled=true;$('matches').disabled=true;$('yearChoices').replaceChildren();$('export').disabled=false;
}
$('load').onclick=load;$('cancel').onclick=()=>stop();
// The click handler must start the scan after resetting the per-photo save guard.
$('run').onclick=()=>{$('remember').disabled=false;return run($('photo').files[0]);};
$('photo').onchange=()=>{if(previewURL)URL.revokeObjectURL(previewURL);current=null;session.lastValidationError=null;phase(ready?'photo_selected':'not_ready');$('results').hidden=true;const file=$('photo').files[0];if(file){previewURL=URL.createObjectURL(file);$('preview').src=previewURL;$('preview').hidden=false;}else $('preview').hidden=true;controls();};
$('matches').onclick=()=>{if(current?.candidate&&!current.saved){$('reference').value=current.candidate.date;remember();}};$('remember').onclick=remember;
function report(){
 const proposal=p=>p?{date:p.date,precision:p.precision}:null;
 const result=current?{baseline:proposal(current.baseline),candidate:proposal(current.candidate),assisted:proposal(current.assisted),usedFallback:current.usedFallback,totalMs:current.wallMs,v4Ms:current.v4Ms,v5Ms:current.v5Ms,width:current.width,height:current.height,saved:!!current.saved}:null;
 const liveLoadMs=busy&&loadMs===null&&loadStart!==null?Math.round(performance.now()-loadStart):session.loadElapsedMs;
 return {schema:'reserve-mobile-comparison-v1',reportVersion:2,at:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},pipeline:manifest?.pipeline,physicalDeviceVerified:false,notIndependentAccuracyEvidence:true,photosIncluded:false,session:{...session,ready,busy,loadMs,loadElapsedMs:liveLoadMs,photoSelected:!!$('photo').files.length,savedCount:rows.length,currentResult:result,referenceValid:!!reference($('reference').value)},diagnostics,rows};
}
$('export').onclick=()=>{if(rows.length===0)$('count').textContent='Noch keine bestätigte Prüfung. Dieser Export enthält nur den aktuellen Status und vorhandene Zeitmessungen.';const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='reserve-handyvergleich-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
globalThis.RESERVE_MOBILE_COMPARE={runFixture:(file)=>run(file,true),reference,stop,get state(){return{ready,busy,rows:rows.length,current};}};
controls();
