// TenderHawk 1.3.1 server-push client foundation.
(function(){
  function base64UrlToUint8Array(value){
    const padding='='.repeat((4-value.length%4)%4);
    const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  async function subscribeServerPush(){
    const cfg=window.TENDERHAWK_PUSH_CONFIG||{};
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) throw new Error('Web Push wird auf diesem Gerät nicht unterstützt.');
    if(!cfg.vapidPublicKey||!cfg.subscribeEndpoint) throw new Error('Server-Push ist vorbereitet, aber der Push-Server ist noch nicht verbunden.');
    const permission=await Notification.requestPermission();
    if(permission!=='granted') throw new Error('Benachrichtigungen wurden nicht freigegeben.');
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(cfg.vapidPublicKey)});}
    const profile={
      company:(document.getElementById('company')||{}).value||'',
      region:(document.getElementById('region')||{}).value||'',
      trades:(document.getElementById('trades')||{}).value||'',
      caps:(document.getElementById('caps')||{}).value||'',
      refs:(document.getElementById('refs')||{}).value||'',
      threshold:75
    };
    const res=await fetch(cfg.subscribeEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),profile})});
    if(!res.ok) throw new Error('Push-Abonnement konnte serverseitig nicht gespeichert werden.');
    localStorage.setItem('tenderhawk-server-push','1'); return sub;
  }
  window.enableTenderHawkServerPush=async function(){
    try{await subscribeServerPush();alert('TenderHawk Hintergrund-Push ist aktiviert.');}
    catch(e){alert(e.message||'Server-Push konnte noch nicht aktiviert werden.');}
  };
  window.tenderHawkPushStatus=async function(){
    try{const reg=await navigator.serviceWorker.ready;return !!(await reg.pushManager.getSubscription());}catch(e){return false;}
  };
})();
