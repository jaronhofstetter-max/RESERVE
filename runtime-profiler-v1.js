/* RESERVE runtime profiler v1.0 — diagnostic-only attribution of expensive async callbacks on real mobile devices. */
(function(){
  'use strict';
  let enabled=false;try{const q=new URLSearchParams(location.search).get('reserveDiag');enabled=q==='1'||localStorage.getItem('reserveDiagV1')==='1'}catch(_){ }
  if(!enabled)return;
  const started=performance.now(),events=[];const THRESHOLD=120;
  const round=n=>Math.round((Number(n)||0)*10)/10;
  function source(stack){
    const lines=String(stack||'').split('\n').map(x=>x.trim()).filter(Boolean);
    return lines.find(x=>!/runtime-profiler-v1\.js|Error$/i.test(x))||lines[1]||'unbekannt';
  }
  function add(type,duration,meta=''){
    const e={t:performance.now()-started,type,duration,meta:String(meta||'')};events.push(e);if(events.length>40)events.splice(0,events.length-40);paint();
    try{window.dispatchEvent(new CustomEvent('reserve:runtime-heavy',{detail:e}))}catch(_){ }
  }
  function measure(type,fn,src){
    return function(){const t=performance.now();try{return fn.apply(this,arguments)}finally{const d=performance.now()-t;if(d>=THRESHOLD)add(type,d,src)}};
  }
  function report(){
    const recent=events.slice(-12).map(e=>`${round(e.t)}ms  ${e.type} ${round(e.duration)}ms\n  ${e.meta}`).join('\n')||'noch keine teuren Callback-Aufrufe';
    return 'RUNTIME PROFILER v1\n'+recent;
  }
  function paint(){const pre=document.getElementById('reserveRuntimeProfiler');if(pre)pre.textContent=report()}
  function mount(){
    if(document.getElementById('reserveRuntimeProfiler'))return true;
    const box=document.getElementById('reservePerfDiag');if(!box)return false;
    const pre=document.createElement('pre');pre.id='reserveRuntimeProfiler';pre.style.cssText='margin:8px 0 0;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);white-space:pre-wrap;word-break:break-word;color:#fff';
    const controls=box.querySelector('div');box.insertBefore(pre,controls||null);paint();return true;
  }
  const nativeTimeout=window.setTimeout.bind(window),nativeInterval=window.setInterval.bind(window),nativeRAF=window.requestAnimationFrame?.bind(window),nativeRIC=window.requestIdleCallback?.bind(window),nativeQM=window.queueMicrotask?.bind(window);
  window.setTimeout=function(fn,delay){if(typeof fn!=='function')return nativeTimeout(fn,delay);const src=source(new Error().stack);return nativeTimeout(measure(`setTimeout(${Number(delay)||0})`,fn,src),delay,...[].slice.call(arguments,2))};
  window.setInterval=function(fn,delay){if(typeof fn!=='function')return nativeInterval(fn,delay);const src=source(new Error().stack);return nativeInterval(measure(`setInterval(${Number(delay)||0})`,fn,src),delay,...[].slice.call(arguments,2))};
  if(nativeRAF)window.requestAnimationFrame=function(fn){const src=source(new Error().stack);return nativeRAF(measure('requestAnimationFrame',fn,src))};
  if(nativeRIC)window.requestIdleCallback=function(fn,opts){const src=source(new Error().stack);return nativeRIC(measure('requestIdleCallback',fn,src),opts)};
  if(nativeQM)window.queueMicrotask=function(fn){const src=source(new Error().stack);return nativeQM(measure('queueMicrotask',fn,src))};
  const NativeMO=window.MutationObserver;
  if(NativeMO){
    window.MutationObserver=function(cb){const src=source(new Error().stack),wrapped=measure('MutationObserver',cb,src);return new NativeMO(wrapped)};
    window.MutationObserver.prototype=NativeMO.prototype;
  }
  const mountTimer=nativeInterval(()=>{if(mount())nativeInterval(()=>paint(),700)},250);
  nativeTimeout(()=>clearInterval(mountTimer),15000);
  window.RESERVE_RUNTIME_PROFILER={version:'1.0',events,report,thresholdMs:THRESHOLD};
})();
