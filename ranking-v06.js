// TenderHawk 0.6 additive ranking + mobile UI layer.
(function(){
  const words=s=>N(s).split(/[^a-z0-9äöü]+/i).filter(w=>w.length>3);
  const uniq=a=>[...new Set(a)];
  const companyProfile=()=>({
    trades:uniq(words(trades.value)),
    caps:uniq(words(caps.value+' '+refs.value)),
    regions:uniq(words(region.value+' '+kanton.value)),
    maxValue:+maxv.value||0,
    capacity:(capacity.value||'mittel').toLowerCase()
  });
  const textOf=x=>N([x.title,x.buyer,x.location,x.type,x.text].join(' '));
  const riskTerms=[['kurze frist','Zeitdruck'],['zwingend','Muss-Kriterium'],['muss','Muss-Kriterium'],['nachweis','Nachweis'],['referenz','Referenzpflicht'],['zertifikat','Zertifikat'],['garantie','Garantie'],['pönale','Pönale']];

  const ui=document.createElement('style');
  ui.textContent=`
    .lead{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0;box-shadow:0 2px 8px #00000008}
    .lead:first-child{border-top:1px solid var(--line)}
    .oppHead{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start}
    .scoreBox{min-width:78px;border-radius:12px;padding:10px 8px;text-align:center;background:#f5f7f9}
    .scoreBox .score{display:block;font-size:24px;line-height:1;font-weight:900}
    .scoreLabel{display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:5px}
    .oppTitle{font-size:18px;line-height:1.25;font-weight:850;margin:0 0 5px;overflow-wrap:anywhere}
    .oppMeta{font-size:12px;color:var(--muted);line-height:1.45}
    .pillrow{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0}
    .leadSummary{margin:10px 0 12px;line-height:1.45;color:#344054;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .actions{display:flex;gap:8px;flex-wrap:wrap}.actions button,.actions .linkbtn{margin:0;min-height:42px;display:inline-flex;align-items:center;justify-content:center}
    .hotBadge{display:inline-block;font-size:11px;font-weight:800;border-radius:999px;padding:4px 8px;background:#e7f6ee;color:#11643d;margin-left:5px}
    @media(max-width:600px){
      header{padding:20px 14px}.tagline{font-size:11px}.brandtitle{font-size:26px}
      nav{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tab{padding:9px 5px;font-size:11px;white-space:nowrap}
      main{padding:10px}.card{padding:14px;border-radius:12px}.card h2{font-size:22px;margin-top:3px}
      .grid2,.grid3{gap:8px}input,textarea,select{font-size:16px}
      #radar>.card:first-child button{width:100%;margin:6px 0 0}
      .oppHead{grid-template-columns:70px 1fr;gap:10px}.scoreBox{min-width:70px;padding:10px 6px}.scoreBox .score{font-size:21px}
      .oppTitle{font-size:16px}.lead{padding:13px;margin:10px 0}.leadSummary{-webkit-line-clamp:2;font-size:14px}
      .actions{display:grid;grid-template-columns:1fr 1fr}.actions button,.actions .linkbtn{width:100%;font-size:13px;padding:10px 8px}
      .pill{font-size:10px;padding:4px 7px}
    }
  `;
  document.head.appendChild(ui);

  window.opportunityScore=function(x){
    const p=companyProfile(), text=textOf(x), d=deadlineDays(x), reasons=[], risks=[];
    const qWords=uniq(words(q.value));
    const tradeHits=p.trades.filter(k=>text.includes(k));
    const capHits=p.caps.filter(k=>text.includes(k));
    const queryHits=qWords.filter(k=>text.includes(k));
    const regionHits=p.regions.filter(k=>text.includes(k));
    let score=15;
    score+=Math.min(32,tradeHits.length*9);
    if(tradeHits.length) reasons.push('Gewerke: '+tradeHits.slice(0,3).join(', '));
    score+=Math.min(18,capHits.length*4);
    if(capHits.length) reasons.push('Erfahrung: '+capHits.slice(0,3).join(', '));
    score+=Math.min(12,queryHits.length*4);
    if(regionHits.length){score+=12;reasons.push('Region passt');}
    if(d>=21){score+=8;reasons.push('gute Vorlaufzeit');}
    else if(d>=14){score+=3;}
    else if(d<7){score-=16;risks.push('sehr kurze Frist');}
    else {score-=8;risks.push('kurze Frist');}
    const value=+x.value||0;
    if(value&&p.maxValue){
      if(value<=p.maxValue){score+=7;reasons.push('Volumen im Zielbereich');}
      else {score-=18;risks.push('Volumen über Firmenlimit');}
    }
    if(value){
      const capLimit=p.capacity==='klein'?750000:p.capacity==='gross'?5000000:2000000;
      if(value>capLimit){score-=8;risks.push('Kapazität prüfen');}
    }
    riskTerms.forEach(([term,label])=>{if(text.includes(term)&&!risks.includes(label))risks.push(label)});
    if(risks.includes('Pönale')) score-=4;
    score=Math.max(0,Math.min(100,Math.round(score)));
    return {score,reasons,risks,tradeHits,capHits};
  };

  window.scoreLead=x=>opportunityScore(x).score;
  window.render=function(arr){
    window._arr=arr;
    leads.innerHTML=arr.length?arr.map((x,i)=>{
      const o=opportunityScore(x),s=o.score,c=s>=75?'g':s>=55?'w':'r',d=deadlineDays(x);
      const why=o.reasons.slice(0,2).map(r=>`<span class="pill">✓ ${esc(r)}</span>`).join('');
      const risk=o.risks.slice(0,1).map(r=>`<span class="pill">⚠ ${esc(r)}</span>`).join('');
      const hot=s>=75?'<span class="hotBadge">TOP-CHANCE</span>':'';
      const summary=(x.text||'').replace(/\s+/g,' ').trim();
      return `<article class="lead"><div class="oppHead"><div class="scoreBox"><span class="score ${c}">${s}/100</span><span class="scoreLabel">Match</span></div><div><div class="oppTitle">${esc(x.title)} ${hot}</div><div class="oppMeta">${esc(x.buyer)} · ${esc(x.location||'Schweiz')}</div></div></div><div class="pillrow"><span class="pill">${esc(x.type||'Publikation')}</span><span class="pill">${d} Tage</span>${why}${risk}</div><p class="leadSummary">${esc(summary)}</p><div class="actions"><button onclick="choose(${i})">Analysieren</button>${x.url?`<a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">SIMAP öffnen</a>`:''}</div></article>`;
    }).join(''):'<div class="muted">Keine passenden Chancen im aktuellen Snapshot. Suchbegriffe oder Region erweitern.</div>';
  };

  window.live=function(){
    if(!cache.length){status.textContent='Noch kein Live-Snapshot verfügbar.';return;}
    const keys=words(q.value), area=N(kanton.value).trim();
    let pool=cache.filter(x=>{const t=textOf(x);return (!keys.length||keys.some(k=>t.includes(k)))&&(!area||t.includes(area));});
    pool=pool.sort((a,b)=>opportunityScore(b).score-opportunityScore(a).score).slice(0,40);
    render(pool);
    const hot=pool.filter(x=>opportunityScore(x).score>=75).length;
    status.textContent=`${pool.length} passende Chancen aus ${cache.length} SIMAP-Projekten · ${hot} Top-Chancen ≥75/100.`;
  };

  if(cache.length) live();
})();

// PWA bootstrap.
(function(){
  if(!document.querySelector('link[rel="manifest"]')){
    const manifest=document.createElement('link'); manifest.rel='manifest'; manifest.href='manifest.webmanifest'; document.head.appendChild(manifest);
  }
  if(!document.querySelector('link[rel="icon"]')){
    const icon=document.createElement('link'); icon.rel='icon'; icon.href='icon.svg'; icon.type='image/svg+xml'; document.head.appendChild(icon);
  }
  if(!document.querySelector('meta[name="theme-color"]')){
    const theme=document.createElement('meta'); theme.name='theme-color'; theme.content='#0d2c44'; document.head.appendChild(theme);
  }
  const apple=document.createElement('meta'); apple.name='apple-mobile-web-app-capable'; apple.content='yes'; document.head.appendChild(apple);
  const appleStatus=document.createElement('meta'); appleStatus.name='apple-mobile-web-app-status-bar-style'; appleStatus.content='default'; document.head.appendChild(appleStatus);
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
})();

// TenderHawk 0.8 dashboard loader.
(function(){
  if(!document.querySelector('link[href="dashboard-v08.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='dashboard-v08.css';document.head.appendChild(l)}
  if(!document.querySelector('script[src="dashboard-v08.js"]')){const s=document.createElement('script');s.src='dashboard-v08.js';document.body.appendChild(s)}
})();
