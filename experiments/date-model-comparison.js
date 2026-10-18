/* Private-data-free experimental harness. Labels only enter score(), never inference. */
(()=>{'use strict';
const $=id=>document.getElementById(id),api=window.RESERVE_EXPIRY_CAMERA;
const expectedModelSha='f324d21f4c11e87d2f8fa7adb581616f9e1aa1db5310a1301346361f878b192d';
let photos=[],labels=new Map(),model=null,modelSha='',running=false,staged=null;
const rows=[],offset={baseline:0,candidate:0};
window.RESERVE_EXPIRY_VISION={available:()=>false};
window.RESERVE_EXPIRY_LEARNING={stage:(file,result)=>{staged={...result};},setExpanded:()=>{}};
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
$('modelFile').onchange=async()=>{try{model=new Uint8Array(await $('modelFile').files[0].arrayBuffer());modelSha=hex(await crypto.subtle.digest('SHA-256',model));if(modelSha!==expectedModelSha){model=null;throw Error('Modell-Prüfsumme stimmt nicht überein.');}$('testStatus').textContent='Gemeinsames Modell v1 geprüft und geladen.';}catch(e){$('testStatus').textContent=e.message;}};
$('testPhotos').onchange=()=>{if(rows.length){$('testStatus').textContent='Für eine neue Messreihe Seite neu laden.';return;}photos=Array.from($('testPhotos').files).sort((a,b)=>a.name.localeCompare(b.name));$('testStatus').textContent=photos.length+' Bilder ausgewählt.';};
$('labelsFile').onchange=async()=>{try{const data=JSON.parse(await $('labelsFile').files[0].text());labels=new Map(data.records.map(r=>[r.id,r]));renderSummary();$('testStatus').textContent=labels.size+' bestätigte Angaben für die Auswertung geladen.';}catch(e){$('testStatus').textContent=e.message;}};
function score(row){const id=row.file.slice(0,row.file.lastIndexOf('.')),g=labels.get(id);if(!g)return 'Ohne Sollwert';if(['DAT-051','DAT-082','DAT-089'].includes(id))return row.value?'Sonderfall: Datum eingesetzt':'Sonderfall: leer';if(!row.value)return 'Nicht erkannt';return row.value===g.confirmed_date&&row.precision===g.precision?'Exakt richtig':'Falsch oder unvollständig';}
function renderSummary(){const sum={};for(const arm of ['baseline','candidate']){const a=rows.filter(x=>x.arm===arm);sum[arm]={tested:a.length,correct:a.filter(x=>score(x)==='Exakt richtig').length,wrong:a.filter(x=>score(x)==='Falsch oder unvollständig').length,blank:a.filter(x=>score(x)==='Nicht erkannt').length,special:a.filter(x=>score(x).startsWith('Sonderfall')).length};}$('summary').textContent=JSON.stringify(sum,null,2);}
async function newWorker(T,arm){const w=await T.createWorker('eng',1,{logger:()=>{}});if(arm==='candidate'){await w.FS('writeFile',['eng.traineddata',model]);await w.reinitialize('eng',1);}return w;}
async function batch(arm){if(running)return;if(!photos.length||arm==='candidate'&&!model){$('testStatus').textContent='Bitte Bilder und geprüftes Modell auswählen.';return;}running=true;$('runBaseline').disabled=$('runCandidate').disabled=true;
try{await api.experimentResetWorker();window.RESERVE_DATE_TEST_WORKER=T=>newWorker(T,arm);
// Warm the selected model before timed inference for both arms. Both still have the same 10 s deadline.
let warm=null;const T=await new Promise((ok,no)=>{if(window.Tesseract)return ok(window.Tesseract);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=()=>ok(window.Tesseract);s.onerror=()=>no(Error('OCR konnte nicht geladen werden'));document.head.appendChild(s);});
warm=await newWorker(T,arm);let supplied=false;window.RESERVE_DATE_TEST_WORKER=async()=>{if(!supplied){supplied=true;return warm;}return newWorker(T,arm);};
const stop=Math.min(photos.length,offset[arm]+5);
while(offset[arm]<stop){const file=photos[offset[arm]];$('testStatus').textContent=arm+' · '+(offset[arm]+1)+' / '+photos.length+' · '+file.name;
const field=$('scanExpiry');field.value='';delete field.dataset.effectiveDate;delete field.dataset.datePrecision;field.type='date';staged=null;
const started=performance.now();await api.processFile(file);
const row={file:file.name,arm,value:field.value,precision:field.value?field.dataset.datePrecision||'day':null,effectiveDate:field.dataset.effectiveDate||'',status:$('expiryCameraStatus').textContent,ms:Math.round(performance.now()-started),staged:staged?{source:staged.source,raw:staged.raw||'',date:staged.date,precision:staged.precision,confidence:staged.confidence,variants:staged.variants}:null};
rows.push(row);offset[arm]++;const tr=document.createElement('tr');for(const value of [row.file,arm,row.value||'—',row.precision||'—',score(row),(row.ms/1000).toFixed(2)+' s']){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);}$('results').appendChild(tr);renderSummary();
}
await api.experimentResetWorker();if(!supplied)await warm.terminate();$('testStatus').textContent=arm+' · '+offset[arm]+' / '+photos.length+' abgeschlossen';
}catch(e){$('testStatus').textContent='Testfehler: '+e.message;}finally{running=false;$('runBaseline').disabled=$('runCandidate').disabled=false;}}
$('runBaseline').onclick=()=>batch('baseline');$('runCandidate').onclick=()=>batch('candidate');
$('exportResults').onclick=()=>{const payload={schema:'reserve-date-paired-browser-v1',at:new Date().toISOString(),appBaselineCommit:'66b482277bf0deab13d91e9eaa0927d86ce7d60b',modelSha,warmStart:true,visionDisabledBothArms:true,productionActivation:false,rows:rows.map(r=>({...r,evaluation:score(r)}))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='reserve-date-browser-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
})();