/* RESERVE Smart Priorities v1.0 — expiry + demand + menu + replenishment decisions. */
(function(){
 const DAY=86400000;
 const stockRows=()=>{try{return Array.isArray(stock)?stock:[]}catch{return[]}};
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const match=(a,b)=>{a=norm(a);b=norm(b);return !!a&&!!b&&(a===b||a.includes(b)||b.includes(a))};
 function daysToExpiry(row){if(!row?.e)return Infinity;const t=new Date(row.e+'T23:59:59').getTime();return Number.isFinite(t)?Math.ceil((t-Date.now())/DAY):Infinity}
 function demand(name,unit){try{return window.RESERVE_PANTRY_INTELLIGENCE?.quantityForecast?.(7)?.find(x=>x.unit===unit&&match(x.name,name))||null}catch{return null}}
 function eatFirst(limit=8){return stockRows().map((row,index)=>{const p=window.parseAmount?.(row.q),days=daysToExpiry(row);if(!p||days<0||!Number.isFinite(days)||days>14)return null;const d=demand(row.n,p.u),daily=Number(d?.dailyUse||0),coverage=daily>0?p.v/daily:Infinity;let score=Math.max(0,15-days)*10;if(days<=3)score+=60;if(daily>0)score+=Math.min(40,daily*7);if(Number.isFinite(coverage)&&coverage>days)score+=25;return{row,index,days,score,demand:d||null,reason:days===0?'läuft heute ab':days<=3?`läuft in ${days} Tagen ab`:days<=7?`nur noch ${days} Tage haltbar`:`innerhalb von ${days} Tagen verbrauchen`}}).filter(Boolean).sort((a,b)=>b.score-a.score||a.days-b.days).slice(0,limit)}
 function recipePriorities(limit=5){const urgent=eatFirst(12),recipes=(()=>{try{return Array.isArray(window.recipes)?window.recipes:recipes}catch{return[]}})();return recipes.map(r=>{const hits=(r.ingredients||[]).map(i=>urgent.find(x=>match(x.row.n,i.name))).filter(Boolean);if(!hits.length)return null;return{recipe:r,hits,score:hits.reduce((n,x)=>n+x.score,0)}}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,limit)}
 function buyNext(){try{return window.RESERVE_PANTRY_INTELLIGENCE?.replenishmentForecast?.(30)?.filter(x=>x.buyInDays<=7).map(x=>({name:x.name,unit:x.unit,amount:x.buyAmount,buyBy:x.buyBy,inDays:x.buyInDays,state:x.state,confidence:x.learned?.confidence||'unknown'}))||[]}catch{return[]}}
 function snapshot(){return{generatedAt:new Date().toISOString(),eatFirst:eatFirst(),recipes:recipePriorities(),buyNext:buyNext()}}
 window.RESERVE_SMART_PRIORITIES={version:'1.0',eatFirst,recipePriorities,buyNext,snapshot};
})();
