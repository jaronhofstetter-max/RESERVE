/* RESERVE scalable recipe-index runtime v1. Loads compact metadata first and exposes fast candidate selection without changing recipe detail behavior. */
(function(){
  const N=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  let index=null;
  let loading=null;
  const uniq=a=>[...new Set(a)];
  const intersect=(a,b)=>{const s=new Set(b);return a.filter(x=>s.has(x))};

  window.loadRecipeIndex=function(){
    if(index)return Promise.resolve(index);
    if(loading)return loading;
    loading=fetch('data/recipe-index.json',{cache:'no-cache'})
      .then(r=>{if(!r.ok)throw new Error('recipe-index '+r.status);return r.json()})
      .then(x=>{if(!x||!x.recipes||!x.ingredients)throw new Error('invalid recipe index');index=x;window.recipeIndex=x;window.dispatchEvent(new CustomEvent('reserve:recipe-index-ready',{detail:{count:x.count||0}}));return x})
      .catch(err=>{console.warn('RESERVE recipe index unavailable; using full recipe fallback.',err);return null});
    return loading;
  };

  window.recipeCandidateIds=function(options={}){
    if(!index)return [];
    let ids=Object.keys(index.recipes||{});
    if(options.mealTime){const x=index.mealTimes?.[N(options.mealTime)]||[];ids=intersect(ids,x)}
    if(options.diet){const x=index.diet?.[N(options.diet)]||[];ids=intersect(ids,x)}
    if(Array.isArray(options.ingredients)&&options.ingredients.length){
      const lists=options.ingredients.map(n=>index.ingredients?.[N(n)]||[]).filter(x=>x.length);
      if(lists.length){const wanted=uniq(lists.flat());ids=intersect(ids,wanted)}
    }
    if(options.noCook)ids=intersect(ids,index.resilience?.noCook||[]);
    if(options.power==='none')ids=intersect(ids,index.resilience?.powerNone||[]);
    if(options.power==='low')ids=intersect(ids,uniq([...(index.resilience?.powerNone||[]),...(index.resilience?.powerLow||[])]));
    if(options.noRefrigeration)ids=intersect(ids,index.resilience?.noRefrigeration||[]);
    if(options.onePot)ids=intersect(ids,index.resilience?.onePot||[]);
    if(Number.isFinite(options.maxMinutes))ids=ids.filter(id=>{const r=index.recipes[id]||{},m=(r.prepMinutes||0)+(r.cookMinutes||0);return m<=options.maxMinutes});
    return ids;
  };

  window.recipeCandidates=function(options={}){
    const ids=window.recipeCandidateIds(options);
    const byId=new Map((window.recipes||[]).map(r=>[r.id,r]));
    return ids.map(id=>byId.get(id)).filter(Boolean);
  };

  window.recipeIndexStatus=function(){return index?{ready:true,count:index.count||Object.keys(index.recipes||{}).length}:{ready:false,count:0}};
  window.loadRecipeIndex();
})();
