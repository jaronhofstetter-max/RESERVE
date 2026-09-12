(()=>{
  'use strict';

  const KEY='reserveUsageMetricsV1';
  const VERSION=2;
  const SECTION_RULES=[['vorrat',/\bvorrat\b/i],['einkauf',/\beinkauf/i],['rezepte',/\brezept/i],['plan',/\b(plan|wochenplan)\b/i],['profil',/\bprofil\b/i],['heute',/\bheute\b/i]];
  function fresh(){return{version:VERSION,sessions:0,onboardingCompleted:false,firstStockCreated:false,barcodeScans:0,barcodeAdds:0,feedbackOpened:0,activated:false,sectionVisits:{vorrat:0,einkauf:0,rezepte:0,plan:0,profil:0,heute:0}}}
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'null'),base=fresh();if(!value)return base;return{...base,...value,version:VERSION,sectionVisits:{...base.sectionVisits,...(value.sectionVisits||{})}}}catch(_){return fresh()}}
  function write(metrics){try{localStorage.setItem(KEY,JSON.stringify(metrics))}catch(_){}}
  function mutate(fn){const metrics=read(),before=JSON.stringify(metrics);fn(metrics);metrics.activated=!!(metrics.onboardingCompleted&&metrics.firstStockCreated);if(JSON.stringify(metrics)!==before)write(metrics);return metrics}
  function detectMilestones(){mutate(metrics=>{if(!metrics.onboardingCompleted&&localStorage.getItem('reserveOnboardingDone')==='1')metrics.onboardingCompleted=true;if(!metrics.firstStockCreated){try{const raw=localStorage.getItem('reserveStock');if(raw&&raw!=='[]'){const stock=JSON.parse(raw);if(Array.isArray(stock)&&stock.length>0)metrics.firstStockCreated=true}}catch(_){}}})}
  function sectionFromLabel(label){const text=String(label||'').trim().replace(/\s+/g,' ');for(const [section,re] of SECTION_RULES)if(re.test(text))return section;return null}
  function onClick(event){const target=event.target&&event.target.closest?event.target.closest('button,a,[role="button"]'):null;if(!target)return;const id=target.id||'';mutate(metrics=>{const section=sectionFromLabel(target.getAttribute('aria-label')||target.textContent||'');if(section)metrics.sectionVisits[section]=(metrics.sectionVisits[section]||0)+1;if(id==='scanBtn'||id==='barcodeScan'||/barcode|scannen/i.test(target.getAttribute('aria-label')||''))metrics.barcodeScans++;if(id==='scanAdd')metrics.barcodeAdds++;if(id==='reserve-feedback-button')metrics.feedbackOpened++});setTimeout(detectMilestones,0)}
  function start(){mutate(metrics=>{metrics.sessions=(metrics.sessions||0)+1});detectMilestones();document.addEventListener('click',onClick,true);const timer=setInterval(()=>{if(!document.hidden)detectMilestones()},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)detectMilestones()});window.addEventListener('focus',detectMilestones);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true})}
  window.reserveUsageMeasurementV1={version:'2.0',getSummary:()=>read(),reset:()=>write(fresh())};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
