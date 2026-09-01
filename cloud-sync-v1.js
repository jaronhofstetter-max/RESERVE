/* RESERVE cloud-ready sync layer.
   Local-first today; can be connected to a real authenticated backend without changing the pantry UI. */
(function(){
  const KEYS=['reserveStock','reserveShopping','reserveProfile','reserveCookProgress'];
  const META='reserveSyncMeta';
  function snapshot(){let data={schema:1,updatedAt:new Date().toISOString(),deviceId:deviceId(),values:{}};KEYS.forEach(k=>{try{data.values[k]=JSON.parse(localStorage.getItem(k)||'null')}catch(e){data.values[k]=null}});return data}
  function deviceId(){let id=localStorage.getItem('reserveDeviceId');if(!id){id='dev-'+crypto.getRandomValues(new Uint32Array(3)).join('-');localStorage.setItem('reserveDeviceId',id)}return id}
  function apply(data){if(!data||!data.values)return false;KEYS.forEach(k=>{if(data.values[k]!==undefined&&data.values[k]!==null)localStorage.setItem(k,JSON.stringify(data.values[k]))});localStorage.setItem(META,JSON.stringify({lastSync:new Date().toISOString(),source:'import'}));location.reload();return true}
  function downloadBackup(){let blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reserve-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function importBackup(file){let r=new FileReader();r.onload=()=>{try{apply(JSON.parse(r.result))}catch(e){alert('Backup konnte nicht gelesen werden.')}};r.readAsText(file)}
  function mount(){let panel=document.getElementById('profile');if(!panel||document.getElementById('reserveSyncCard'))return;let card=document.createElement('div');card.className='card';card.id='reserveSyncCard';card.innerHTML='<h2>Datensicherung & Synchronisation</h2><p class="muted">RESERVE arbeitet weiterhin lokal auf diesem Gerät. Du kannst deine Daten jetzt sichern und auf ein anderes Gerät übertragen. Für echte automatische Cloud-Synchronisation wird als nächster Schritt ein authentifizierter Backend-Dienst verbunden.</p><div class="grid2"><button id="reserveExport">Backup exportieren</button><label class="secondary" style="display:flex;align-items:center;justify-content:center;padding:10px 13px;border-radius:9px;font-weight:800;cursor:pointer;margin-top:8px">Backup importieren<input id="reserveImport" type="file" accept="application/json" style="display:none"></label></div><p class="small muted">Geräte-ID: '+deviceId()+'</p>';
    panel.appendChild(card);document.getElementById('reserveExport').onclick=downloadBackup;document.getElementById('reserveImport').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0])}}
  window.RESERVE_SYNC={snapshot,apply,deviceId};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
