/* RESERVE barcode search v2.0 — keep the fast local/v2 path, then retry unknown food barcodes with the current Open Food Facts v3 API. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),digits=s=>String(s||'').replace(/\D/g,'');
  const cache=new Map();let installTimer=null,sequence=0;
  function isUnknown(code){
    const input=digits($('barcodeInput')?.value),text=$('barcodeResult')?.textContent||'';
    return input===code&&text.includes('Neues Produkt');
  }
  function qtyOf(p){
    const raw=String(p?.quantity||'').trim();
    if(raw&&window.RESERVE_BARCODE?.parsedAmount?.(raw))return window.RESERVE_MULTIPACK?.normalizeInput?.(raw)||raw;
    const v=Number(p?.product_quantity),u=String(p?.product_quantity_unit||'').toLowerCase();
    if(!(v>0))return'';
    if(u==='kg')return (v*1000)+' g';if(u==='g')return v+' g';if(u==='l')return (v*1000)+' ml';if(u==='ml')return v+' ml';
    return'';
  }
  async function v3(code){
    if(cache.has(code))return cache.get(code);
    const task=(async()=>{
      const fields='code,product_name,product_name_de,brands,quantity,product_quantity,product_quantity_unit,categories,categories_tags,nutriments';
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),1800);
      try{
        const url='https://world.openfoodfacts.org/api/v3/product/'+encodeURIComponent(code)+'?product_type=food&cc=ch&lc=de&fields='+encodeURIComponent(fields);
        const r=await fetch(url,{headers:{Accept:'application/json'},signal:ctl.signal});
        if(!r.ok)return null;
        const d=await r.json(),p=d?.product||d?.result?.product||null;
        if(!p)return null;
        const name=String(p.product_name_de||p.product_name||'').trim();if(!name)return null;
        const classification=window.RESERVE_BARCODE?.foodClassification?.(p);
        if(classification?.state==='non-food')return null;
        return{p,name,qty:qtyOf(p),cat:window.RESERVE_BARCODE?.categoryFor?.(name,p.categories)||'Sonstiges'};
      }catch(_){return null}finally{clearTimeout(timer)}
    })();
    cache.set(code,task);return task;
  }
  function apply(code,hit){
    if(!hit||!isUnknown(code))return false;
    const name=$('scanName'),qty=$('scanQty'),cat=$('scanCat'),status=$('barcodeStatus');
    if(name&&!name.value.trim())name.value=hit.name;
    if(qty&&!qty.value.trim()&&hit.qty)qty.value=hit.qty;
    if(cat&&(!cat.value||cat.value==='Sonstiges'))cat.value=hit.cat;
    if(hit.qty&&window.RESERVE_BARCODE_LEARNING?.rememberFinal){
      window.RESERVE_BARCODE_LEARNING.rememberFinal(code,hit.name,hit.qty,hit.cat);
      return true;
    }
    if(status){status.className='small good';status.textContent='Produktdaten gefunden – fehlende Angaben bitte ergänzen.'}
    const box=$('barcodeResult');if(box)box.innerHTML='<div class="available-card"><b>'+hit.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</b><div class="small">Zusätzliche Produktdaten über Open Food Facts gefunden.</div></div>';
    return false;
  }
  function install(){
    const api=window.RESERVE_BARCODE;if(!api?.lookup||!window.RESERVE_BARCODE_LEARNING){installTimer=setTimeout(install,80);return}
    if(api.lookup.__reserveSearchV2)return;
    const original=api.lookup;
    const wrapped=async function(raw){
      const code=digits(raw),my=++sequence,out=await original.apply(this,arguments);
      if(!code||my!==sequence||!isUnknown(code))return out;
      const hit=await v3(code);if(my!==sequence||!hit)return out;
      const learned=apply(code,hit);
      if(learned&&my===sequence)return original.call(this,code);
      return out;
    };
    wrapped.__reserveSearchV2=true;wrapped.__reserveSearchV2Original=original;api.lookup=wrapped;
    window.RESERVE_BARCODE_SEARCH={version:'2.0',lookupV3:v3,isUnknown};
  }
  install();window.addEventListener('pagehide',()=>clearTimeout(installTimer),{once:true});
})();
