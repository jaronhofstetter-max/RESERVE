/* RESERVE scan confidence v1.0 — one honest pre-add summary for product, quantity, packaging and expiry. */
(function(){'use strict';
const $=id=>document.getElementById(id);let observer=null,timer=0;
function state(){
  const name=$('scanName')?.value?.trim()||'',qty=$('scanQty')?.value?.trim()||'',pack=$('scanContainerType')?.value||'',expiry=$('scanExpiry')?.value||'',expiryText=$('expiryCameraStatus')?.textContent||'',packSel=$('scanContainerType');
  const validQty=!!qty&&!!window.RESERVE_BARCODE?.parsedAmount?.(qty),packConfirmed=packSel?.dataset.touched==='1',packConfidence=Number(packSel?.dataset.visualConfidence||packSel?.dataset.suggestionConfidence)||0,expiryUncertain=/unsicher|nicht automatisch/i.test(expiryText);
  return[
    {label:'Produkt',value:name||'Noch nicht erkannt',level:name?'ok':'open'},
    {label:'Menge',value:validQty?qty:'Noch nicht sicher erkannt',level:validQty?'ok':'open'},
    {label:'Verpackung',value:pack||(name?'Bitte auswählen':'Noch nicht erkannt'),level:pack?(packConfirmed||packConfidence>=.78?'ok':'check'):'open'},
    {label:'MHD',value:expiry?(expiryUncertain?'Bitte prüfen':expiry):'Noch fotografieren oder eingeben',level:expiry?(expiryUncertain?'check':'ok'):'open'}
  ];
}
function render(){
  const add=$('scanAdd');if(!add)return;
  let box=$('scanConfidenceSummary');if(!box){box=document.createElement('section');box.id='scanConfidenceSummary';box.className='item';box.style.cssText='margin-top:12px;padding:13px';add.before(box)}
  const rows=state(),ready=rows.slice(0,3).every(x=>x.level!=='open');
  box.innerHTML=`<b>Scan-Ergebnis prüfen</b><div style="display:grid;gap:7px;margin-top:9px">${rows.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px"><span>${x.level==='ok'?'✅':x.level==='check'?'⚠️':'○'} ${x.label}</span><strong style="text-align:right">${escapeHtml(x.value)}</strong></div>`).join('')}</div><div class="small ${ready?'good':'muted'}" style="margin-top:9px">${ready?'Angaben kurz prüfen.':'Fehlende Angaben ergänzen.'}</div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function schedule(){clearTimeout(timer);timer=setTimeout(render,20)}
function install(){const card=$('barcodeCard');if(!card||!$('scanAdd'))return setTimeout(install,120);['scanName','scanQty','scanExpiry','scanCat','scanContainerType'].forEach(id=>{const e=$(id);e?.addEventListener('input',schedule);e?.addEventListener('change',schedule)});observer=new MutationObserver(schedule);['barcodeResult','barcodeStatus','expiryCameraStatus','productCaptureAssistStatus','packagingVisionStatus'].forEach(id=>{const e=$(id);if(e)observer.observe(e,{childList:true,subtree:true,characterData:true})});render()}
window.RESERVE_SCAN_CONFIDENCE={version:'1.0',state,render,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
