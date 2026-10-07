/* RESERVE Today Dashboard v1.3 — event-driven expiry, meal and shopping assistant. */
(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function data(){try{return window.RESERVE_SMART_PRIORITIES?.snapshot?.()||{eatFirst:[],recipes:[],buyNext:[]}}catch{return{eatFirst:[],recipes:[],buyNext:[]}}}
 function host(){return document.getElementById('stock')||document.querySelector('main')||document.body}
 function ensure(){let el=document.getElementById('reserveToday');if(!el){el=document.createElement('section');el.id='reserveToday';el.className='card';host().prepend(el)}return el}
 function openRecipe(id){try{if(typeof startCook==='function'){startCook(id);return true}}catch{}return false}
 function addShopping(){try{return window.RESERVE_PANTRY_INTELLIGENCE?.applyNextTrip?.()||window.RESERVE_PREDICTIVE_REPLENISHMENT?.apply?.()?.length||0}catch{return 0}}
 function expiryLabel(x){if(x.days===0)return'heute';if(x.days===1)return'morgen';return`in ${x.days} Tagen`}
 function render(){document.getElementById('reserveToday')?.remove();window.RESERVE_EXPIRY_UI?.render?.();return data()}
 let queued=false,ticket=0;
 function typing(){return !!(window.RESERVE_INPUT_GUARD?.isTyping?.()||window.RESERVE_PERFORMANCE?.isTyping?.())}
 function runLater(fn){if(window.RESERVE_PERFORMANCE?.idle)window.RESERVE_PERFORMANCE.idle(fn);else if('requestIdleCallback'in window)requestIdleCallback(fn,{timeout:800});else setTimeout(fn,30)}
 function queueRender(){if(queued||typing())return;queued=true;const mine=++ticket;runLater(()=>{queued=false;if(mine!==ticket||typing())return;render()})}
 window.addEventListener('storage',queueRender,{passive:true});
 window.addEventListener('reserve:stock-changed',queueRender,{passive:true});
 window.addEventListener('reserve:ui-refreshed',e=>{if(e.detail?.panel==='stock')queueRender()},{passive:true});
 window.RESERVE_TODAY={version:'1.3',render:queueRender,data,openRecipe,addShopping};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueRender,{once:true});else queueRender();
})();
