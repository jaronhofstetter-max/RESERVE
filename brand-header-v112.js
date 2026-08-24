// TenderHawk 1.1.7 header brand refinement
(function(){
  function applyBrand(){
    const mark=document.querySelector('.brandmark');
    if(!mark)return;
    mark.innerHTML='<img src="file_0000000013b481f497e7cdb7337b891a.png?v=117" alt="TenderHawk" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;transform:scale(1.06)">';
    mark.style.padding='0';
    mark.style.overflow='hidden';
    mark.style.background='#071722';
    mark.style.borderColor='#d8bd7b';
    mark.style.width=window.matchMedia('(max-width:600px)').matches?'64px':'72px';
    mark.style.height=window.matchMedia('(max-width:600px)').matches?'64px':'72px';
    mark.style.borderRadius=window.matchMedia('(max-width:600px)').matches?'16px':'18px';
    mark.style.flex='0 0 auto';
    const row=mark.closest('.brandrow'); if(row) row.style.gap=window.matchMedia('(max-width:600px)').matches?'12px':'18px';
    const title=document.querySelector('.brandtitle'); if(title){title.style.fontSize=window.matchMedia('(max-width:600px)').matches?'29px':'34px';title.style.lineHeight='1'}
    const byline=document.querySelector('.byline'); if(byline) byline.style.marginTop='5px';
    mark.setAttribute('aria-label','TenderHawk by HOFILIGHT');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);else applyBrand();
})();
