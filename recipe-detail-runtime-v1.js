/* RESERVE lazy recipe detail runtime v1. Keeps planning/search on compact catalog and loads full recipe data only when cooking is opened. */
(function(){
  let manifest=null;
  let manifestPromise=null;
  const shardCache=new Map();
  const detailCache=new Map();

  function getRecipes(){try{return recipes}catch{return window.recipes||[]}}
  function replaceRecipe(full){const list=getRecipes(),i=list.findIndex(r=>r.id===full.id);if(i>=0)list[i]={...full,detailLoaded:true};else list.push({...full,detailLoaded:true});return list[i>=0?i:list.length-1]}

  window.loadRecipeDetailManifest=function(){
    if(manifest)return Promise.resolve(manifest);
    if(manifestPromise)return manifestPromise;
    manifestPromise=fetch('data/recipe-details-manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('detail manifest '+r.status);return r.json()}).then(x=>{manifest=x;return x});
    return manifestPromise;
  };

  async function loadShard(path){
    if(shardCache.has(path))return shardCache.get(path);
    const p=fetch(path,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('detail shard '+r.status);return r.json()}).then(rows=>{if(!Array.isArray(rows))throw new Error('invalid detail shard');for(const r of rows)detailCache.set(r.id,r);return rows});
    shardCache.set(path,p);return p;
  }

  window.loadRecipeDetail=async function(id){
    const existing=getRecipes().find(r=>r.id===id);
    if(existing?.detailLoaded||existing?.description&&existing?.steps?.[0]&&!existing.steps[0].startsWith('Rezeptdetails werden'))return existing;
    if(detailCache.has(id))return replaceRecipe(detailCache.get(id));
    try{
      const m=await window.loadRecipeDetailManifest(),path=m?.recipes?.[id];
      if(!path)throw new Error('recipe detail mapping missing');
      await loadShard(path);
      if(!detailCache.has(id))throw new Error('recipe not found in detail shard');
      return replaceRecipe(detailCache.get(id));
    }catch(err){
      console.warn('RESERVE lazy recipe detail failed; using full-database fallback.',err);
      const raw=await fetch('data/recipes.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('recipe fallback '+r.status);return r.json()});
      const full=raw.find(r=>r.id===id);if(!full)throw err;detailCache.set(id,full);return replaceRecipe(full);
    }
  };

  const baseStart=window.startCook;
  if(typeof baseStart==='function')window.startCook=async function(id){await window.loadRecipeDetail(id);return baseStart(id)};
  const baseRender=window.renderCook;
  if(typeof baseRender==='function')window.renderCook=async function(){const id=window.cookRecipe?.value||document.getElementById('cookRecipe')?.value;if(id)await window.loadRecipeDetail(id);return baseRender()};

  window.recipeDetailStatus=function(){return{manifestReady:!!manifest,loadedRecipes:detailCache.size,loadedShards:shardCache.size}};
})();
