/* RESERVE emergency v1 — orientation based on Swiss BWL household emergency-supply recommendations. */
(function(){
 const KEY='reserveEmergencyV1';
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
 const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
 const num=x=>Math.max(0,Number(x)||0);
 const foodDays=()=>{try{const x=buildShoppingPlan();return Math.min(7,x.plan.filter(Boolean).length)}catch{return 0}};
 function ensurePanel(){
  if(document.getElementById('emergency'))return;
  const main=document.querySelector('main'); if(!main)return;
  const s=document.createElement('section');s.id='emergency';s.className='panel';
  s.innerHTML=`<div class="card emergency-card"><div class="official-note"><b>Notvorrat · Orientierung an BWL-Empfehlungen</b><br><span class="small muted">Keine Zertifizierung oder Prüfung durch den Bund. RESERVE hilft dir, deinen privaten Vorrat anhand der veröffentlichten Empfehlungen zu organisieren.</span></div><h2>Meine Krisenvorsorge</h2><div id="emergencyView"></div></div>`;
  main.appendChild(s);
  const nav=document.querySelector('nav'); if(nav&&!document.getElementById('emergencyTab')){const b=document.createElement('button');b.id='emergencyTab';b.className='tab emergency-tab';b.textContent='Notvorrat';b.onclick=function(){show('emergency',this);renderEmergency()};nav.insertBefore(b,nav.lastElementChild)}
 }
 function check(label,key,data){return `<label class="emergency-check"><input type="checkbox" data-ekey="${key}" ${data[key]?'checked':''}><span>${label}</span></label>`}
 window.renderEmergency=function(){ensurePanel();const el=document.getElementById('emergencyView');if(!el)return;const d=load(),people=Math.max(1,persons()),waterTarget=people*9,water=num(d.water),waterPct=Math.min(100,Math.round(water/waterTarget*100)),days=foodDays(),foodPct=Math.round(days/7*100),checks=['radio','light','batteries','cooking','medicine','cash','hygiene','readyFood'],done=checks.filter(k=>d[k]).length,overall=Math.round((waterPct+foodPct+(done/checks.length*100))/3);
 el.innerHTML=`<div class="emergency-score"><div><span>Vorsorgegrad</span><b>${overall}%</b></div><div><span>Wasser</span><b>${waterPct}%</b></div><div><span>Lebensmittel</span><b>${foodPct}%</b></div></div><div class="emergency-progress"><i style="width:${overall}%"></i></div><div class="emergency-grid"><div class="emergency-box"><h3>💧 Wasser</h3><p><b>${water} / ${waterTarget} Liter</b> für ${people} ${people===1?'Person':'Personen'}</p><p class="small muted">BWL-Empfehlung: mindestens 9 Liter pro Person für Trinken und Kochen während drei Tagen.</p><input id="emergencyWater" type="number" min="0" step="0.5" value="${water}" placeholder="Liter Wasser vorhanden"><button onclick="saveEmergencyWater()">Wasservorrat speichern</button></div><div class="emergency-box"><h3>🥫 Lebensmittel</h3><p><b>${days} / 7 Tage</b> durch RESERVE planbar</p><p class="small muted">Ziel: haltbare Lebensmittel für rund eine Woche. Produkte ohne Kochen sind besonders wichtig.</p><button onclick="show('menu',document.querySelectorAll('.tab')[2])">7-Tage-Plan öffnen</button></div></div><h3>Stromausfall & Grundausstattung</h3><div class="emergency-checks">${check('Sofort konsumierbare Lebensmittel vorhanden','readyFood',d)}${check('Batterie-/Autoradio vorhanden','radio',d)}${check('Taschenlampe / stromunabhängiges Licht','light',d)}${check('Ersatzbatterien vorhanden','batteries',d)}${check('Stromunabhängige Kochmöglichkeit','cooking',d)}${check('Persönliche Medikamente / Hausapotheke für mindestens 1 Woche','medicine',d)}${check('Etwas Bargeld in kleinen Scheinen','cash',d)}${check('Benötigte Hygieneartikel vorhanden','hygiene',d)}</div><div class="official-note small">Die Lebensmittelabdeckung ist eine RESERVE-Schätzung anhand deines erfassten Vorrats und der verfügbaren Rezepte; sie ersetzt nicht den persönlichen Notvorrats-Rechner des BWL.</div>`;
 el.querySelectorAll('[data-ekey]').forEach(x=>x.onchange=()=>{const q=load();q[x.dataset.ekey]=x.checked;save(q);renderEmergency()});
 };
 window.saveEmergencyWater=function(){const d=load();d.water=num(document.getElementById('emergencyWater')?.value);save(d);renderEmergency()};
 const oldShow=window.show;window.show=function(id,btn){oldShow(id,btn);if(id==='emergency')renderEmergency()};
 const oldRefresh=window.refresh;window.refresh=function(){oldRefresh();if(document.getElementById('emergency'))renderEmergency()};
 function boot(){ensurePanel();renderEmergency()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
