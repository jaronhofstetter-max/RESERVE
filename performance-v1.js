/* RESERVE performance v1.1 — keep DOM maintenance proportional to actual changes. */
(function(){
  let idleQueue=[],idleScheduled=false;
  const ric=window.requestIdleCallback||function(cb){return setTimeout(()=>cb({didTimeout:false,timeRemaining:()=>8}),40)};
  function schedule(){if(idleScheduled)return;idleScheduled=true;ric(flush)}
  function idle(fn){idleQueue.push(fn);schedule()}
  function flush(deadline){idleScheduled=false;let budget=32;while(idleQueue.length&&budget--&&(deadline.didTimeout||deadline.timeRemaining()>2)){const fn=idleQueue.shift();try{fn()}catch(e){console.warn('RESERVE idle task',e)}}if(idleQueue.length)schedule()}
  function lazyImages(root=document){
    if(root?.nodeType===1&&root.matches?.('img:not([loading])')){root.loading='lazy';root.decoding='async'}
    root?.querySelectorAll?.('img:not([loading])').forEach(img=>{img.loading='lazy';img.decoding='async'})
  }
  function warmCore(){['data/recipe-catalog.json','data/recipe-index.json'].forEach(href=>{if(document.head.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='prefetch';l.href=href;l.as='fetch';l.crossOrigin='anonymous';document.head.appendChild(l)})}
  function observe(){if(!('MutationObserver'in window))return;const pending=new Set();let queued=false;const flushNodes=()=>{queued=false;const nodes=[...pending];pending.clear();for(const node of nodes)lazyImages(node)};const mo=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)pending.add(node);if(pending.size&&!queued){queued=true;requestAnimationFrame(flushNodes)}});mo.observe(document.body,{childList:true,subtree:true});window.addEventListener('pagehide',()=>mo.disconnect(),{once:true})}
  function boot(){lazyImages();observe();idle(warmCore)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_PERFORMANCE={version:'1.1',idle,lazyImages,warmCore};
})();
