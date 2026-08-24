const CACHE='tenderhawk-v131-pwa-1';
const APP_SHELL=['/RESERVE/','/RESERVE/index.html','/RESERVE/ranking-v06.js','/RESERVE/dashboard-v08.js','/RESERVE/dashboard-v08.css','/RESERVE/smart-matching-v11.js','/RESERVE/brand-header-v112.js','/RESERVE/push-config.js','/RESERVE/push-client-v13.js','/RESERVE/manifest.webmanifest','/RESERVE/file_0000000013b481f497e7cdb7337b891a.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

async function networkFirst(req){
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res && res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return res;
  }catch(e){return (await caches.match(req)) || (await caches.match('/RESERVE/'));}
}

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{};}catch(e){payload={body:event.data?event.data.text():''};}
  const title=payload.title||'Neue TenderHawk Chance';
  const options={
    body:payload.body||'Eine neue passende Ausschreibung wurde gefunden.',
    icon:'/RESERVE/file_0000000013b481f497e7cdb7337b891a.png',
    badge:'/RESERVE/file_0000000013b481f497e7cdb7337b891a.png',
    tag:payload.tag||'tenderhawk-opportunity',
    renotify:true,
    data:{url:payload.url||'/RESERVE/'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=(event.notification.data&&event.notification.data.url)||'/RESERVE/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(target);return client.focus();}}
    if(clients.openWindow)return clients.openWindow(target);
  }));
});

self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.pathname.endsWith('/data/projects.json')){event.respondWith(networkFirst(req));return;}
  if(url.pathname.endsWith('/ranking-v06.js')){
    event.respondWith((async()=>{
      const res=await networkFirst(req);const text=await res.text();
      const loader=`\n;(()=>{\n  document.querySelectorAll('link[href*="dashboard-v08.css"]').forEach(x=>x.remove());\n  const l=document.createElement('link');l.rel='stylesheet';l.href='dashboard-v08.css?v=131';document.head.appendChild(l);\n  document.querySelectorAll('script[src*="dashboard-v08.js"],script[src*="smart-matching-v11.js"],script[src*="brand-header-v112.js"],script[src*="push-config.js"],script[src*="push-client-v13.js"]').forEach(x=>x.remove());\n  const b=document.createElement('script');b.src='brand-header-v112.js?v=131';b.async=false;document.body.appendChild(b);\n  const d=document.createElement('script');d.src='dashboard-v08.js?v=131';d.async=false;document.body.appendChild(d);\n  const pc=document.createElement('script');pc.src='push-config.js?v=131';pc.async=false;document.body.appendChild(pc);\n  const p=document.createElement('script');p.src='push-client-v13.js?v=131';p.async=false;document.body.appendChild(p);\n  const s=document.createElement('script');s.src='smart-matching-v11.js?v=131';s.async=false;s.onload=()=>{try{if(typeof live==='function'&&cache.length)live();if(typeof renderTenderDashboard==='function')renderTenderDashboard()}catch(e){}};document.body.appendChild(s);\n})();\n`;
      return new Response(text+loader,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'}});
    })());return;
  }
  if(req.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('.svg')||url.pathname.endsWith('.png')||url.pathname.endsWith('.webmanifest')){event.respondWith(networkFirst(req));return;}
  event.respondWith(caches.match(req).then(cached=>cached||networkFirst(req)));
});
