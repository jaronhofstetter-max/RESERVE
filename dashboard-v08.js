// HOFILIGHT ONE dashboard. Uses only existing live SIMAP snapshot and current scoring.
(function(){
  let dashboardTop=[];
  window.openDashboardMatch=function(i){window._arr=dashboardTop;choose(i)};
  function addShell(){
    const nav=document.querySelector('header nav'); const main=document.querySelector('main.wrap');
    if(!nav||!main||document.getElementById('dashboard')) return;
    const btn=document.createElement('button'); btn.className='tab active';btn.textContent='Dashboard';btn.onclick=()=>show('dashboard',btn);
    nav.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); nav.insertBefore(btn,nav.firstChild);
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    const s=document.createElement('section');s.id='dashboard';s.className='panel active';
    s.innerHTML='<div id="dashboardBody" class="th-dashboard"><div class="th-hero"><h2>HOFILIGHT ONE Intelligence Dashboard</h2><p>Schweizer Ausschreibungen · Firmenbezogenes Matching · Bid/No-Bid-Vorprüfung</p></div><div class="th-panel" style="grid-column:1/-1">Dashboard wird aus dem aktuellen SIMAP-Snapshot aufgebaut …</div></div>';
    main.insertBefore(s,main.firstChild);
  }
  function score(x){try{return opportunityScore(x)}catch(e){return {score:scoreLead(x),reasons:[],risks:[]}}}
  function cantonOf(x){const t=N([x.location,x.title,x.buyer,x.text].join(' '));const map=[['BE','bern'],['ZH','zurich'],['ZH','zürich'],['LU','luzern'],['SG','st. gallen'],['SG','st gallen'],['BS','basel'],['BL','basel-landschaft'],['AG','aargau'],['VD','vaud'],['GE','geneve'],['GE','genève'],['FR','fribourg'],['SO','solothurn'],['TG','thurgau'],['GR','graubunden'],['GR','graubünden'],['TI','ticino'],['VS','wallis'],['VS','valais']];for(const [c,k] of map)if(t.includes(N(k)))return c;return 'CH'}
  function renderDashboard(){
    const root=document.getElementById('dashboardBody'); if(!root||!Array.isArray(cache)||!cache.length)return;
    const activeCache=cache.filter(x=>x.status!=='expired' && deadlineDays(x)>0); const ranked=activeCache.map(x=>({x,o:score(x)})).sort((a,b)=>b.o.score-a.o.score);
    const top=ranked.slice(0,5), hot=ranked.filter(a=>a.o.score>=75), check=ranked.filter(a=>a.o.score>=55&&a.o.score<75); dashboardTop=top.map(z=>z.x);
    const urgent=ranked.filter(a=>deadlineDays(a.x)<14).length; const cantons={};ranked.forEach(a=>{const c=cantonOf(a.x);cantons[c]=(cantons[c]||0)+1});
    const cantonRows=Object.entries(cantons).sort((a,b)=>b[1]-a[1]).slice(0,6); const max=Math.max(1,...cantonRows.map(x=>x[1]));
    const profileName=(company&&company.value)||'Ihr Unternehmen'; const newCount=activeCache.filter(x=>x.isNew).length;
    root.innerHTML=`
      <div class="th-hero"><h2>Willkommen bei HOFILIGHT ONE</h2><p>${esc(profileName)} · Ausschreibungen finden. Chancen erkennen. Aufträge gewinnen.</p></div>
      <div class="th-kpis"><div class="th-kpi"><div class="th-kpi-label">Aktive Ausschreibungen</div><div class="th-kpi-value">${activeCache.length}</div><div class="th-kpi-note">${newCount} neu seit Refresh</div></div><div class="th-kpi"><div class="th-kpi-label">GO-Kandidaten</div><div class="th-kpi-value">${hot.length}</div><div class="th-kpi-note">≥ 75/100</div></div><div class="th-kpi"><div class="th-kpi-label">Prüfen</div><div class="th-kpi-value">${check.length}</div><div class="th-kpi-note">55–74/100</div></div><div class="th-kpi"><div class="th-kpi-label">Dringende Fristen</div><div class="th-kpi-value">${urgent}</div><div class="th-kpi-note">< 14 Tage</div></div></div>
      <div class="th-panel th-matches"><h3>Top Matches für Ihr Unternehmen</h3>${top.map((a,i)=>{const x=a.x,o=a.o,s=o.score,cl=s>=75?'go':s>=55?'check':'stop';return `<div class="th-match"><div class="th-score ${cl}">${s}%</div><div><div class="th-match-title">${esc(x.title)} ${x.isNew?'<span class="th-chip">NEU</span>':''}</div><div class="th-match-meta">${esc(x.buyer)} · ${esc(x.location||'Schweiz')} · ${deadlineDays(x)} Tage</div><div>${(o.reasons||[]).slice(0,3).map(r=>`<span class="th-chip">✓ ${esc(r)}</span>`).join(' ')}</div></div><div class="th-match-actions"><button onclick="openDashboardMatch(${i})">Bid/No-Bid</button>${x.url?`<a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">SIMAP</a>`:''}</div></div>`}).join('')}</div>
      <div class="th-panel th-insight"><h3>HOFILIGHT ONE Insight</h3><div class="th-insightbox"><b class="th-gold">${hot.length} GO-Kandidaten</b><br>von ${activeCache.length} aktiven Projekten erreichen mindestens 75/100 im aktuellen Firmenprofil.<br><br>${urgent?`Bei ${urgent} Projekten liegt die Frist unter 14 Tagen.`:'Keine auffällig kurzen Fristen im aktuellen Bestand.'}</div><a class="th-btn" href="#" onclick="show('radar',document.querySelectorAll('.tab')[1]);return false">Alle Chancen ansehen</a></div>
      <div class="th-panel th-cantons"><h3>Ausschreibungen nach Region</h3><div class="th-bars">${cantonRows.map(([c,n])=>`<div class="row"><b>${c}</b><div class="th-bar"><i style="width:${Math.round(n/max*100)}%"></i></div><span>${n}</span></div>`).join('')}</div></div>
      <div class="th-panel th-summary"><h3>Entscheidungsübersicht</h3><div class="th-mini"><span>GO-Kandidaten</span><b>${hot.length}</b></div><div class="th-mini"><span>Prüfen</span><b>${check.length}</b></div><div class="th-mini"><span>Unter 55</span><b>${ranked.length-hot.length-check.length}</b></div><div class="th-mini"><span>Datenquelle</span><span class="th-chip">SIMAP</span></div></div>
      <div class="th-panel th-quick"><h3>Quick Actions</h3><a class="th-btn" href="#" onclick="show('radar',document.querySelectorAll('.tab')[1]);return false">Neue Chancen suchen</a><a class="th-btn secondary" href="#" onclick="show('profile',document.querySelectorAll('.tab')[2]);return false">Firmenprofil anpassen</a><a class="th-btn secondary" href="#" onclick="show('report',document.querySelectorAll('.tab')[4]);return false">Letzten Report öffnen</a></div>`;
  }
  window.renderTenderDashboard=renderDashboard; addShell(); const oldLive=window.live;
  if(typeof oldLive==='function') window.live=function(){oldLive();setTimeout(renderDashboard,0)};
  let tries=0; const timer=setInterval(()=>{tries++;if(typeof cache!=='undefined'&&cache.length){clearInterval(timer);renderDashboard()}else if(tries>40)clearInterval(timer)},250);
})();