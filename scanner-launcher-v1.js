/* RESERVE standalone scanner launcher v1.0 — keeps camera work off the heavy app page. */
(function(){
  'use strict';
  const params=(()=>{try{return new URLSearchParams(location.search)}catch(_){return new URLSearchParams()}})();
  const scanned=String(params.get('reserveScanned')||'').replace(/\D/g,'');
  const returning=params.get('scannerReturn')==='1';
  const diag=params.get('reserveDiag')==='1';
  function cleanUrl(){
    try{const u=new URL(location.href);u.searchParams.delete('reserveScanned');u.searchParams.delete('scannerReturn');history.replaceState(null,'',u.pathname+(u.search||'')+'#stock')}catch(_){ }
  }
  function openScanner(){location.href='/scanner-standalone.html?diag='+(diag?'1':'0')+'&cb=standalone1'}
  function installButton(){
    const btn=document.getElementById('startScan');if(!btn)return setTimeout(installButton,100);
    if(btn.dataset.reserveStandalone==='1')return;
    const clone=btn.cloneNode(true);btn.replaceWith(clone);clone.dataset.reserveStandalone='1';clone.textContent='Kamera starten';clone.addEventListener('click',openScanner);
    const stop=document.getElementById('stopScan');if(stop)stop.style.display='none';
    const video=document.getElementById('barcodeVideo');if(video)video.style.display='none';
  }
  function showStock(){
    try{if(typeof window.show==='function')window.show('stock')}catch(_){ }
    const panel=document.getElementById('stock');if(panel)panel.classList.add('active');
  }
  function importScan(){
    if(!scanned&&!returning)return;
    showStock();
    if(!scanned){cleanUrl();setTimeout(()=>document.getElementById('barcodeCard')?.scrollIntoView({block:'start'}),250);return}
    let tries=0;
    const use=()=>{
      tries++;
      const input=document.getElementById('barcodeInput'),api=window.RESERVE_BARCODE;
      if(!input||!api?.lookup){if(tries<80)setTimeout(use,100);return}
      input.value=scanned;
      cleanUrl();
      try{api.lookup(scanned)}catch(_){ }
      setTimeout(()=>document.getElementById('barcodeCard')?.scrollIntoView({block:'start'}),250);
    };
    use();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installButton();importScan()},{once:true});else{installButton();importScan()}
  window.RESERVE_STANDALONE_SCANNER={version:'1.0',open:openScanner,scanned};
})();
