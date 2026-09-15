/* RESERVE barcode search v2.1 — fast local lookup, curated Swiss fallback, then Open Food Facts v3. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),digits=s=>String(s||'').replace(/\D/g,'');
  const cache=new Map();let installTimer=null,sequence=0;
  // Verified Swiss products that public providers can miss. Keep provenance explicit and small;
  // the user's learned local catalogue remains the primary long-term source.
  const SWISS={
    '7616800460383':{name:'M-Classic Berner Rösti',qty:'250 g',cat:'Kartoffeln',brand:'M-Classic',source:'Migros Migipedia',verified:'2026-09-15'}
  };
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
  function variants(raw){
    const code=digits(raw),out=[];const add=x=>{x=digits(x);if(x&&x.length>=8&&!out.includes(x))out.push(x)};
    add(code);
    // UPC-A is commonly represented as EAN-13 with one leading zero; GTIN-14 may add another.
    if(code.length===12)add('0'+code);
    if(code.length===13&&code[0]==='0')add(code.slice(1));
    if(code.length===14&&code[0]==='0')add(code.slice(1));
    return out;
  }
  function swiss(code){
    const p=SWISS[code];return p?{p,name:p.name,qty:p.qty,cat:p.cat,source:p.source}:null;
  }
  async function v3One(code){
    const fields='code,product_name,product_name_de,brands,quantity,product_quantity,product_quantity_unit,categories,categories_tags,nutriments';
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),2200);
    try{
      const url='https://world.openfoodfacts.org/api/v3/product/'+encodeURIComponent(code)+'?product_type=food&cc=ch&lc=de&fields='+encodeURIComponent(fields);
      const r=await fetch(url,{headers:{Accept:'application/json'},signal:ctl.signal});
      if(!r.ok)return null;
      const d=await r.json(),p=d?.product||d?.result?.product||null;if(!p)return null;
      const name=String(p.product_name_de||p.product_name||'').trim();if(!name)return null;
      const classification=window.RESERVE_BARCODE?.foodClassification?.(p);if(classification?.state==='non-food')return null;
      return{p,name,qty:qtyOf(p),cat:window.RESERVE_BARCODE?.categoryFor?.(name,p.categories)||'Sonstiges',source:'Open Food Facts'};
    }catch(_){return null}finally{clearTimeout(timer)}
  }
  async function search(code){
    if(cache.has(code))return cache.get(code);
    const task=(async()=>{
      for(const v of variants(code)){const local=swiss(v);if(local)return local}
      for(const v of variants(code)){const hit=await v3One(v);if(hit)return hit}
      return null;
    })();cache.set(code,task);return task;
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
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
    const box=$('barcodeResult');if(box)box.innerHTML='<div class="available-card"><b>'+esc(hit.name)+'</b><div class="small">Produktdaten gefunden'+(hit.source?' · '+esc(hit.source):'')+'.</div></div>';
    return false;
  }
  function install(){
    const api=window.RESERVE_BARCODE;if(!api?.lookup||!window.RESERVE_BARCODE_LEARNING){installTimer=setTimeout(install,80);return}
    if(api.lookup.__reserveSearchV2)return;
    const original=api.lookup;
    const wrapped=async function(raw){
      const code=digits(raw),my=++sequence,out=await original.apply(this,arguments);
      if(!code||my!==sequence||!isUnknown(code))return out;
      const hit=await search(code);if(my!==sequence||!hit)return out;
      const learned=apply(code,hit);if(learned&&my===sequence)return original.call(this,code);return out;
    };
    wrapped.__reserveSearchV2=true;wrapped.__reserveSearchV2Original=original;api.lookup=wrapped;
    window.RESERVE_BARCODE_SEARCH={version:'2.1',lookup:search,lookupV3:search,isUnknown,variants,swissCatalog:SWISS};
  }
  install();window.addEventListener('pagehide',()=>clearTimeout(installTimer),{once:true});
})();
