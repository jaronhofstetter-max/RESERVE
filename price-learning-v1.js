/* RESERVE Price Learning v1.0 — learn unit prices from captured purchases. */
(function(){
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const unit=u=>{u=String(u||'stück').toLowerCase();return u==='stuck'||u==='stk'||u==='stueck'?'stück':u};
 function amount(q){try{const p=parseAmount(q);return p&&+p.v>0?{v:+p.v,u:unit(p.u)}:null}catch{return null}}
 function stockRows(){try{return Array.isArray(stock)?stock:[]}catch{try{return JSON.parse(localStorage.getItem('reserveStock')||'[]')}catch{return[]}}}
 function observations(){return stockRows().map(x=>{const p=amount(x.q),price=+x.purchasePriceCHF;if(!p||!Number.isFinite(price)||price<=0)return null;return{name:x.n||x.name||'',key:norm(x.n||x.name),unit:p.u,quantity:p.v,price,rate:price/p.v,capturedAt:x.capturedAt||null,source:x.captureSource||'purchase'}}).filter(Boolean)}
 function learnedRate(name,u){const key=norm(name),uu=unit(u),xs=observations().filter(x=>x.unit===uu&&(x.key===key||x.key.includes(key)||key.includes(x.key)));if(!xs.length)return null;const recent=xs.slice(-5),weight=recent.reduce((s,x)=>s+x.quantity,0);return weight>0?recent.reduce((s,x)=>s+x.rate*x.quantity,0)/weight:null}
 function estimate(name,quantity,u,fallbackRate){const learned=learnedRate(name,u),rate=Number.isFinite(learned)?learned:+fallbackRate||0;return{amount:Math.max(0,+quantity||0)*rate,rate,source:Number.isFinite(learned)?'observed':'fallback',observations:Number.isFinite(learned)?observations().filter(x=>x.unit===unit(u)&&(x.key===norm(name)||x.key.includes(norm(name))||norm(name).includes(x.key))).length:0}}
 window.RESERVE_PRICE_LEARNING={version:'1.0',observations,learnedRate,estimate};
})();
