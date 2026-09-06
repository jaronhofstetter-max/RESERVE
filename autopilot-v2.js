/* RESERVE Autopilot v2.0 — conservative 30-day household foresight. */
(function(){
 const DAY=86400000;
 const pantry=()=>window.RESERVE_PANTRY_INTELLIGENCE;
 const confidenceOk=x=>x?.learned&&(x.learned.confidence==='medium'||x.learned.confidence==='high');
 function horizon(days=30){
  const api=pantry(); if(!api?.quantityForecast)return{days,ready:false,items:[],actions:[]};
  const items=api.quantityForecast(days).map(x=>{
   const coverage=Number.isFinite(x.normalCoverageDays)?Math.max(0,x.normalCoverageDays):null;
   const runout=coverage===null?null:new Date(Date.now()+coverage*DAY).toISOString().slice(0,10);
   const expiryRisk=x.nearestNormalExpiry<9999&&coverage!==null&&x.nearestNormalExpiry<coverage;
   const reliable=confidenceOk(x);
   let buyInDays=null,buyAmount=0;
   if(reliable&&x.dailyUse>0){
    const safetyDays=3;
    buyInDays=Math.max(0,Math.floor((x.normal/x.dailyUse)-safetyDays));
    buyAmount=Math.max(0,(x.dailyUse*days)-x.normal);
   }
   return{...x,coverageDays:coverage,runout,expiryRisk,reliable,buyInDays,buyAmount};
  });
  const actions=[];
  for(const x of items){
   if(x.expiryRisk)actions.push({type:'use-first',priority:100,name:x.name,text:`${x.name} voraussichtlich vor Verbrauchsende aufbrauchen.`});
   if(x.reliable&&x.buyAmount>0)actions.push({type:'buy',priority:x.buyInDays<=7?90:70,name:x.name,amount:x.buyAmount,unit:x.unit,buyInDays:x.buyInDays,text:`${x.name}: Nachkauf in ca. ${x.buyInDays} Tagen einplanen.`});
   if(x.reserveWouldBeNeeded)actions.push({type:'protect-reserve',priority:95,name:x.name,text:`${x.name}: Normalbestand reicht nicht; strategische Reserve bleibt geschützt.`});
  }
  actions.sort((a,b)=>b.priority-a.priority);
  return{days,ready:true,items,actions};
 }
 function shoppingCandidates(days=30){return horizon(days).actions.filter(x=>x.type==='buy'&&x.buyInDays<=7)}
 function render(){
  const host=document.getElementById('home')||document.querySelector('main'); if(!host)return;
  document.getElementById('autopilotV2')?.remove(); const h=horizon(30),box=document.createElement('div');box.id='autopilotV2';box.className='card';
  const reliable=h.items.filter(x=>x.reliable).length,risks=h.actions.filter(x=>x.type==='use-first').length,buy=h.actions.filter(x=>x.type==='buy'&&x.buyInDays<=7).length;
  box.innerHTML=`<h2>30-Tage-Ausblick</h2><p class="muted">RESERVE verbindet Verbrauch, Vorrat, MHD und geschützte Reserve.</p><div class="small"><b>${reliable}</b> belastbare Verbrauchsprognosen · <b>${risks}</b> MHD-Risiken · <b>${buy}</b> Nachkäufe in den nächsten 7 Tagen</div>${h.actions.slice(0,6).map(a=>`<div class="small" style="padding:7px 0">${String(a.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('')||'<div class="small muted" style="padding-top:8px">Noch nicht genug Verbrauchsdaten für belastbare 30-Tage-Entscheidungen. RESERVE lernt weiter.</div>'}`;
  host.prepend(box);
 }
 window.RESERVE_AUTOPILOT_V2={version:'2.0',horizon,shoppingCandidates,render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();