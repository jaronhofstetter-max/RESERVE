// TenderHawk 1.1.2 header brand sync
(function(){
  function applyBrand(){
    const mark=document.querySelector('.brandmark');
    if(!mark)return;
    mark.innerHTML='<img src="icon.svg?v=112" alt="TenderHawk" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">';
    mark.style.padding='0';mark.style.overflow='hidden';mark.style.background='#071722';mark.style.borderColor='#d8bd7b';mark.setAttribute('aria-label','TenderHawk by HOFILIGHT');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);else applyBrand();
})();
