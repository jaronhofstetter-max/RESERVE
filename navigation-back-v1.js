/* Keep one Home entry beneath the main app sections. */
(function(){
  function boot(){
    const base=window.show;if(typeof base!=='function')return;
    const tabs=[...document.querySelectorAll('nav .tab')];
    const tab=id=>tabs.find(b=>(b.getAttribute('onclick')||'').includes("'"+id+"'"));
    const main=id=>!!tab(id);let restoring=false;
    const clean=()=>location.pathname+location.search;
    if(!location.hash&&!history.state?.reserveSection)history.replaceState({...history.state,reserveSection:'home'},'',clean());
    window.show=function(id,btn){
      const previous=history.state?.reserveSection;
      const result=base.apply(this,arguments);
      if(!restoring&&main(id))queueMicrotask(()=>{
        const state={reserveSection:id};
        if(id!=='home'&&previous==='home')history.pushState(state,'',clean());
        else history.replaceState(state,'',clean());
      });
      return result;
    };
    function restore(){
      if(location.hash)return;
      const id=history.state?.reserveSection||'home';
      if(!main(id))return;
      restoring=true;window.show(id,tab(id));restoring=false;
      requestAnimationFrame(()=>window.scrollTo(0,Number(history.state?.reserveScroll)||0));
    }
    // Existing product/capture routes run first; main routes restore afterwards.
    window.addEventListener('popstate',()=>setTimeout(restore,0));
    window.addEventListener('hashchange',()=>setTimeout(restore,0));
    if(!location.hash&&history.state?.reserveSection)restore();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
