(()=>{
  'use strict';
  const normalize=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
  const split=s=>(s||'').split(/[,;\n]/).map(normalize).filter(Boolean);
  const aliases={
    gluten:['weizen','dinkel','roggen','gerste','hafer','mehl','brot','pasta','nudeln'],
    milch:['milch','butter','rahm','sahne','kaese','käse','joghurt','quark','molke','laktose'],
    ei:['ei','eier','eiern','mayonnaise'],
    eier:['ei','eier','eiern','mayonnaise'],
    erdnuss:['erdnuss','erdnüsse','erdnusse','peanut'],
    nuesse:['nuss','nüsse','nusse','mandel','haselnuss','walnuss','cashew','pistazie','pekannuss'],
    nusse:['nuss','nüsse','nusse','mandel','haselnuss','walnuss','cashew','pistazie','pekannuss'],
    soja:['soja','tofu','tempeh','edamame'],
    sellerie:['sellerie'],
    senf:['senf'],
    sesam:['sesam','tahini'],
    fisch:['fisch','lachs','thunfisch','forelle','sardine'],
    krebstiere:['garnele','garnelen','crevette','krebs','krabbe','hummer'],
    lupine:['lupine'],
    sulfite:['sulfit','sulfite','schwefeldioxid']
  };
  function terms(value){const n=normalize(value);return [n,...(aliases[n]||[]).map(normalize)].filter(Boolean)}
  function contains(text,term){const hay=' '+normalize(text)+' ',needle=' '+normalize(term)+' ';return hay.includes(needle)}
  function conflicts(recipe,avoid){
    const allergenText=(recipe.allergens||[]).join(' ');
    const ingredientText=(recipe.ingredients||[]).map(i=>i.name||'').join(' ');
    return avoid.some(a=>terms(a).some(t=>contains(allergenText,t)||contains(ingredientText,t)));
  }
  const originalAllowed=window.allowed;
  if(typeof originalAllowed==='function') window.allowed=function(recipe){
    if(!originalAllowed(recipe)) return false;
    let p={};try{p=JSON.parse(localStorage.getItem('reserveProfile')||'{}')}catch(_){ }
    return !conflicts(recipe,split(p.avoid));
  };
  function notice(){
    const profile=document.getElementById('profile');
    if(profile&&!document.getElementById('allergySafetyNotice')){
      const card=profile.querySelector('.card');
      if(card){
        const box=document.createElement('div');
        box.id='allergySafetyNotice';
        box.setAttribute('role','alert');
        box.style.cssText='margin:12px 0;padding:12px;border:1px solid #e08a2e;border-radius:10px;background:#fff8ef';
        box.innerHTML='<strong>Allergie-Sicherheit</strong><br><span class="small">RESERVE kann Rezepte anhand deiner Angaben filtern, ersetzt aber keine Prüfung der Zutaten- und Allergenkennzeichnung. Bei Allergien oder Unverträglichkeiten immer Produktetiketten, Spurenhinweise und Kreuzkontamination selbst prüfen. Im Zweifel nicht verwenden.</span>';
        const avoid=document.getElementById('avoid');
        if(avoid) avoid.insertAdjacentElement('afterend',box); else card.insertBefore(box,card.firstChild);
      }
    }
    const cook=document.getElementById('cookView');
    if(cook&&!document.getElementById('cookAllergyReminder')){
      const box=document.createElement('div');
      box.id='cookAllergyReminder';box.className='small';
      box.style.cssText='margin:10px 0;padding:10px;border-radius:9px;background:#fff8ef;border:1px solid #e08a2e';
      box.textContent='Allergien: Vor dem Kochen Zutatenetiketten, Spurenhinweise und mögliche Kreuzkontamination prüfen.';
      cook.parentElement.insertBefore(box,cook);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',notice); else notice();
  const observer=new MutationObserver(()=>notice());
  observer.observe(document.body,{childList:true,subtree:true});
})();
