// TenderHawk 1.3 semantic matching + opt-in opportunity notifications.
(function(){
  const norm=s=>N(s||'');
  const words=s=>norm(s).split(/[^a-z0-9]+/i).filter(w=>w.length>2);
  const uniq=a=>[...new Set(a)];
  const containsAny=(text,terms)=>terms.some(t=>text.includes(norm(t)));

  const TRADE_CLUSTERS=[
    {id:'heizung',label:'Heizung',terms:['heizung','heizungsanlage','waermeerzeugung','wärmeerzeugung','waermepumpe','wärmepumpe','fernwaerme','fernwärme','hlk','hkl']},
    {id:'lueftung',label:'Lüftung',terms:['lueftung','lüftung','lueftungsanlage','lüftungsanlage','ventilation','klima','klimaanlage','hlk','hkl']},
    {id:'sanitaer',label:'Sanitär',terms:['sanitaer','sanitär','sanitaerinstallation','sanitärinstallation','wasser','abwasser','rohrleitung','sprinkler']},
    {id:'automation',label:'Gebäudeautomation',terms:['gebaeudeautomation','gebäudeautomation','automation','bacnet','msr','mcr','leitsystem','gebaeudeleittechnik','gebäudeleittechnik']},
    {id:'elektro',label:'Elektro',terms:['elektro','elektrik','elektroinstallation','schaltanlage','starkstrom','schwachstrom']},
    {id:'kaelte',label:'Kälte',terms:['kaelte','kälte','kaelteanlage','kälteanlage','kuehlung','kühlung','chiller']},
    {id:'bau',label:'Bau/Sanierung',terms:['sanierung','umbau','instandsetzung','neubau','bauarbeiten','modernisierung']}
  ];
  const CAP_CLUSTERS=[
    {label:'Öffentliche Auftraggeber',terms:['oeffentliche auftraggeber','öffentliche auftraggeber','kanton','gemeinde','bund','stadt']},
    {label:'BIM/CAD',terms:['bim','cad','dwg']},{label:'Revisionsunterlagen',terms:['revision','revisionsunterlagen','as-built','as built']},
    {label:'Inbetriebsetzung',terms:['inbetriebsetzung','inbetriebnahme','funktionsnachweis','funktionstest']},{label:'KBOB',terms:['kbob']},
    {label:'Minergie',terms:['minergie','eco']},{label:'Betrieb laufend',terms:['laufenden betrieb','laufender betrieb','betrieb aufrechterhalten']}
  ];
  const MUST_SIGNALS=[['zwingend','Muss-Kriterium'],['muss ','Muss-Kriterium'],['nachweis','Nachweis erforderlich'],['referenz','Referenzanforderung'],['zertifikat','Zertifikat'],['eignung','Eignungsprüfung'],['schluesselperson','Schlüsselperson'],['schlüsselperson','Schlüsselperson'],['poenale','Pönale'],['pönale','Pönale'],['garantie','Garantie'],['sicherheitsleistung','Sicherheitsleistung']];

  function profile(){const tradeText=norm(trades.value),capabilityText=norm((caps.value||'')+' '+(refs.value||'')),regionText=norm((region.value||'')+' '+(kanton.value||''));return {tradeText,capabilityText,regionText,activeTrades:TRADE_CLUSTERS.filter(c=>containsAny(tradeText,c.terms)),maxValue:+maxv.value||0,capacity:(capacity.value||'mittel').toLowerCase()};}
  function tenderText(x){return norm([x.title,x.buyer,x.location,x.type,x.text].join(' '));}
  function titleText(x){return norm(x.title||'');}
  function isActive(x){return x.status!=='expired' && deadlineDays(x)>0;}
  function regionMatch(p,x){const loc=norm((x.location||'')+' '+(x.buyer||''));if(!p.regionText.trim())return false;const regionTerms=uniq(words(p.regionText));const aliases={be:['bern'],zh:['zurich','zuerich','zürich'],bs:['basel'],bl:['basel','baselland'],lu:['luzern'],sg:['st gallen','st. gallen'],ag:['aargau'],so:['solothurn']};return regionTerms.some(t=>loc.includes(t)||(aliases[t]||[]).some(a=>loc.includes(norm(a))));}

  window.opportunityScore=function(x){
    if(!isActive(x))return {score:0,reasons:[],risks:['Ausschreibung abgelaufen'],criteria:[],tradeHits:[],decision:'ABGELAUFEN'};
    const p=profile(),text=tenderText(x),title=titleText(x),d=deadlineDays(x),reasons=[],risks=[],criteria=[];let score=20;
    const matchedTrades=p.activeTrades.filter(c=>containsAny(text,c.terms)),titleTrades=p.activeTrades.filter(c=>containsAny(title,c.terms));
    if(matchedTrades.length){score+=Math.min(34,18+(matchedTrades.length-1)*8);reasons.push('Gewerke: '+matchedTrades.slice(0,3).map(c=>c.label).join(', '));}
    if(titleTrades.length){score+=8;reasons.push('Kernthema im Titel');}if(p.activeTrades.length&&!matchedTrades.length){score-=12;risks.push('Kein klarer Gewerke-Match');}
    let capCount=0;CAP_CLUSTERS.forEach(c=>{if(containsAny(text,c.terms)&&containsAny(p.capabilityText,c.terms)){capCount++;criteria.push(c.label);}});if(capCount){score+=Math.min(18,capCount*5);reasons.push('Nachweise/Erfahrung: '+criteria.slice(0,3).join(', '));}
    const queryTerms=uniq(words(q.value)),queryHits=queryTerms.filter(k=>text.includes(k));score+=Math.min(8,queryHits.length*2);if(regionMatch(p,x)){score+=8;reasons.push('Region passt');}
    if(d>=21){score+=7;reasons.push('gute Vorlaufzeit');}else if(d>=14){score+=3;}else if(d<7){score-=15;risks.push('sehr kurze Frist');}else{score-=7;risks.push('kurze Frist');}
    if(x.isNew){score+=3;reasons.push('neu entdeckt');}
    const value=+x.value||0;if(value&&p.maxValue){if(value<=p.maxValue){score+=5;reasons.push('Volumen im Firmenlimit');}else{score-=16;risks.push('Volumen über Firmenlimit');}}if(value){const capLimit=p.capacity==='klein'?750000:p.capacity==='gross'?5000000:2000000;if(value>capLimit){score-=7;risks.push('Kapazität prüfen');}}
    MUST_SIGNALS.forEach(([term,label])=>{if(text.includes(norm(term))&&!risks.includes(label))risks.push(label)});if(risks.includes('Pönale'))score-=3;if(risks.includes('Sicherheitsleistung'))score-=2;
    score=Math.max(0,Math.min(100,Math.round(score)));const decision=score>=75?'GO-Kandidat':score>=55?'PRÜFEN':'NO-BID / geringe Passung';return {score,reasons:uniq(reasons),risks:uniq(risks),criteria:uniq(criteria),tradeHits:matchedTrades.map(c=>c.label),decision};
  };

  const notifiedKey='tenderhawk-notified-v1';
  function notifiedIds(){try{return new Set(JSON.parse(localStorage.getItem(notifiedKey)||'[]'));}catch(e){return new Set();}}
  function saveNotified(set){localStorage.setItem(notifiedKey,JSON.stringify([...set].slice(-250)));}
  async function notifyFreshMatches(pool){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    const seen=notifiedIds();const matches=pool.filter(x=>x.isNew&&opportunityScore(x).score>=75&&!seen.has(String(x.id))).slice(0,3);if(!matches.length)return;
    let reg=null;try{reg=await navigator.serviceWorker.ready;}catch(e){}
    for(const x of matches){const o=opportunityScore(x);const options={body:`${o.score}/100 · ${x.buyer||'Öffentlicher Auftraggeber'} · ${deadlineDays(x)} Tage`,icon:'file_0000000013b481f497e7cdb7337b891a.png',badge:'file_0000000013b481f497e7cdb7337b891a.png',tag:'tenderhawk-'+String(x.id),data:{url:x.url||'/RESERVE/'}};try{if(reg)await reg.showNotification('Neue TenderHawk Top-Chance',options);else new Notification('Neue TenderHawk Top-Chance',options);}catch(e){}seen.add(String(x.id));}
    saveNotified(seen);
  }
  window.enableTenderHawkNotifications=async function(){
    if(!('Notification' in window)){alert('Benachrichtigungen werden auf diesem Gerät nicht unterstützt.');return;}
    const p=await Notification.requestPermission();
    if(p==='granted'){localStorage.setItem('tenderhawk-notify','1');alert('TenderHawk-Benachrichtigungen sind aktiviert.');if(typeof live==='function')live();}
    else alert('Benachrichtigungen wurden nicht freigegeben.');
  };
  function addNotifyButton(){const statusEl=document.getElementById('status');if(!statusEl||document.getElementById('thNotifyBtn'))return;const b=document.createElement('button');b.id='thNotifyBtn';b.className='ghost';b.type='button';b.textContent=Notification.permission==='granted'?'Benachrichtigungen aktiv':'Benachrichtigungen aktivieren';b.onclick=window.enableTenderHawkNotifications;statusEl.parentNode.insertBefore(b,statusEl);}

  window.scoreLead=x=>opportunityScore(x).score;
  window.render=function(arr){window._arr=arr;leads.innerHTML=arr.length?arr.map((x,i)=>{const o=opportunityScore(x),s=o.score,c=s>=75?'g':s>=55?'w':'r',d=deadlineDays(x);const why=o.reasons.slice(0,3).map(r=>`<span class="pill">✓ ${esc(r)}</span>`).join('');const risk=o.risks.slice(0,2).map(r=>`<span class="pill">⚠ ${esc(r)}</span>`).join('');const hot=s>=75?'<span class="hotBadge">GO-KANDIDAT</span>':s>=55?'<span class="hotBadge" style="background:#fff4e5;color:#8a4b00">PRÜFEN</span>':'';const fresh=x.isNew?'<span class="hotBadge" style="background:#eaf1ff;color:#1d4ed8">NEU</span>':'';const summary=(x.text||'').replace(/\s+/g,' ').trim();return `<article class="lead"><div class="oppHead"><div class="scoreBox"><span class="score ${c}">${s}/100</span><span class="scoreLabel">Match</span></div><div><div class="oppTitle">${esc(x.title)} ${fresh} ${hot}</div><div class="oppMeta">${esc(x.buyer)} · ${esc(x.location||'Schweiz')}</div></div></div><div class="pillrow"><span class="pill">${esc(x.type||'Publikation')}</span><span class="pill">${d} Tage</span>${why}${risk}</div><p class="leadSummary">${esc(summary)}</p><div class="actions"><button onclick="choose(${i})">Bid/No-Bid prüfen</button>${x.url?`<a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">SIMAP öffnen</a>`:''}</div></article>`;}).join(''):'<div class="muted">Keine passenden aktiven Chancen im aktuellen Snapshot.</div>';};

  window.live=function(){if(!cache.length){status.textContent='Noch kein Live-Snapshot verfügbar.';return;}const keys=words(q.value),area=norm(kanton.value).trim();let pool=cache.filter(isActive).filter(x=>{const t=tenderText(x);return (!keys.length||keys.some(k=>t.includes(k)))&&(!area||t.includes(area)||opportunityScore(x).reasons.includes('Region passt'));});pool=pool.sort((a,b)=>opportunityScore(b).score-opportunityScore(a).score).slice(0,40);render(pool);const hot=pool.filter(x=>opportunityScore(x).score>=75).length,check=pool.filter(x=>{const s=opportunityScore(x).score;return s>=55&&s<75}).length,fresh=pool.filter(x=>x.isNew).length;status.textContent=`${pool.length} aktive Chancen · ${fresh} neu · ${hot} GO-Kandidaten · ${check} prüfen.`;if(localStorage.getItem('tenderhawk-notify')==='1')notifyFreshMatches(pool);};

  const oldChoose=window.choose;window.choose=function(i){if(typeof oldChoose==='function')oldChoose(i);try{const x=window._arr[i],o=opportunityScore(x);setTimeout(()=>{if(!analysisResult)return;const cl=o.score>=75?'g':o.score>=55?'w':'r';analysisResult.innerHTML=`<h2 class="${cl}">${o.score}/100 · ${esc(o.decision)}</h2><p><b>Warum passend:</b> ${esc(o.reasons.join(' · ')||'Keine starken positiven Signale erkannt.')}</p><p><b>Zu prüfen:</b> ${esc(o.risks.join(' · ')||'Keine offensichtlichen Warnsignale erkannt.')}</p><p><b>Erkannte Nachweise:</b> ${esc(o.criteria.join(', ')||'Keine explizit abgeglichenen Nachweise.')}</p><button onclick="analyze()">Detailanalyse neu berechnen</button>`;},0);}catch(e){}};
  addNotifyButton();if(typeof cache!=='undefined'&&cache.length)live();
})();
