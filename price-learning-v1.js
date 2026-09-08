/* RESERVE Price Learning v1.3 — learn unit prices from durable purchase history, with stock fallback. */
(function(){
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 function unitInfo(u){u=String(u||'stück').toLowerCase();if(u==='stuck'||u==='stk'||u==='stueck')u='stück';if(u==='kg')return{base:'g',factor:1000};if(u==='l')return{base:'ml',factor:1000};return{base:u,factor:1}}
 function amount(q){try{const p=parseAmount(q);return p&&+p.v>0?{v:+p.v,u:unitInfo(p.u).base}:null}catch{return null}}
 function persistedRows(){try{const x=JSON.parse(localStorage.getItem('reserveStock')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
 function stockRows(){const persisted=persistedRows();if(persisted.length)return persisted;try{return Array.isArray(stock)?stock:[]}catch{return[]}}
 function matchesName(x,key){return x.key===key||x.key.includes(key)||key.includes(x.key)}
 function stockObservations(){return stockRows().map(x=>{const p=amount(x.q),price=+x.purchasePriceCHF;if(!p||!Number.isFinite(price)||price<=0)return null;return{name:x.n||x.name||'',key:norm(x.n||x.name),unit:p.u,quantity:p.v,price,rate:price/p.v,capturedAt:x.capturedAt||null,source:x.captureSource||'purchase'}}).filter(Boolean)}
 function observations(){try{const xs=window.RESERVE_PURCHASE_HISTORY?.rows?.();if(Array.isArray(xs)&&xs.length)return xs.map(x=>({...x,capturedAt:x.purchasedAt||x.capturedAt||null}))}catch{}return stockObservations()}
 function matching(name,u){const key=norm(name),info=unitInfo(u);return observations().filter(x=>x.unit===info.base&&matchesName(x,key))}
 function learnedRate(name,u){try{const r=window.RESERVE_PURCHASE_HISTORY?.learnedRate?.(name,u);if(Number.isFinite(r))return r}catch{}const info=unitInfo(u),xs=matching(name,u);if(!xs.length)return null;const recent=xs.slice(-5),weight=recent.reduce((s,x)=>s+x.quantity,0);if(weight<=0)return null;const baseRate=recent.reduce((s,x)=>s+x.rate*x.quantity,0)/weight;return baseRate*info.factor}
 function estimate(name,quantity,u,fallbackRate){const learned=learnedRate(name,u),rate=Number.isFinite(learned)?learned:+fallbackRate||0;return{amount:Math.max(0,+quantity||0)*rate,rate,source:Number.isFinite(learned)?'observed':'fallback',observations:Number.isFinite(learned)?matching(name,u).length:0}}
 window.RESERVE_PRICE_LEARNING={version:'1.3',observations,learnedRate,estimate};
})();
