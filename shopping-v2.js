/* RESERVE smart shopping list: aggregate equal ingredients and compatible units. */
(function(){
  function canonicalUnit(u){u=(u||'').toLowerCase();return u==='stuck'||u==='stk'||u==='stück'?'stück':u}
  function parseQty(q){if(typeof parseAmount==='function')return parseAmount(q);return null}
  function mergeShopping(items){
    const groups=new Map(),manual=[];
    (items||[]).forEach(item=>{
      const p=parseQty(item.q);
      if(!p){manual.push({...item});return}
      const unit=canonicalUnit(p.u),key=N(item.n)+'|'+unit;
      if(!groups.has(key))groups.set(key,{n:item.n,v:0,u:unit});
      groups.get(key).v+=p.v;
    });
    return [...groups.values()].map(x=>({n:x.n,q:fmt(x.v,x.u)})).concat(manual);
  }
  window.normalizeShopping=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));};
  const oldSave=window.saveShop;
  window.saveShop=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));renderShop();};
  const oldAddMissing=window.addMissing;
  window.addMissing=function(id){let r=recipes.find(x=>x.id===id);if(!r)return;missing(r).forEach(x=>shopping.push({n:x.i.name,q:fmt(x.miss,x.i.unit)}));saveShop();};
  const oldRender=window.renderShop;
  window.renderShop=function(){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));oldRender();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(window.shopping){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));if(window.renderShop)renderShop();}});else if(window.shopping){shopping=mergeShopping(shopping);localStorage.setItem('reserveShopping',JSON.stringify(shopping));if(window.renderShop)renderShop();}
})();
