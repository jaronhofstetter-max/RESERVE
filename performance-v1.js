/* RESERVE performance v1.0 — safe client-side responsiveness improvements. */
(function(){
  let idleQueue=[];
  const ric=window.requestIdleCallback||function(cb){return setTimeout(()=>cb({didTimeout:false,timeRemaining:()=>0}),40)};
  function idle(fn){idleQueue.push(fn);if(idleQueue.length===1)ric(flush)}
  function flush(deadline){while(idleQueue.length&&(deadline.didTimeout||deadline.timeRemaining()>2)){const fn=idleQueue.shift();try{fn()}catch(e){console.warn('RESERVE idle task',e)}}if(idleQueue.length)ric(flush)}
  function lazyImages(root=document){root.querySelectorAll('img:not([loading])').forEach(img=>{img.loading='lazy';img.decoding='async'})}
  function warmCore(){['data/recipe-catalog.json','data/recipe-index.json'].forEach(href=>{if(document.head.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='prefetch';l.href=href;l.as='fetch';l.crossOrigin='anonymous';document.head.appendChild(l)})}
  function observe(){if(!('MutationObserver'in window))return;let queued=false;const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;lazyImages()})});mo.observe(document.body,{childList:true,subtree:true})}
  function boot(){lazyImages();observe();idle(warmCore)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_PERFORMANCE={version:'1.0',idle,lazyImages,warmCore};
})();
