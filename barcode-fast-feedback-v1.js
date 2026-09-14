/* RESERVE barcode fast feedback v1.0 — show an editable product form immediately while online enrichment runs in the background. */
(function(){
  'use strict';
  const MEMORY_KEY='reserveBarcodeProductsV1';
  const $=id=>document.getElementById(id);
  let sequence=0,installTimer=null;
  function known(code){
    try{const m=JSON.parse(localStorage.getItem(MEMORY_KEY)||'{}');return !!m?.[String(code||'')]}catch(_){return false}
  }
  function immediate(code){
    const input=$('barcodeInput'),result=$('barcodeResult'),status=$('barcodeStatus'),name=$('scanName'),qty=$('scanQty'),expiry=$('scanExpiry'),cat=$('scanCat');
    if(input)input.value=code;
    if(result)result.innerHTML=`<div class="missing-card"><div><b>Neues Produkt · Barcode ${code}</b><div class="small">Produktdaten werden im Hintergrund geprüft. Name und Menge kannst du sofort eintragen.</div></div></div>`;
    if(name)name.value='';if(qty)qty.value='';if(expiry)expiry.value='';if(cat)cat.value='Sonstiges';
    if(status){status.className='small muted';status.textContent='Barcode erkannt – du kannst sofort weiterarbeiten.'}
  }
  function install(){
    const api=window.RESERVE_BARCODE;
    if(!api?.lookup){installTimer=setTimeout(install,80);return}
    if(api.lookup.__reserveFastFeedback)return;
    const original=api.lookup;
    const wrapped=async function(rawCode){
      const code=String(rawCode||'').replace(/\D/g,'');
      if(!code||known(code))return original.apply(this,arguments);
      const my=++sequence;
      immediate(code);
      const touched={name:false,qty:false,expiry:false,cat:false},saved={name:'',qty:'',expiry:'',cat:''};
      const fields=[['scanName','name'],['scanQty','qty'],['scanExpiry','expiry'],['scanCat','cat']];
      const listeners=[];
      for(const [id,key] of fields){const el=$(id);if(!el)continue;const fn=()=>{if(my!==sequence)return;touched[key]=true;saved[key]=el.value};el.addEventListener('input',fn,{passive:true});el.addEventListener('change',fn,{passive:true});listeners.push([el,fn])}
      try{
        await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
        const out=await original.apply(this,arguments);
        if(my===sequence){
          const restore=(id,key)=>{const el=$(id);if(el&&touched[key])el.value=saved[key]};
          restore('scanName','name');restore('scanQty','qty');restore('scanExpiry','expiry');restore('scanCat','cat');
        }
        return out;
      }finally{
        for(const [el,fn] of listeners){el.removeEventListener('input',fn);el.removeEventListener('change',fn)}
      }
    };
    wrapped.__reserveFastFeedback=true;wrapped.__reserveFastFeedbackOriginal=original;api.lookup=wrapped;
    window.RESERVE_BARCODE_FAST_FEEDBACK={version:'1.0'};
  }
  install();
  window.addEventListener('pagehide',()=>clearTimeout(installTimer),{once:true});
})();
