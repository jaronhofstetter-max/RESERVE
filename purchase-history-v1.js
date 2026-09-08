/* RESERVE Purchase History v1.0 — durable purchase memory independent of stock lifecycle. */
(function(){
 const KEY='reservePurchaseHistory',norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 function unitInfo(u){u=String(u||'stück').toLowerCase();if(u==='stuck'||u==='stk'||u==='stueck')u='stück';if(u==='kg')return{base:'g',factor:1000};if(u==='l')return{base:'ml',factor:1000};return{base:u,factor:1}}
 function amount(q){try{const p=parseAmount(q);return p&&+p.v>0?{v:+p.v,u:unitInfo(p.u).base}:null}catch{return null}}
 function rows(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
 function save(xs){localStorage.setItem(KEY,JSON.stringify(xs));return xs}
 function record(item){const p=amount(item?.quantity||item?.q),price=+(item?.price??item?.purchasePriceCHF);if(!item?.name&&!item?.n)return null;if(!p||!Number.isFinite(price)||price<=0)return null;const x={id:`p_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,name:item.name||item.n,key:norm(item.name||item.n),unit:p.u,quantity:p.v,price:Math.round(price*100)/100,rate:price/p.v,purchasedAt:item.purchasedAt||item.capturedAt||new Date().toISOString(),source:item.source||item.captureSource||'purchase'};const xs=rows();xs.push(x);save(xs.slice(-1000));return x}
 function recordMany(items){return(items||[]).map(record).filter(Boolean)}
 function matches(name,u){const key=norm(name),base=unitInfo(u).base;return rows().filter(x=>x.unit===base&&(x.key===key||x.key.includes(key)||key.includes(x.key)))}
 function learnedRate(name,u){const info=unitInfo(u),xs=matches(name,u).slice(-8);if(!xs.length)return null;const weight=xs.reduce((s,x)=>s+(+x.quantity||0),0);if(weight<=0)return null;const base=xs.reduce((s,x)=>s+(+x.rate||0)*(+x.quantity||0),0)/weight;return base*info.factor}
 function migrateStock(){if(localStorage.getItem('reservePurchaseHistoryMigratedV1'))return 0;let stockRows=[];try{stockRows=JSON.parse(localStorage.getItem('reserveStock')||'[]')}catch{}let n=0;for(const x of Array.isArray(stockRows)?stockRows:[]){if(Number.isFinite(+x.purchasePriceCHF)&&+x.purchasePriceCHF>0&&record(x))n++}localStorage.setItem('reservePurchaseHistoryMigratedV1','1');return n}
 window.RESERVE_PURCHASE_HISTORY={version:'1.0',rows,record,recordMany,matches,learnedRate,migrateStock};migrateStock();
})();
