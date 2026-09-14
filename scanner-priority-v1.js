/* RESERVE scanner priority v1.1 — pause nonessential rendering while camera/scan work is active on mobile. */
(function(){
  'use strict';
  let active=false,holdUntil=0,releaseTimer=null,pendingRefresh=false,installTimer=null,maintenanceTimer=null;
  const HOLD_AFTER_STOP_MS=3800;
  const heavyNames=['renderSmart','renderPlan','renderSearch','renderCook','renderShop','renderQuality','renderOnboarding'];
  const originals=new Map();
  const now=()=>performance.now();
  function busy(){return active||now()<holdUntil}
  function armHold(ms=HOLD_AFTER_STOP_MS){holdUntil=Math.max(holdUntil,now()+ms);clearTimeout(releaseTimer);releaseTimer=setTimeout(flush,Math.max(0,holdUntil-now())+40)}
  function flush(){
    if(busy()){clearTimeout(releaseTimer);releaseTimer=setTimeout(flush,Math.max(80,holdUntil-now()+40));return}
    document.documentElement.classList.remove('reserve-scanner-busy');
    if(pendingRefresh){pendingRefresh=false;try{originals.get('refresh')?.()}catch(e){console.warn('RESERVE scanner priority refresh',e)}}
  }
  function wrap(name){
    const fn=window[name];if(typeof fn!=='function'||fn.__reserveScannerPriorityWrapped)return;
    originals.set(name,fn);
    const wrapped=function(...args){
      if(busy()){
        if(name==='refresh')pendingRefresh=true;
        return;
      }
      return fn.apply(this,args);
    };
    wrapped.__reserveScannerPriorityWrapped=true;wrapped.__reserveScannerPriorityOriginal=fn;
    try{window[name]=wrapped}catch(_){ }
  }
  function install(){
    heavyNames.forEach(wrap);wrap('refresh');
    if(window.RESERVE_PERFORMANCE?.idle&&!window.RESERVE_PERFORMANCE.__scannerPriorityIdle){
      const originalIdle=window.RESERVE_PERFORMANCE.idle.bind(window.RESERVE_PERFORMANCE);
      window.RESERVE_PERFORMANCE.idle=function(fn){
        if(!busy())return originalIdle(fn);
        const retry=()=>busy()?setTimeout(retry,500):originalIdle(fn);setTimeout(retry,500);
      };
      window.RESERVE_PERFORMANCE.__scannerPriorityIdle=true;
    }
  }
  window.addEventListener('reserve:camera-state',e=>{
    const state=String(e.detail?.state||'');
    if(state==='start-request'||state==='starting'||state==='started'){
      active=true;holdUntil=0;clearTimeout(releaseTimer);
      document.documentElement.classList.add('reserve-scanner-busy');
    }else if(state==='detected'){
      active=false;armHold(4200);
      document.documentElement.classList.add('reserve-scanner-busy');
    }else if(state==='stopped'||state==='error'){
      active=false;armHold();
      document.documentElement.classList.add('reserve-scanner-busy');
    }
  },{passive:true});
  maintenanceTimer=setInterval(()=>{if(!busy())document.documentElement.classList.remove('reserve-scanner-busy');install()},500);
  installTimer=setTimeout(install,0);
  window.addEventListener('pagehide',()=>{clearTimeout(releaseTimer);clearTimeout(installTimer);clearInterval(maintenanceTimer)},{once:true});
  window.RESERVE_SCANNER_PRIORITY={version:'1.1',busy,install,get active(){return active},get holdUntil(){return holdUntil}};
})();
