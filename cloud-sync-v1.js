/* RESERVE cloud-ready sync layer v2.
   Local-first today; validates backups and includes per-recipe cooking progress. */
(function(){
  const KEYS=['reserveStock','reserveShopping','reserveProfile'];
  const COOK_PREFIX='reserveCookProgress:';
  const META='reserveSyncMeta';
  const MAX_BYTES=2*1024*1024;

  function deviceId(){let id=localStorage.getItem('reserveDeviceId');if(!id){id='dev-'+crypto.getRandomValues(new Uint32Array(3)).join('-');localStorage.setItem('reserveDeviceId',id)}return id}
  function readJSON(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function cookingProgress(){let out={};for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(k&&k.startsWith(COOK_PREFIX))out[k]=readJSON(k)}return out}
  function snapshot(){let data={schema:2,app:'RESERVE',updatedAt:new Date().toISOString(),deviceId:deviceId(),values:{},cookingProgress:cookingProgress()};KEYS.forEach(k=>data.values[k]=readJSON(k));return data}

  function validStock(v){return Array.isArray(v)&&v.every(x=>x&&typeof x==='object'&&typeof x.n==='string'&&typeof x.q==='string')}
  function validShopping(v){return Array.isArray(v)&&v.every(x=>typeof x==='string'||(x&&typeof x==='object'))}
  function validProfile(v){return v&&typeof v==='object'&&!Array.isArray(v)&&(v.people===undefined||(+v.people>=1&&+v.people<=50))}
  function validate(data){
    if(!data||typeof data!=='object')return 'Ungültiges Backup-Format.';
    if(data.app&&data.app!=='RESERVE')return 'Diese Datei ist kein RESERVE-Backup.';
    if(![1,2].includes(+data.schema))return 'Nicht unterstützte Backup-Version.';
    if(!data.values||typeof data.values!=='object')return 'Backup enthält keine RESERVE-Daten.';
    if(data.values.reserveStock!=null&&!validStock(data.values.reserveStock))return 'Vorratsdaten im Backup sind ungültig.';
    if(data.values.reserveShopping!=null&&!validShopping(data.values.reserveShopping))return 'Einkaufslistendaten im Backup sind ungültig.';
    if(data.values.reserveProfile!=null&&!validProfile(data.values.reserveProfile))return 'Profildaten im Backup sind ungültig.';
    if(data.cookingProgress!=null&&(typeof data.cookingProgress!=='object'||Array.isArray(data.cookingProgress)))return 'Kochfortschritt im Backup ist ungültig.';
    return null;
  }
  function clearCookingProgress(){let keys=[];for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(k&&k.startsWith(COOK_PREFIX))keys.push(k)}keys.forEach(k=>localStorage.removeItem(k))}
  function apply(data){let error=validate(data);if(error){alert(error);return false}KEYS.forEach(k=>{if(data.values[k]!==undefined&&data.values[k]!==null)localStorage.setItem(k,JSON.stringify(data.values[k]))});clearCookingProgress();if(data.cookingProgress){Object.entries(data.cookingProgress).forEach(([k,v])=>{if(k.startsWith(COOK_PREFIX)&&v!==undefined&&v!==null)localStorage.setItem(k,JSON.stringify(v))})}localStorage.setItem(META,JSON.stringify({lastSync:new Date().toISOString(),source:'import',schema:+data.schema}));location.reload();return true}
  function downloadBackup(){let blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reserve-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function importBackup(file){if(!file)return;if(file.size>MAX_BYTES){alert('Backup ist zu gross. Maximal 2 MB sind erlaubt.');return}let r=new FileReader();r.onload=()=>{try{let data=JSON.parse(r.result);let error=validate(data);if(error){alert(error);return}if(confirm('Backup importieren? Dein aktueller Vorrat, Einkauf, Profil und gespeicherter Kochfortschritt werden durch die Backup-Daten ersetzt.'))apply(data)}catch(e){alert('Backup konnte nicht gelesen werden.')}};r.onerror=()=>alert('Backup konnte nicht gelesen werden.');r.readAsText(file)}
  function mount(){let panel=document.getElementById('profile');if(!panel||document.getElementById('reserveSyncCard'))return;let card=document.createElement('div');card.className='card';card.id='reserveSyncCard';card.innerHTML='<h2>Datensicherung & Synchronisation</h2><p class="muted">RESERVE arbeitet lokal auf diesem Gerät. Das Backup enthält Vorrat, Einkaufsliste, Profil und gespeicherten Kochfortschritt. Vor einem Import werden Datei und Datenstruktur geprüft.</p><div class="grid2"><button id="reserveExport">Backup exportieren</button><label class="secondary" style="display:flex;align-items:center;justify-content:center;padding:10px 13px;border-radius:9px;font-weight:800;cursor:pointer;margin-top:8px">Backup importieren<input id="reserveImport" type="file" accept="application/json,.json" style="display:none"></label></div><p class="small muted">Geräte-ID: '+deviceId()+'</p>';
    panel.appendChild(card);document.getElementById('reserveExport').onclick=downloadBackup;document.getElementById('reserveImport').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=''}}
  window.RESERVE_SYNC={snapshot,apply,validate,deviceId};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
