// TenderHawk 0.6 additive ranking layer. Keeps the 0.5 UI and flow intact.
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
    if(capHits.length) reasons.push('Nachweise/Erfahrung: '+capHits.slice(0,3).join(', '));
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
      const why=o.reasons.slice(0,3).map(r=>`<span class="pill">✓ ${esc(r)}</span>`).join('');
      const risk=o.risks.slice(0,2).map(r=>`<span class="pill">⚠ ${esc(r)}</span>`).join('');
      return `<div class="lead"><span class="score ${c}">${s}/100</span> <b>${esc(x.title)}</b><br><span class="small muted">${esc(x.buyer)} · ${esc(x.location||'Schweiz')}</span><div><span class="pill">${esc(x.type||'Publikation')}</span><span class="pill">${d} Tage</span>${why}${risk}</div><p>${esc((x.text||'').slice(0,650))}</p><button onclick="choose(${i})">Analysieren</button>${x.url?` <a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">Original auf SIMAP</a>`:''}</div>`;
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
