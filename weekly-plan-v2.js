/* RESERVE Weekly Plan v2.0 — breakfast, lunch and dinner for seven days. */
(function(){
 const TIMES=['Frühstück','Mittagessen','Abendessen'];
 const DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
 function recipeRows(){try{return Array.isArray(recipes)?recipes:[]}catch{return Array.isArray(window.recipes)?window.recipes:[]}}
 function ok(r){try{return typeof allowed==='function'?allowed(r):true}catch{return true}}
 function ledger(){try{return stockLedger()}catch{return{}}}
 function fits(r,l){try{return recipeFitsLedger(r,l)}catch{return false}}
 function reserve(r,l){try{reserveRecipe(r,l)}catch{}}
 function mealFits(r,t){const a=Array.isArray(r.mealTimes)?r.mealTimes:[];return a.includes(t)||(t!=='Frühstück'&&a.includes('Hauptmahlzeit'))}
 function kcal(r){const n=r?.nutrition||{};return +(n.kcal??n.calories??n.energyKcal??0)||0}
 function build(){const l=ledger(),pool=recipeRows().filter(ok),used=new Map(),days=[];for(let d=0;d<7;d++){const meals=[];for(const time of TIMES){let candidates=pool.filter(r=>mealFits(r,time)&&fits(r,l));candidates.sort((a,b)=>(used.get(a.id)||0)-(used.get(b.id)||0)||kcal(b)-kcal(a));const pick=candidates[0]||null;if(pick){reserve(pick,l);used.set(pick.id,(used.get(pick.id)||0)+1)}meals.push({time,recipe:pick,kcal:pick?kcal(pick):0})}days.push({day:DAYS[d],meals,kcal:meals.reduce((s,m)=>s+m.kcal,0)})}return{version:'2.0',days,slots:days.flatMap(d=>d.meals),filled:days.flatMap(d=>d.meals).filter(m=>m.recipe).length,ledger:l}}
 function render(){const el=document.getElementById('mealPlan');if(!el)return null;const x=build();el.innerHTML=`<div class="plan-summary"><b>${x.filled}/21 Mahlzeiten aus deinem aktuellen Vorrat planbar</b><div class="small muted">Frühstück, Mittagessen und Abendessen werden der Reihe nach reserviert. Zutaten können nicht doppelt verplant werden.</div></div>`+x.days.map(d=>`<div class="meal"><h3>${d.day}${d.kcal?` · ${Math.round(d.kcal)} kcal`:''}</h3>${d.meals.map(m=>m.recipe?`<div><b>${m.time}</b> · ${m.recipe.name}${m.kcal?` <span class="small muted">${Math.round(m.kcal)} kcal</span>`:''}</div>`:`<div class="plan-gap"><b>${m.time}</b> · Vorrat reicht für kein passendes vollständiges Rezept</div>`).join('')}</div>`).join('');return x}
 window.RESERVE_WEEKLY_PLAN={version:'2.0',times:TIMES,days:DAYS,build,render};
 const old=window.renderPlan;window.renderPlan=render;
 setTimeout(render,0);
})();
