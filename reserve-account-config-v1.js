/* Public settings only. General release stays disabled pending real recovery tests.
   The explicit test link opts this browser into the labelled trial.
   Never put an administrative, database or SMTP credential here. */
window.RESERVE_ACCOUNT_CONFIG=(function(){
  const settings={enabled:false,testEnabled:true,url:'https://sqiuuoewznmlazamkvua.supabase.co',publishableKey:'sb_publishable_WgDw2GFlTPGJSnvdXg2grw_I-T_hHzS'};
  let optedIn=false;
  try{
    if(new URLSearchParams(location.search).get('reserveAccountTest')==='1')localStorage.setItem('reserveAccountTestV1','1');
    optedIn=localStorage.getItem('reserveAccountTestV1')==='1';
  }catch{}
  return Object.freeze({...settings,enabled:settings.enabled||(settings.testEnabled&&optedIn),trial:!settings.enabled&&settings.testEnabled&&optedIn});
})();
