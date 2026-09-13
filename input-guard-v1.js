/* RESERVE input guard v1.0 — keep text entry responsive by deferring expensive UI work until typing is quiet. */
(function(){
  'use strict';
  const QUIET_MS=900;
  let typingUntil=0,refreshTimer=null,smartTimer=null,pendingRefresh=false,pendingSmart=false;
  const now=()=>performance.now();
  const isField=el=>!!el?.matches?.('input,textarea,[contenteditable="true"]');
  const isTyping=()=>now()<typingUntil;
  function markTyping(){typingUntil=now()+QUIET_MS;schedulePending()}
  function schedulePending(){
    if(pendingRefresh){clearTimeout(refreshTimer);refreshTimer=setTimeout(flushRefresh,QUIET_MS+40)}
    if(pendingSmart){clearTimeout(smartTimer);smartTimer=setTimeout(flushSmart,QUIET_MS+80)}
  }
  function lightCounters(){
    try{if(window.stockCount&&Array.isArray(window.stock))stockCount.textContent=stock.length}catch(_){ }
    try{if(window.recipeCount&&Array.isArray(window.recipes))recipeCount.textContent=recipes.length}catch(_){ }
  }
  let baseRefresh=window.refresh,baseSmart=window.renderSmart;
  function guardedRefresh(...args){
    if(isTyping()){
      lightCounters();pendingRefresh=true;schedulePending();return;
    }
    return typeof baseRefresh==='function'?baseRefresh.apply(this,args):undefined;
  }
  function guardedSmart(...args){
    if(isTyping()){
      pendingSmart=true;schedulePending();return;
    }
    return typeof baseSmart==='function'?baseSmart.apply(this,args):undefined;
  }
  function flushRefresh(){
    if(isTyping()){schedulePending();return}
    if(!pendingRefresh)return;
    pendingRefresh=false;
    try{baseRefresh?.()}catch(e){console.warn('RESERVE deferred refresh',e)}
  }
  function flushSmart(){
    if(isTyping()){schedulePending();return}
    if(!pendingSmart)return;
    pendingSmart=false;
    if(document.querySelector('.panel.active')?.id!=='home')return;
    try{baseSmart?.()}catch(e){console.warn('RESERVE deferred smart render',e)}
  }
  function install(){
    if(window.__reserveInputGuardInstalled)return;
    window.__reserveInputGuardInstalled=true;
    baseRefresh=window.refresh;baseSmart=window.renderSmart;
    try{window.refresh=guardedRefresh;refresh=guardedRefresh}catch(_){window.refresh=guardedRefresh}
    try{window.renderSmart=guardedSmart;renderSmart=guardedSmart}catch(_){window.renderSmart=guardedSmart}
    document.addEventListener('keydown',e=>{if(isField(e.target))markTyping()},{capture:true,passive:true});
    document.addEventListener('input',e=>{if(isField(e.target))markTyping()},{capture:true,passive:true});
    document.addEventListener('beforeinput',e=>{if(isField(e.target))markTyping()},{capture:true,passive:true});
    document.addEventListener('focusout',()=>setTimeout(()=>{typingUntil=0;flushRefresh();flushSmart()},80),true);
    window.RESERVE_INPUT_GUARD={version:'1.0',isTyping,markTyping,flushRefresh,flushSmart,quietMs:QUIET_MS};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
