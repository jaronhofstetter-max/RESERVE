// TenderHawk lightweight first-party analytics. Stores only anonymous aggregate events in Supabase when available.
(function(){
  const sb=window.tenderhawkSupabase;
  const sessionKey='th_session_v1';
  let sid=sessionStorage.getItem(sessionKey);
  if(!sid){sid=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));sessionStorage.setItem(sessionKey,sid)}
  const sent=new Set();
  async function track(event,meta={}){
    const key=event+JSON.stringify(meta);if(sent.has(key)&&event==='page_view')return;sent.add(key);
    const payload={event_name:event,session_id:sid,path:location.pathname,referrer:document.referrer?new URL(document.referrer).hostname:'direct',meta,user_agent:navigator.userAgent.slice(0,180)};
    try{if(sb)await sb.from('analytics_events').insert(payload)}catch(e){}
  }
  window.thTrack=track;
  track('page_view');
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    const txt=(el.textContent||'').trim().slice(0,80);
    if(/chance|suchen|priorisieren/i.test(txt))track('radar_search',{label:txt});
    else if(/firmenprofil|profil/i.test(txt))track('profile_open',{label:txt});
    else if(/analys|bid\/no-bid/i.test(txt))track('tender_analysis',{label:txt});
    else if(/simap/i.test(txt))track('simap_outbound',{label:txt});
    else if(/report/i.test(txt))track('report_open',{label:txt});
  },true);
})();