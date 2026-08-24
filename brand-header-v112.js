// HOFILIGHT ONE brand + PWA icon sync
(function(){
  const LOGO='icon.svg?v=120';
  function ensureHeadBrand(){
    let m=document.querySelector('link[rel="manifest"]');
    if(!m){m=document.createElement('link');m.rel='manifest';document.head.appendChild(m)}
    m.href='manifest.webmanifest?v=120';
    let f=document.querySelector('link[rel="icon"]');
    if(!f){f=document.createElement('link');f.rel='icon';document.head.appendChild(f)}
    f.type='image/svg+xml';f.href=LOGO;
    let a=document.querySelector('link[rel="apple-touch-icon"]');
    if(!a){a=document.createElement('link');a.rel='apple-touch-icon';document.head.appendChild(a)}
    a.href=LOGO;
    let theme=document.querySelector('meta[name="theme-color"]');
    if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.appendChild(theme)}
    theme.content='#0d2c44';
  }
  function applyBrand(){
    ensureHeadBrand();
    document.title='HOFILIGHT ONE · AI Tender Intelligence';
    const mark=document.querySelector('.brandmark');
    if(mark){
      mark.innerHTML='<img src="'+LOGO+'" alt="HOFILIGHT ONE" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">';
      mark.style.padding='0';mark.style.overflow='hidden';mark.style.background='#071722';mark.style.borderColor='#158cff';
      mark.style.width=window.matchMedia('(max-width:600px)').matches?'64px':'72px';
      mark.style.height=window.matchMedia('(max-width:600px)').matches?'64px':'72px';
      mark.style.borderRadius=window.matchMedia('(max-width:600px)').matches?'16px':'18px';
      mark.style.flex='0 0 auto';
      mark.setAttribute('aria-label','HOFILIGHT ONE');
      const row=mark.closest('.brandrow'); if(row) row.style.gap=window.matchMedia('(max-width:600px)').matches?'12px':'18px';
    }
    const title=document.querySelector('.brandtitle'); if(title){title.textContent='HOFILIGHT ONE';title.style.fontSize=window.matchMedia('(max-width:600px)').matches?'29px':'34px';title.style.lineHeight='1'}
    const byline=document.querySelector('.byline'); if(byline){byline.textContent='AI TENDER INTELLIGENCE';byline.style.marginTop='5px'}
    const tagline=document.querySelector('.tagline'); if(tagline) tagline.textContent='Ausschreibungen finden. Chancen erkennen. Aufträge gewinnen.';
    document.querySelectorAll('.report .small.muted').forEach(el=>{if(el.textContent.includes('TENDERHAWK'))el.textContent='HOFILIGHT ONE · AI TENDER INTELLIGENCE · PILOT REPORT'});
    document.querySelectorAll('.notice.small').forEach(el=>{el.innerHTML=el.innerHTML.replace(/TenderHawk-Scores/g,'HOFILIGHT ONE Scores')});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);else applyBrand();
})();
