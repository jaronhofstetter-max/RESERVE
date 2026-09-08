/* RESERVE Today Dashboard v1.1 */
(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function data(){try{return window.RESERVE_SMART_PRIORITIES?.snapshot?.()||{eatFirst:[],recipes:[],buyNext:[]}}catch{return{eatFirst:[],recipes:[],buyNext:[]}}}
 function host(){return document.getElementById('stock')||document.querySelector('main')||document.body}
 function ensure(){let el=document.getElementById('reserveToday');if(!el){el=document.createElement('section');el.id='reserveToday';el.className='card';const h=host();h.prepend(el)}return el}
 function openRecipe(id){try{if(typeof startCook==='function'){startCook(id);return true}}catch{}return false}
 function addShopping(){try{return window.RESERVE_PANTRY_INTELLIGENCE?.applyNextTrip?.()||0}catch{return 0}}
 function render(){const el=ensure(),s=data(),eat=s.eatFirst||[],recipes=s.recipes||[],buy=s.buyNext||[];const first=eat[0],meal=recipes[0],next=buy[0];el.innerHTML=`<h2>Heute</h2><p class="muted">RESERVE verbindet Haltbarkeit, Verbrauch, Menüs und Einkauf zu deinen nächsten sinnvollen Schritten.</p><div class="item"><b>🥕 Zuerst verbrauchen</b>${first?`<div><strong>${esc(first.row.n)}</strong> · ${esc(first.row.q)}</div><div class="small muted">${esc(first.reason)}</div>`:'<div class="small muted">Heute ist kein Vorrat besonders dringend.</div>'}</div><div class="item"><b>🍽️ Empfohlenes Menü</b>${meal?`<div><strong>${esc(meal.recipe.name)}</strong></div><div class="small muted">Nutzt ${meal.hits.length} priorisierte Zutat${meal.hits.length===1?'':'en'}.</div><button id="todayRecipe" class="secondary">Menü öffnen</button>`:'<div class="small muted">Noch keine passende Menüpriorität.</div>'}</div><div class="item"><b>🛒 Als Nächstes kaufen</b>${next?`<div><strong>${esc(next.name)}</strong>${next.buyBy?` · bis ${esc(next.buyBy)}`:''}</div><div class="small muted">Aus deinem Verbrauch und deiner Vorratsreichweite berechnet.</div><button id="todayShopping" class="secondary">Nachkauf übernehmen</button>`:'<div class="small muted">Aktuell kein prognostizierter Nachkauf in den nächsten 7 Tagen.</div>'}</div>`;const rb=el.querySelector('#todayRecipe');if(rb)rb.onclick=()=>openRecipe(meal.recipe.id);const sb=el.querySelector('#todayShopping');if(sb)sb.onclick=()=>{const n=addShopping();sb.textContent=`${n} Position${n===1?'':'en'} übernommen`;sb.disabled=true;queueRender()};return s}
 let queued=false;
 function queueRender(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;render()})}
 document.addEventListener('input',queueRender,true);
 document.addEventListener('change',queueRender,true);
 document.addEventListener('click',e=>{if(e.target?.closest?.('#reserveToday'))return;setTimeout(queueRender,0)},true);
 window.addEventListener('storage',queueRender);
 const old=window.refresh;if(typeof old==='function')window.refresh=function(){const r=old.apply(this,arguments);queueRender();return r};
 window.RESERVE_TODAY={version:'1.1',render:queueRender,data,openRecipe,addShopping};
 setTimeout(queueRender,0);
})();
