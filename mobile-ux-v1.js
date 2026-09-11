/* RESERVE mobile UX v1.0 — lightweight smartphone navigation and touch optimizations. */
(function(){
  const MOBILE='(max-width: 750px)';
  function mount(){
    if(document.getElementById('reserveMobileUX'))return;
    const style=document.createElement('style');style.id='reserveMobileUX';style.textContent=`
@media(max-width:750px){
  body{padding-bottom:78px;-webkit-tap-highlight-color:transparent}
  header{padding:14px 12px 8px;position:relative}
  header .brand{font-size:24px}
  header nav{position:fixed;z-index:1000;left:0;right:0;bottom:0;margin:0;padding:7px 8px calc(7px + env(safe-area-inset-bottom));background:#173f35;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;overflow:visible;box-shadow:0 -4px 18px #0002}
  header nav .tab{min-width:0;margin:0;padding:10px 3px;border:0;border-radius:10px;font-size:11px;line-height:1.15;overflow:hidden;text-overflow:ellipsis}
  header nav .tab:nth-child(4),header nav .tab:nth-child(5){display:none}
  main{padding:12px}
  .card{padding:14px;margin-bottom:10px;border-radius:14px}
  .grid{gap:8px}.metric b{font-size:22px}
  button,input,select{min-height:44px}
  button{touch-action:manipulation}
  .cab-frame{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:12px 8px 8px!important;gap:12px 8px!important}
  .cab-product{min-width:0!important;width:100%;overflow:hidden}
  .cab-product strong,.cab-product span,.cab-product small{max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .recipe-card-grid{grid-template-columns:1fr!important}
}
@media(max-width:380px){header nav .tab{font-size:10px;padding-left:2px;padding-right:2px}.card{padding:12px}.cab-frame{grid-template-columns:1fr 1fr!important}}
`;
    document.head.appendChild(style);
    const nav=document.querySelector('header nav');if(!nav)return;
    // Keep the five highest-frequency mobile destinations visible in the fixed bottom bar.
    const labels={home:'Home',stock:'Vorrat',menu:'Plan',shopping:'Einkauf',profile:'Profil'};
    [...nav.querySelectorAll('.tab')].forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/show\('([^']+)'/);if(m&&labels[m[1]]){btn.dataset.mobileLabel=labels[m[1]];btn.setAttribute('aria-label',labels[m[1]])}});
  }
  function syncActive(){if(!matchMedia(MOBILE).matches)return;const active=document.querySelector('.panel.active')?.id;document.querySelectorAll('header nav .tab').forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/show\('([^']+)'/);btn.setAttribute('aria-current',m&&m[1]===active?'page':'false')})}
  function boot(){mount();syncActive();document.querySelector('header nav')?.addEventListener('click',()=>requestAnimationFrame(syncActive));window.addEventListener('resize',syncActive,{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_MOBILE_UX={version:'1.0',mount,syncActive};
})();
