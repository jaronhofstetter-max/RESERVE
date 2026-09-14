/* RESERVE Today Dashboard v1.3 — event-driven expiry, meal and shopping assistant. */
(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function data(){try{return window.RESERVE_SMART_PRIORITIES?.snapshot?.()||{eatFirst:[],recipes:[],buyNext:[]}}catch{return{eatFirst:[],recipes:[],buyNext:[]}}}
 function host(){return document.getElementById('stock')||document.querySelector('main')||document.body}
 function ensure(){let el=document.getElementById('reserveToday');if(!el){el=document.createElement('section');el.id='reserveToday';el.className='card';host().prepend(el)}return el}
 function openRecipe(id){try{if(typeof startCook==='function'){startCook(id);return true}}catch{}return false}
 function addShopping(){try{return window.RESERVE_PANTRY_INTELLIGENCE?.applyNextTrip?.()||window.RESERVE_PREDICTIVE_REPLENISHMENT?.apply?.()?.length||0}catch{return 0}}
 function expiryLabel(x){if(x.days===0)return'heute';if(x.days===1)return'morgen';return`in ${x.days} Tagen`}
 function render(){const el=ensure(),s=data(),eat=s.eatFirst||[],recipes=s.recipes||[],buy=s.buyNext||[],urgent=eat.filter(x=>x.days<=7).slice(0,4),meal=recipes[0],next=buy[0];el.innerHTML=`<h2>Heute</h2><p class="muted">Was zuerst verbraucht, gekocht und eingekauft werden sollte.</p><div class="item"><b>🥕 Heute zuerst verbrauchen</b>${urgent.length?urgent.map((x,i)=>`<div class="today-expiry-row" style="padding-top:8px"><strong>${esc(x.row.n)}</strong> · ${esc(x.row.q)} <span class="pill ${x.days<=1?'bad':''}">${esc(expiryLabel(x))}</span>${i===0?'<span class="pill good">FEFO · zuerst</span>':''}<div class="small muted">${esc(x.reason)}</div></div>`).join(''):'<div class="small muted">Heute ist kein Vorrat besonders dringend.</div>'}</div><div class="item"><b>🍽️ Heute kochen</b>${meal?`<div><strong>${esc(meal.recipe.name)}</strong></div><div class="small muted">Verbraucht ${meal.hits.slice(0,3).map(x=>esc(x.row.n)).join(', ')} zuerst.</div><button id="todayRecipe" class="secondary">Passendes Menü öffnen</button>`:'<div class="small muted">Noch kein passendes Menü zu den dringenden Vorräten gefunden.</div>'}</div><div class="item"><b>🛒 Bald einkaufen</b>${next?`<div><strong>${esc(next.name)}</strong>${next.buyBy?` · bis ${esc(next.buyBy)}`:''}</div><div class="small muted">Aus Verbrauch und Vorratsreichweite berechnet.</div><button id="todayShopping" class="secondary">Nachkauf übernehmen</button>`:'<div class="small muted">Aktuell kein prognostizierter Nachkauf in den nächsten 7 Tagen.</div>'}</div>`;const rb=el.querySelector('#todayRecipe');if(rb)rb.onclick=()=>openRecipe(meal.recipe.id);const sb=el.querySelector('#todayShopping');if(sb)sb.onclick=()=>{const n=addShopping();sb.textContent=`${n} Position${n===1?'':'en'} übernommen`;sb.disabled=true;queueRender()};return s}
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
