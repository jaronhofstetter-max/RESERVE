/* RESERVE mobile UX v1.0 — lightweight smartphone navigation and touch optimizations. */
(function(){
  const MOBILE='(max-width: 750px)';
  function mount(){
    if(document.getElementById('reserveMobileUX'))return;
    const style=document.createElement('style');style.id='reserveMobileUX';style.textContent=`
@media(max-width:750px){
  body{padding-bottom:142px;-webkit-tap-highlight-color:transparent}
  header{padding:14px 12px 8px;position:relative;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;filter:none!important}
  header .brand{font-size:24px}
  header nav{position:fixed!important;top:auto!important;z-index:1000;left:0;right:0;bottom:0;margin:0;padding:7px 8px calc(7px + env(safe-area-inset-bottom));background:#173f35;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px;overflow:visible;box-shadow:0 -4px 18px #0002}
  header nav .tab{min-width:0;margin:0;padding:10px 3px;border:0;border-radius:10px;font-size:11px;line-height:1.15;overflow:hidden;text-overflow:ellipsis}
  header nav .tab{display:block!important}
  main{padding:12px}
  .card{padding:14px;margin-bottom:10px;border-radius:14px}
  .grid{gap:8px}.metric b{font-size:22px}
  button,input,select{min-height:44px}
  button{touch-action:manipulation}
  .cab-frame{grid-template-columns:minmax(0,1fr)!important;padding:0!important;gap:14px!important}
  .cab-product{min-width:0!important;width:100%;overflow:hidden}
  .cab-product strong,.cab-product span,.cab-product small{max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .recipe-card-grid{grid-template-columns:1fr!important}
}
@media(max-width:380px){header nav .tab{font-size:10px;padding-left:2px;padding-right:2px}.card{padding:12px}.cab-frame{grid-template-columns:minmax(0,1fr)!important}}
`;
    document.head.appendChild(style);
    const nav=document.querySelector('header nav');if(!nav)return;
    // All destinations remain visible in the mobile bottom navigation.
    const labels={home:'Home',stock:'Vorrat',menu:'Plan',shopping:'Einkauf',profile:'Profil'};
    [...nav.querySelectorAll('.tab')].forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/show\('([^']+)'/);if(m&&labels[m[1]]){btn.dataset.mobileLabel=labels[m[1]];btn.setAttribute('aria-label',labels[m[1]])}});
  }
  function simplifyCapture(){
    const $=id=>document.getElementById(id),card=$('barcodeCard');
    if(!card||card.dataset.simpleCapture||!$('productCommunityBox')||!$('expiryCameraBtn')||!$('scanContainerType'))return;
    card.dataset.simpleCapture='1';
    const heading=card.querySelector('h2');if(heading)heading.textContent='Produkt hinzufügen';
    card.querySelector(':scope > p.muted')?.remove();
    const step=(text,anchor)=>{if(!anchor)return;const h=document.createElement('h3');h.className='reserve-capture-step';h.textContent=text;anchor.before(h)};
    step('1 · Produkt scannen',$('barcodeInput')?.parentElement);
    step('2 · Angaben prüfen',$('scanName')?.parentElement);
    step('3 · MHD erfassen',$('scanExpiry')?.closest('.grid2'));
    $('startScan').textContent='Barcode scannen';
    $('scanName').placeholder='Produktname';$('scanName').setAttribute('aria-label','Produktname');
    $('scanQty').placeholder='Inhalt, z. B. 500 g';$('scanQty').setAttribute('aria-label','Inhalt pro Packung');
    const advanced=document.createElement('details');advanced.className='reserve-capture-options';const summary=document.createElement('summary');summary.textContent='Produktfoto & weitere Optionen';advanced.appendChild(summary);
    const community=$('productCommunityBox');community.before(advanced);advanced.appendChild(community);
    const description=community.querySelector('p');if(description)description.textContent='Fotografiere die Vorderseite der Verpackung.';
    community.querySelector('h3')?.remove();
    const exports=document.createElement('details');exports.className='reserve-capture-options';const exportTitle=document.createElement('summary');exportTitle.textContent='Daten exportieren';exports.appendChild(exportTitle);advanced.appendChild(exports);
    ['expiryMetricsExport','productCommunityExport'].forEach(id=>{const node=$(id);if(node)exports.appendChild(node)});
    const first=$('food')?.closest('.card');if(first&&!first.querySelector('details')){const details=document.createElement('details'),title=document.createElement('summary');details.className='reserve-capture-options';title.textContent='Ohne Barcode erfassen';details.appendChild(title);while(first.firstChild)details.appendChild(first.firstChild);details.querySelector('h2')?.remove();first.appendChild(details)}
    const style=document.createElement('style');style.textContent=`
      .reserve-capture-step{font-size:16px;margin:20px 0 8px;color:#246448}
      .reserve-capture-options{margin:12px 0;border:1px solid #dce4df;border-radius:12px;padding:10px 12px}
      .reserve-capture-options summary{cursor:pointer;font-size:15px;font-weight:700;min-height:28px;line-height:28px;color:#264c3d}
      .reserve-capture-options .item{border:0;padding:8px 0;margin:0}
      #barcodeCard #scanName,#barcodeCard #scanQty{font-size:16px}
      #barcodeCard:has(.available-card) #productCommunityPreview{display:none}
      #barcodeCard:has([data-product-image-replace]) #productCommunityCameraButton,#barcodeCard:has([data-product-image-replace]) #productCommunityGalleryButton{display:none}
      #stock:has(#reserveCabinet) #stockList{display:none}
      #barcodeCard .missing-card .small{display:none}
      #barcodeCard .available-card .small.muted{font-size:13px}
      #barcodeCard #expiryCameraBtn{font-size:15px}
      #barcodeCard #scanAdd{margin-top:12px;width:100%;min-height:48px}
      #barcodeCard #expiryCameraStatus:empty,#productCaptureAssistStatus:empty{display:none}
    `;document.head.appendChild(style);
    const hint=$('expiryCameraStatus');if(hint?.textContent==='📷 Datumsaufdruck möglichst groß fotografieren.')hint.textContent='Datum fotografieren oder eingeben.';
  }
  function syncActive(){if(!matchMedia(MOBILE).matches)return;const active=document.querySelector('.panel.active')?.id;document.querySelectorAll('header nav .tab').forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/show\('([^']+)'/);btn.setAttribute('aria-current',m&&m[1]===active?'page':'false')})}
  function boot(){mount();syncActive();simplifyCapture();let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;simplifyCapture();if(document.getElementById('barcodeCard')?.dataset.simpleCapture)observer.disconnect()})});observer.observe(document.body,{childList:true,subtree:true});document.querySelector('header nav')?.addEventListener('click',()=>requestAnimationFrame(syncActive));window.addEventListener('resize',syncActive,{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_MOBILE_UX={version:'1.1',mount,syncActive,simplifyCapture};
})();
