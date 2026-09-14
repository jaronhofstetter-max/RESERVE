/* RESERVE post-scan trace v1.0 — diagnostic-only phase tracing for physical mobile freezes after barcode detection. */
(function(){
  'use strict';
  let enabled=false;try{const q=new URLSearchParams(location.search).get('reserveDiag');enabled=q==='1'||localStorage.getItem('reserveDiagV1')==='1'}catch(_){ }
  if(!enabled)return;
  const started=performance.now(),events=[];let lastBeat=performance.now(),beatTimer=null,paintTimer=null,lookupWrapped=false,fetchWrapped=false;
  const round=n=>Math.round((Number(n)||0)*10)/10;
  function phase(name,extra=''){
    const now=performance.now();events.push({t:now-started,name,extra:String(extra||'')});if(events.length>30)events.splice(0,events.length-30);paint();
    try{window.dispatchEvent(new CustomEvent('reserve:postscan-phase',{detail:{name,extra,t:now-started}}))}catch(_){ }
  }
  function report(){
    const recent=events.slice(-14).map(e=>`${round(e.t)}ms  ${e.name}${e.extra?' · '+e.extra:''}`).join('\n')||'noch keine Scan-Phasen';
    return 'POST-SCAN TRACE v1\n'+recent;
  }
  function paint(){const pre=document.getElementById('reservePostscanTrace');if(pre)pre.textContent=report()}
  function mountPanel(){
    if(document.getElementById('reservePostscanTrace'))return;
    const box=document.getElementById('reservePerfDiag');if(!box)return;
    const pre=document.createElement('pre');pre.id='reservePostscanTrace';pre.style.cssText='margin:8px 0 0;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);white-space:pre-wrap;word-break:break-word;color:#fff';
    const controls=box.querySelector('div');box.insertBefore(pre,controls||null);paint();
  }
  function wrapLookup(){
    const api=window.RESERVE_BARCODE;if(!api||typeof api.lookup!=='function'||api.lookup.__reserveTraceWrapped)return false;
    const original=api.lookup;
    const wrapped=async function(code){
      const c=String(code||'');phase('lookup:start',c);const t=performance.now();
      requestAnimationFrame(()=>phase('lookup:first-rAF',`${round(performance.now()-t)}ms`));
      try{const out=await original.apply(this,arguments);phase('lookup:resolved',`${round(performance.now()-t)}ms`);return out}
      catch(e){phase('lookup:rejected',`${round(performance.now()-t)}ms ${e?.name||'Error'}`);throw e}
    };
    wrapped.__reserveTraceWrapped=true;wrapped.__reserveTraceOriginal=original;api.lookup=wrapped;lookupWrapped=true;phase('trace:lookup-wrapped');return true;
  }
  function wrapFetch(){
    if(fetchWrapped||typeof window.fetch!=='function')return;
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'');
      if(!/openfoodfacts\.org\/api\/v2\/product\//i.test(url))return original(input,init);
      const t=performance.now();phase('OFF:fetch:start',url.match(/product\/([^.?/]+)/)?.[1]||'');
      try{
        const response=await original(input,init);phase('OFF:fetch:response',`${response.status} · ${round(performance.now()-t)}ms`);
        const json=response.json.bind(response);
        try{response.json=async function(){const jt=performance.now();phase('OFF:json:start');const data=await json();phase('OFF:json:end',`${round(performance.now()-jt)}ms`);return data}}catch(_){ }
        return response;
      }catch(e){phase('OFF:fetch:error',`${e?.name||'Error'} · ${round(performance.now()-t)}ms`);throw e}
    };
    fetchWrapped=true;phase('trace:fetch-wrapped');
  }
  function observeBarcodeUI(){
    let installed=false;
    const install=()=>{
      if(installed)return;const status=document.getElementById('barcodeStatus'),result=document.getElementById('barcodeResult');if(!status||!result)return;
      installed=true;let lastStatus=status.textContent,lastResult=result.textContent;
      const mo=new MutationObserver(()=>{
        const s=status.textContent.trim(),r=result.textContent.trim();
        if(s!==lastStatus){lastStatus=s;phase('UI:status',s.slice(0,80))}
        if(r!==lastResult){lastResult=r;phase('UI:result',r.slice(0,80))}
      });
      mo.observe(status,{childList:true,subtree:true,characterData:true,attributes:true});mo.observe(result,{childList:true,subtree:true,characterData:true});
      window.addEventListener('pagehide',()=>mo.disconnect(),{once:true});phase('trace:UI-observer-ready');
    };
    install();const timer=setInterval(()=>{install();if(installed)clearInterval(timer)},250);
  }
  window.addEventListener('reserve:camera-state',e=>{
    const d=e.detail||{};phase('camera:'+String(d.state||'?'),d.code||d.backend||'');
    if(d.state==='detected'){
      const t=performance.now();requestAnimationFrame(()=>phase('detected:first-rAF',`${round(performance.now()-t)}ms`));setTimeout(()=>phase('detected:timer-0'),0);
    }
  },{passive:true});
  document.addEventListener('focusin',e=>{const id=e.target?.id;if(id&&/^scan|barcode/.test(id))phase('focus:'+id)},{capture:true,passive:true});
  beatTimer=setInterval(()=>{const now=performance.now(),gap=now-lastBeat;lastBeat=now;if(gap>700)phase('MAIN-THREAD-STALL',`${round(gap)}ms`)},200);
  const installTimer=setInterval(()=>{mountPanel();wrapLookup();wrapFetch();if(lookupWrapped&&fetchWrapped&&document.getElementById('reservePostscanTrace'))clearInterval(installTimer)},150);
  paintTimer=setInterval(paint,500);
  observeBarcodeUI();mountPanel();wrapLookup();wrapFetch();phase('trace:ready');
  window.addEventListener('pagehide',()=>{clearInterval(beatTimer);clearInterval(paintTimer);clearInterval(installTimer)},{once:true});
  window.RESERVE_POSTSCAN_TRACE={version:'1.0',events,phase,report};
})();
