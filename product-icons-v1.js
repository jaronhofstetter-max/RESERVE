/* RESERVE product icons v1.0 — name-first food icon classification with safe category fallback. */
(function(){
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  function iconFor(s){
    const n=norm(s?.n),c=norm(s?.c);
    if(/essig|vinegar/.test(n))return'🍶';
    if(/poulet|huhn|hahn|chicken|geflugel/.test(n))return'🍗';
    if(/rind|beef|fleisch|schwein|wurst/.test(n))return'🥩';
    if(/brokkoli/.test(n))return'🥦';
    if(/tomat/.test(n))return'🍅';
    if(/kartoff/.test(n))return'🥔';
    if(/karott|mohre/.test(n))return'🥕';
    if(/zucchini|gurke/.test(n))return'🥒';
    if(/paprika|pepperoni/.test(n))return'🫑';
    if(/spinat|salat/.test(n))return'🥬';
    if(/ei$|eier|egg/.test(n))return'🥚';
    if(/apfel/.test(n))return'🍎';
    if(/banan/.test(n))return'🍌';
    if(/beere|erdbeer|himbeer|heidelbeer/.test(n))return'🍓';
    if(/orange|mandarine|zitrone/.test(n))return'🍊';
    if(/pasta|spaghetti|nudel/.test(n))return'🍝';
    if(/reis/.test(n))return'🍚';
    if(/brot|mehl|getreide|hafer|muesli|musli/.test(n))return'🌾';
    if(/milch/.test(n))return'🥛';
    if(/kase/.test(n))return'🧀';
    if(/joghurt|yogurt/.test(n))return'🥣';
    if(/fisch|lachs|thunfisch/.test(n))return'🐟';
    if(/wasser/.test(n))return'💧';
    if(/saft|getrank|limonade/.test(n))return'🧃';
    if(/dose|konserve/.test(n))return'🥫';
    if(/gemuse/.test(c))return'🥦';
    if(/frucht|obst/.test(c))return'🍎';
    if(/protein/.test(c))return'🍗';
    if(/milchprodukt/.test(c))return'🥛';
    if(/getreide|beilage/.test(c))return'🌾';
    return'📦';
  }
  function applyCabinet(){
    const rows=window.RESERVE_CABINET?.getStock?.()||[];
    document.querySelectorAll('.cab-product[data-index]').forEach(card=>{const i=Number(card.dataset.index),el=card.querySelector('.cab-icon');if(el&&rows[i])el.textContent=iconFor(rows[i])});
  }
  function applyDetail(){
    const detail=document.querySelector('#cabinetDetail:not([hidden]) .cab-detail-icon');if(!detail)return;
    const name=document.getElementById('cabEditName')?.value||'';
    const category=document.getElementById('cabEditCat')?.value||'';
    detail.textContent=iconFor({n:name,c:category});
  }
  function apply(){applyCabinet();applyDetail()}
  function boot(){apply();const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('input',e=>{if(e.target?.id==='cabEditName')requestAnimationFrame(applyDetail)});document.addEventListener('change',e=>{if(e.target?.id==='cabEditCat')requestAnimationFrame(applyDetail)});window.addEventListener('reserve:stock-changed',()=>requestAnimationFrame(apply))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_PRODUCT_ICONS={version:'1.0',iconFor,apply};
})();
