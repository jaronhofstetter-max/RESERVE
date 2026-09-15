/* RESERVE barcode search v2.2 — resolve verified Swiss products before slow online lookup, then use OFF v3. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),digits=s=>String(s||'').replace(/\D/g,'');
  const cache=new Map();let installTimer=null,sequence=0;
  const SWISS={
    '7616800460383':{name:'M-Classic Berner Rösti',qty:'250 g',cat:'Kartoffeln',brand:'M-Classic',source:'Migros Migipedia',verified:'2026-09-15'}
  };
  function qtyOf(p){const raw=String(p?.quantity||'').trim();if(raw&&window.RESERVE_BARCODE?.parsedAmount?.(raw))return window.RESERVE_MULTIPACK?.normalizeInput?.(raw)||raw;const v=Number(p?.product_quantity),u=String(p?.product_quantity_unit||'').toLowerCase();if(!(v>0))return'';if(u==='kg')return(v*1000)+' g';if(u==='g')return v+' g';if(u==='l')return(v*1000)+' ml';if(u==='ml')return v+' ml';return''}
  function variants(raw){const code=digits(raw),out=[];const add=x=>{x=digits(x);if(x&&x.length>=8&&!out.includes(x))out.push(x)};add(code);if(code.length===12)add('0'+code);if(code.length===13&&code[0]==='0')add(code.slice(1));if(code.length===14&&code[0]==='0')add(code.slice(1));return out}
  function swiss(code){for(const v of variants(code)){const p=SWISS[v];if(p)return{p,name:p.name,qty:p.qty,cat:p.cat,source:p.source}}return null}
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function show(code,hit){
    const input=$('barcodeInput'),name=$('scanName'),qty=$('scanQty'),expiry=$('scanExpiry'),cat=$('scanCat'),status=$('barcodeStatus'),box=$('barcodeResult');
    if(input)input.value=code;if(name)name.value=hit.name;if(qty)qty.value=hit.qty||'';if(expiry)expiry.value='';if(cat)cat.value=hit.cat||'Sonstiges';
    if(status){status.className='small good';status.textContent='Produkt erkannt – nur das Ablaufdatum dieser Packung ergänzen.'}
    if(box)box.innerHTML='<div class="available-card"><b>'+esc(hit.name)+'</b><div class="small">'+esc(hit.qty)+(hit.source?' · '+esc(hit.source):'')+'</div></div>';
    if(hit.qty)window.RESERVE_BARCODE_LEARNING?.rememberFinal?.(code,hit.name,hit.qty,hit.cat);
    try{window.dispatchEvent(new CustomEvent('reserve:barcode-product-found',{detail:{code,name:hit.name,source:hit.source||'unknown'}}))}catch(_){}
    return hit;
  }
  async function v3One(code){const fields='code,product_name,product_name_de,brands,quantity,product_quantity,product_quantity_unit,categories,categories_tags,nutriments';const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),2200);try{const url='https://world.openfoodfacts.org/api/v3/product/'+encodeURIComponent(code)+'?product_type=food&cc=ch&lc=de&fields='+encodeURIComponent(fields);const r=await fetch(url,{headers:{Accept:'application/json'},signal:ctl.signal});if(!r.ok)return null;const d=await r.json(),p=d?.product||d?.result?.product||null;if(!p)return null;const name=String(p.product_name_de||p.product_name||'').trim();if(!name)return null;const classification=window.RESERVE_BARCODE?.foodClassification?.(p);if(classification?.state==='non-food')return null;return{p,name,qty:qtyOf(p),cat:window.RESERVE_BARCODE?.categoryFor?.(name,p.categories)||'Sonstiges',source:'Open Food Facts'}}catch(_){return null}finally{clearTimeout(timer)}}
  async function search(code){code=digits(code);if(cache.has(code))return cache.get(code);const task=(async()=>{const local=swiss(code);if(local)return local;for(const v of variants(code)){const hit=await v3One(v);if(hit)return hit}return null})();cache.set(code,task);return task}
  function isUnknown(code){return digits($('barcodeInput')?.value)===digits(code)&&(($('barcodeResult')?.textContent||'').includes('Neues Produkt'))}
  function install(){
    const api=window.RESERVE_BARCODE;if(!api?.lookup||!window.RESERVE_BARCODE_LEARNING){installTimer=setTimeout(install,80);return}if(api.lookup.__reserveSearchV2)return;
    const original=api.lookup;
    const wrapped=async function(raw){const code=digits(raw),my=++sequence;if(!code)return original.apply(this,arguments);
      // Critical path: verified Swiss hits must never wait for OFF v2/v3 or an unknown-card transition.
      const local=swiss(code);if(local)return show(code,local);
      const out=await original.apply(this,arguments);if(my!==sequence||!isUnknown(code))return out;
      const hit=await search(code);if(my!==sequence||!hit)return out;return show(code,hit);
    };
    wrapped.__reserveSearchV2=true;wrapped.__reserveSearchV2Original=original;api.lookup=wrapped;
    window.RESERVE_BARCODE_SEARCH={version:'2.2',lookup:search,lookupV3:search,isUnknown,variants,swissCatalog:SWISS,swiss};
  }
  install();window.addEventListener('pagehide',()=>clearTimeout(installTimer),{once:true});
})();
