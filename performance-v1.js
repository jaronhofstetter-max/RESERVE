/* RESERVE performance v1.3 — keep mobile typing and navigation off expensive background work. */
(function(){
  let idleQueue=[],idleScheduled=false,searchTimer=null,searchTicket=0,typingTimer=null,typingUntil=0;
  const ric=window.requestIdleCallback||function(cb){return setTimeout(()=>cb({didTimeout:false,timeRemaining:()=>8}),40)};
  const SEARCH_DELAY_MS=140,MAX_SEARCH_RESULTS=36,TYPE_QUIET_MS=420;
  function isTyping(){return performance.now()<typingUntil}
  function markTyping(){
    typingUntil=performance.now()+TYPE_QUIET_MS;
    document.documentElement.classList.add('reserve-typing');
    clearTimeout(typingTimer);
    typingTimer=setTimeout(()=>document.documentElement.classList.remove('reserve-typing'),TYPE_QUIET_MS+40);
  }
  function installTypingCSS(){
    if(document.getElementById('reservePerfCss'))return;
    const s=document.createElement('style');s.id='reservePerfCss';s.textContent=`
      html.reserve-typing *,html.reserve-typing *::before,html.reserve-typing *::after{animation-play-state:paused!important;transition:none!important}
      #stock .card:not(#barcodeCard),#cabinetInventory .cab-product{content-visibility:auto;contain-intrinsic-size:auto 140px}
      #barcodeCard{contain:layout style paint}
    `;document.head.appendChild(s)
  }
  function schedule(){if(idleScheduled||isTyping())return;idleScheduled=true;ric(flush)}
  function idle(fn){idleQueue.push(fn);if(isTyping())setTimeout(schedule,TYPE_QUIET_MS+20);else schedule()}
  function flush(deadline){
    idleScheduled=false;
    if(isTyping()){setTimeout(schedule,TYPE_QUIET_MS+20);return}
    let budget=24;
    while(idleQueue.length&&budget--&&(deadline.didTimeout||deadline.timeRemaining()>2)){
      const fn=idleQueue.shift();try{fn()}catch(e){console.warn('RESERVE idle task',e)}
      if(isTyping())break;
    }
    if(idleQueue.length)schedule()
  }
  function lazyImages(root=document){
    if(isTyping())return;
    if(root?.nodeType===1&&root.matches?.('img:not([loading])')){root.loading='lazy';root.decoding='async'}
    root?.querySelectorAll?.('img:not([loading])').forEach(img=>{img.loading='lazy';img.decoding='async'})
  }
  function warmCore(){['data/recipe-catalog.json','data/recipe-index.json'].forEach(href=>{if(document.head.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='prefetch';l.href=href;l.as='fetch';l.crossOrigin='anonymous';document.head.appendChild(l)})}
  function observe(){
    if(!('MutationObserver'in window))return;
    const pending=new Set();let queued=false,retryTimer=null;
    const flushNodes=()=>{
      queued=false;
      if(isTyping()){clearTimeout(retryTimer);retryTimer=setTimeout(flushNodes,TYPE_QUIET_MS+30);return}
      const nodes=[...pending];pending.clear();for(const node of nodes)lazyImages(node)
    };
    const mo=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)pending.add(node);
      if(pending.size&&!queued){queued=true;if(isTyping())retryTimer=setTimeout(flushNodes,TYPE_QUIET_MS+30);else requestAnimationFrame(flushNodes)}
    });
    mo.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>{mo.disconnect();clearTimeout(retryTimer)},{once:true})
  }
  function activePanel(){return document.querySelector('.panel.active')?.id||'home'}
  function renderSearchNow(){
    if(typeof recipes==='undefined'||!window.searchResults||!window.recipeSearch)return;
    const q=N(recipeSearch.value),diet=fDiet?.value||'',difficulty=fDifficulty?.value||'',cuisine=fCuisine?.value||'',list=[];
    for(const r of recipes){
      if(diet&&r.diet!==diet)continue;
      if(difficulty&&r.difficulty!==difficulty)continue;
      if(cuisine&&r.cuisine!==cuisine)continue;
      if(q&&!N(r.name).includes(q)&&!r.ingredients.some(i=>N(i.name).includes(q)))continue;
      if(!allowed(r))continue;
      list.push(r);
      if(list.length>=MAX_SEARCH_RESULTS)break;
    }
    searchResults.innerHTML=`<div class="recipe-card-grid">${list.map(recipeCard).join('')}</div>${list.length===MAX_SEARCH_RESULTS?'<p class="small muted">Weitere Treffer werden beim Verfeinern der Suche angezeigt.</p>':''}`;
  }
  function renderSearchFast(){clearTimeout(searchTimer);const ticket=++searchTicket;searchTimer=setTimeout(()=>{if(ticket===searchTicket)renderSearchNow()},SEARCH_DELAY_MS)}
  function renderPanel(id){
    try{
      if(id==='home'){
        if(window.stockCount)stockCount.textContent=stock.length;
        if(window.recipeCount)recipeCount.textContent=recipes.length;
        if(window.dishCount)dishCount.textContent=recipes.filter(canCook).length;
        renderOnboarding();renderSmart();renderQuality();
      }else if(id==='stock')renderStock();
      else if(id==='menu')renderPlan();
      else if(id==='search')renderSearchNow();
      else if(id==='cook')renderCook();
      else if(id==='shopping')renderShop();
    }catch(e){console.warn('RESERVE panel render',id,e)}
  }
  function refreshFast(){
    if(window.stockCount)stockCount.textContent=stock.length;
    if(window.recipeCount)recipeCount.textContent=recipes.length;
    const id=activePanel();renderPanel(id);
    window.dispatchEvent(new CustomEvent('reserve:ui-refreshed',{detail:{panel:id}}));
  }
  function showFast(id,btn){
    document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===id));
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    if(btn)btn.classList.add('active');
    requestAnimationFrame(()=>setTimeout(()=>renderPanel(id),0));
  }
  function installHotPath(){
    try{window.renderSearch=renderSearchFast;renderSearch=renderSearchFast}catch(_){window.renderSearch=renderSearchFast}
    try{window.refresh=refreshFast;refresh=refreshFast}catch(_){window.refresh=refreshFast}
    try{window.show=showFast;show=showFast}catch(_){window.show=showFast}
  }
  function boot(){
    installTypingCSS();
    document.addEventListener('input',e=>{if(e.target?.matches?.('input,textarea,[contenteditable="true"]'))markTyping()},{capture:true,passive:true});
    document.addEventListener('keydown',e=>{if(e.target?.matches?.('input,textarea,[contenteditable="true"]'))markTyping()},{capture:true,passive:true});
    lazyImages();observe();installHotPath();idle(warmCore)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_PERFORMANCE={version:'1.3',idle,lazyImages,warmCore,renderSearchNow,renderSearchFast,refreshFast,showFast,isTyping,markTyping,maxSearchResults:MAX_SEARCH_RESULTS,searchDelayMs:SEARCH_DELAY_MS};
})();
