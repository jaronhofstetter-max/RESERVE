/* RESERVE input guard v1.1 — keep text entry responsive and defer expensive UI work until the user leaves form fields. */
(function(){
  'use strict';
  const QUIET_MS=1100,BLUR_GRACE_MS=220;
  let typingUntil=0,refreshTimer=null,smartTimer=null,blurTimer=null,pendingRefresh=false,pendingSmart=false,flushQueued=false;
  const now=()=>performance.now();
  const isField=el=>!!el?.matches?.('input,textarea,select,[contenteditable="true"]');
  const activeField=()=>isField(document.activeElement);
  const isTyping=()=>activeField()||now()<typingUntil;
  function markTyping(ms=QUIET_MS){typingUntil=Math.max(typingUntil,now()+ms);schedulePending()}
  function schedulePending(){
    if(pendingRefresh){clearTimeout(refreshTimer);refreshTimer=setTimeout(flushRefresh,QUIET_MS+80)}
    if(pendingSmart){clearTimeout(smartTimer);smartTimer=setTimeout(flushSmart,QUIET_MS+120)}
  }
  function lightCounters(){
    try{if(window.stockCount&&Array.isArray(window.stock))stockCount.textContent=stock.length}catch(_){ }
    try{if(window.recipeCount&&Array.isArray(window.recipes))recipeCount.textContent=recipes.length}catch(_){ }
  }
  const idle=fn=>{
    if(window.RESERVE_PERFORMANCE?.idle){window.RESERVE_PERFORMANCE.idle(fn);return}
    if('requestIdleCallback'in window){requestIdleCallback(()=>fn(),{timeout:1200});return}
    setTimeout(fn,40)
  };
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
    clearTimeout(refreshTimer);
    if(isTyping()){schedulePending();return}
    if(!pendingRefresh||flushQueued)return;
    pendingRefresh=false;flushQueued=true;
    idle(()=>{flushQueued=false;if(isTyping()){pendingRefresh=true;schedulePending();return}try{baseRefresh?.()}catch(e){console.warn('RESERVE deferred refresh',e)}})
  }
  function flushSmart(){
    clearTimeout(smartTimer);
    if(isTyping()){schedulePending();return}
    if(!pendingSmart)return;
    pendingSmart=false;
    if(document.querySelector('.panel.active')?.id!=='home')return;
    idle(()=>{if(isTyping()){pendingSmart=true;schedulePending();return}try{baseSmart?.()}catch(e){console.warn('RESERVE deferred smart render',e)}})
  }
  function install(){
    if(window.__reserveInputGuardInstalled)return;
    window.__reserveInputGuardInstalled=true;
    baseRefresh=window.refresh;baseSmart=window.renderSmart;
    try{window.refresh=guardedRefresh;refresh=guardedRefresh}catch(_){window.refresh=guardedRefresh}
    try{window.renderSmart=guardedSmart;renderSmart=guardedSmart}catch(_){window.renderSmart=guardedSmart}
    const onField=e=>{if(isField(e.target))markTyping()};
    document.addEventListener('focusin',onField,{capture:true,passive:true});
    document.addEventListener('keydown',onField,{capture:true,passive:true});
    document.addEventListener('input',onField,{capture:true,passive:true});
    document.addEventListener('beforeinput',onField,{capture:true,passive:true});
    document.addEventListener('change',onField,{capture:true,passive:true});
    document.addEventListener('focusout',()=>{
      clearTimeout(blurTimer);
      blurTimer=setTimeout(()=>{
        if(activeField()){markTyping();return}
        typingUntil=0;flushRefresh();flushSmart()
      },BLUR_GRACE_MS)
    },true);
    window.addEventListener('pagehide',()=>{clearTimeout(refreshTimer);clearTimeout(smartTimer);clearTimeout(blurTimer)},{once:true});
    window.RESERVE_INPUT_GUARD={version:'1.1',isTyping,markTyping,flushRefresh,flushSmart,quietMs:QUIET_MS};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
