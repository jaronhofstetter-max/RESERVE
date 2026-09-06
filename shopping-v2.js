/* RESERVE smart shopping list v3.0 — one prioritized list without mixing normal demand, emergency reserve and reserve replacement. */
(function(){
  function canonicalUnit(u){u=(u||'').toLowerCase();return u==='stuck'||u==='stk'||u==='stück'?'stück':u}
  function parseQty(q){try{return typeof parseAmount==='function'?parseAmount(q):null}catch{return null}}
  function normName(s){try{return typeof N==='function'?N(s):String(s||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,'')}catch{return String(s||'').toLowerCase()}}
  function intent(item){if(item?.reserveRotationGenerated)return 'reserve-rotation';if(item?.emergencyGenerated)return 'emergency-reserve';return 'normal'}
  function priority(item){const k=intent(item);if(k==='reserve-rotation')return 100;if(k==='emergency-reserve')return 90;if(item?.pantryIntelligenceGenerated)return 80;if(!item?.autopilotGenerated&&!item?.planGenerated)return 70;if(item?.planGenerated)return 60;if(item?.autopilotGenerated)return 55;return 50}
  function label(item){const k=intent(item);if(k==='reserve-rotation')return 'Reserve-Ersatz';if(k==='emergency-reserve')return 'Notvorrat';if(item?.pantryIntelligenceGenerated)return 'Vorrat';if(item?.planGenerated)return 'Wochenplan';if(item?.autopilotGenerated)return 'Rezept/Plan';return 'Manuell'}
  function mergeMeta(target,item){
    const flags=['autopilotGenerated','emergencyGenerated','reserveRotationGenerated','pantryIntelligenceGenerated','planGenerated','rotationAutomatic'];
    flags.forEach(k=>{if(item?.[k]===true)target[k]=true});
    const reasons=[...(target.shoppingReasons||[]),...(item?.shoppingReasons||[])];
    if(reasons.length)target.shoppingReasons=[...new Set(reasons)];
    if(item?.barcode&&!target.barcode)target.barcode=item.barcode;
    if(item?.rotationCreatedAt){const t=Date.parse(item.rotationCreatedAt),current=Date.parse(target.rotationCreatedAt||'');if(!Number.isFinite(current)||(Number.isFinite(t)&&t<current))target.rotationCreatedAt=item.rotationCreatedAt}
    if(item?.reserveSource&&!target.reserveSource)target.reserveSource=item.reserveSource;
    if(item?.replacesRotatedReserve===true)target.replacesRotatedReserve=true;
    return target
  }
  function finalize(item){item.shoppingKind=intent(item);item.shoppingPriority=priority(item);item.shoppingLabel=label(item);return item}
  function mergeShopping(items){
    const groups=new Map(),manual=[];
    (items||[]).forEach(item=>{
      const p=parseQty(item.q),bucket=intent(item);
      if(!p){manual.push(finalize({...item}));return}
      const unit=canonicalUnit(p.u),key=normName(item.n)+'|'+unit+'|'+bucket;
      if(!groups.has(key))groups.set(key,{n:item.n,v:0,u:unit,meta:{}});
      const g=groups.get(key);g.v+=p.v;mergeMeta(g.meta,item)
    });
    const merged=[...groups.values()].map(x=>finalize({n:x.n,q:fmt(x.v,x.u),...x.meta})).concat(manual);
    return merged.sort((a,b)=>(b.shoppingPriority||0)-(a.shoppingPriority||0)||String(a.n||'').localeCompare(String(b.n||''),'de'))
  }
  function persist(){localStorage.setItem('reserveShopping',JSON.stringify(shopping))}
  window.normalizeShopping=function(){shopping=mergeShopping(shopping);persist();return shopping};
  window.saveShop=function(){shopping=mergeShopping(shopping);persist();if(typeof renderShop==='function')renderShop()};
  window.addMissing=function(id){const r=recipes.find(x=>x.id===id);if(!r)return;missing(r).forEach(x=>shopping.push({n:x.i.name,q:fmt(x.miss,x.i.unit),autopilotGenerated:true,shoppingReasons:['Fehlt für gewähltes Rezept']}));saveShop()};
  function decorateShop(){
    const host=window.shopList||document.getElementById('shopList');if(!host)return;
    const rows=[...host.querySelectorAll('.shop')];rows.forEach((row,i)=>{const item=shopping[i];if(!item||row.querySelector('[data-smart-shopping]'))return;const meta=document.createElement('div');meta.dataset.smartShopping='1';meta.className='small muted';const reasons=(item.shoppingReasons||[]).join(' · ');meta.innerHTML=`<span class="pill">${item.shoppingLabel||label(item)}</span>${reasons?` <span>${reasons}</span>`:''}`;const buttons=row.querySelector('div');if(buttons)row.insertBefore(meta,buttons);else row.appendChild(meta)})
  }
  function installRenderHook(){
    if(window.__reserveShoppingV3RenderHook)return;const base=window.renderShop;if(typeof base!=='function')return;
    window.renderShop=function(){shopping=mergeShopping(shopping);persist();base();decorateShop()};window.__reserveShoppingV3RenderHook=true
  }
  function boot(){if(typeof shopping!=='undefined'&&Array.isArray(shopping)){shopping=mergeShopping(shopping);persist()}installRenderHook();if(typeof renderShop==='function')renderShop()}
  window.RESERVE_SHOPPING={version:'3.0',mergeShopping,intent,priority,label};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();