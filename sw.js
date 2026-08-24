const CACHE='tenderhawk-v06-pwa-1';
const APP_SHELL=['/RESERVE/','/RESERVE/index.html','/RESERVE/ranking-v06.js','/RESERVE/manifest.webmanifest','/RESERVE/icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.pathname.endsWith('/data/projects.json')){
    event.respondWith(fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(url.origin===location.origin){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return res;
  }).catch(()=>caches.match('/RESERVE/'))));
});