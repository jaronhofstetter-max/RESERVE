/* RESERVE scanner priority v1.2 — event-driven fast lane for camera and post-scan interaction. */
(function(){
  'use strict';
  let active=false,holdUntil=0,releaseTimer=null,pendingRefresh=false,installTimer=null;
  const HOLD_AFTER_STOP_MS=2600;
  const heavyNames=['renderSmart','renderPlan','renderSearch','renderCook','renderShop','renderQuality','renderOnboarding'];
  const originals=new Map(),now=()=>performance.now();
  function busy(){return active||now()<holdUntil}
  function armHold(ms=HOLD_AFTER_STOP_MS){holdUntil=Math.max(holdUntil,now()+ms);clearTimeout(releaseTimer);releaseTimer=setTimeout(flush,Math.max(0,holdUntil-now())+30)}
  function flush(){
    if(busy()){clearTimeout(releaseTimer);releaseTimer=setTimeout(flush,Math.max(60,holdUntil-now()+30));return}
    document.documentElement.classList.remove('reserve-scanner-busy');
    if(pendingRefresh){pendingRefresh=false;const fn=originals.get('refresh');if(typeof fn==='function'){const run=()=>{try{fn()}catch(e){console.warn('RESERVE scanner priority refresh',e)}};if(window.RESERVE_PERFORMANCE?.idle)window.RESERVE_PERFORMANCE.idle(run);else setTimeout(run,0)}}
  }
  function wrap(name){
    const fn=window[name];if(typeof fn!=='function'||fn.__reserveScannerPriorityWrapped)return;
    originals.set(name,fn);
    const wrapped=function(...args){if(busy()){if(name==='refresh')pendingRefresh=true;return}return fn.apply(this,args)};
    wrapped.__reserveScannerPriorityWrapped=true;wrapped.__reserveScannerPriorityOriginal=fn;try{window[name]=wrapped}catch(_){ }
  }
  function install(){heavyNames.forEach(wrap);wrap('refresh')}
  window.addEventListener('reserve:camera-state',e=>{
    const state=String(e.detail?.state||'');install();
    if(state==='start-request'||state==='starting'||state==='started'){
      active=true;holdUntil=0;clearTimeout(releaseTimer);document.documentElement.classList.add('reserve-scanner-busy');
    }else if(state==='detected'){
      active=false;armHold(1800);document.documentElement.classList.add('reserve-scanner-busy');
    }else if(state==='stopped'||state==='error'){
      active=false;armHold();document.documentElement.classList.add('reserve-scanner-busy');
    }
  },{passive:true});
  window.addEventListener('reserve:ui-refreshed',install,{passive:true});
  installTimer=setTimeout(install,0);
  window.addEventListener('pagehide',()=>{clearTimeout(releaseTimer);clearTimeout(installTimer)},{once:true});
  window.RESERVE_SCANNER_PRIORITY={version:'1.2',busy,install,get active(){return active},get holdUntil(){return holdUntil}};
})();
