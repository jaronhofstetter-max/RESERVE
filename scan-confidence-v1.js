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
  const rows=state();
  box.innerHTML=`<b>Scan-Ergebnis prüfen</b><ul class="scan-checklist" aria-label="Erfasste Angaben">${rows.map(x=>`<li class="scan-check-row scan-check-${x.level}"><span class="scan-check-label">${x.label}</span><span class="scan-check-mark" role="img" aria-label="${x.level==='ok'?'Vollständig':x.level==='check'?'Bitte prüfen':'Noch offen'}">${x.level==='ok'?'✓':''}</span></li>`).join('')}</ul>`;

}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function schedule(){clearTimeout(timer);timer=setTimeout(render,20)}
function install(){if(!$('scanChecklistStyle')){const style=document.createElement('style');style.id='scanChecklistStyle';style.textContent='.scan-checklist{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:12px}.scan-check-row{display:grid;grid-template-columns:minmax(0,1fr) 28px;gap:4px 12px;align-items:center}.scan-check-label{font-size:16px}.scan-check-mark{width:26px;height:26px;border:1.5px solid #b7c0b8;border-radius:7px;display:grid;place-items:center;font-size:23px;font-weight:800;line-height:1;color:#2f7a49}.scan-check-ok .scan-check-mark{border-color:#2f7a49;background:#edf7ef}.scan-check-check .scan-check-mark{color:#a66120;border-color:#a66120;background:#fff8ef;font-size:18px}.scan-check-hint{grid-column:1 / -1;font-size:13px;color:var(--muted);overflow-wrap:anywhere}.scan-check-check .scan-check-hint{color:#a66120}';document.head.appendChild(style)}const card=$('barcodeCard');if(!card||!$('scanAdd'))return setTimeout(install,120);['scanName','scanQty','scanExpiry','scanCat','scanContainerType'].forEach(id=>{const e=$(id);e?.addEventListener('input',schedule);e?.addEventListener('change',schedule)});observer=new MutationObserver(schedule);['barcodeResult','barcodeStatus','expiryCameraStatus','productCaptureAssistStatus','packagingVisionStatus'].forEach(id=>{const e=$(id);if(e)observer.observe(e,{childList:true,subtree:true,characterData:true})});render()}
window.RESERVE_SCAN_CONFIDENCE={version:'1.2',state,render,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
