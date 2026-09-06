/* RESERVE smart shopping list v2.1: aggregate equal ingredients and compatible units without losing workflow metadata. */
(function(){
  function canonicalUnit(u){u=(u||'').toLowerCase();return u==='stuck'||u==='stk'||u==='stück'?'stück':u}
  function parseQty(q){if(typeof parseAmount==='function')return parseAmount(q);return null}
  function mergeMeta(target,item){
    const flags=['autopilotGenerated','emergencyGenerated','reserveRotationGenerated','pantryIntelligenceGenerated','planGenerated'];
    flags.forEach(k=>{if(item?.[k]===true)target[k]=true});
    const reasons=[...(target.shoppingReasons||[]),...(item?.shoppingReasons||[])];
    if(reasons.length)target.shoppingReasons=[...new Set(reasons)];
    if(item?.barcode&&!target.barcode)target.barcode=item.barcode;
    return target
  }
  function mergeShopping(items){
    const groups=new Map(),manual=[];
    (items||[]).forEach(item=>{
      const p=parseQty(item.q);
      if(!p){manual.push({...item});return}
      const unit=canonicalUnit(p.u),key=N(item.n)+'|'+unit;
      if(!groups.has(key))groups.set(key,{n:item.n,v:0,u:unit,meta:{}});
      const g=groups.get(key);g.v+=p.v;mergeMeta(g.meta,item)
    });
    return [...groups.values()].map(x=>({n:x.n,q:fmt(x.v,x.u),...x.meta})).concat(manual);
  }
  window.normalizeShopping=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));};
  window.saveShop=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));renderShop();};
  window.addMissing=function(id){let r=recipes.find(x=>x.id===id);if(!r)return;missing(r).forEach(x=>shopping.push({n:x.i.name,q:fmt(x.miss,x.i.unit)}));saveShop();};
  const oldRender=window.renderShop;
  window.renderShop=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));oldRender();};
  window.RESERVE_SHOPPING={version:'2.1',mergeShopping};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(window.shopping){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));if(window.renderShop)renderShop();}});else if(window.shopping){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));if(window.renderShop)renderShop();}
})();
