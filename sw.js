const CACHE='tenderhawk-v08-pwa-1';
const APP_SHELL=['/RESERVE/','/RESERVE/index.html','/RESERVE/ranking-v06.js','/RESERVE/dashboard-v08.js','/RESERVE/dashboard-v08.css','/RESERVE/manifest.webmanifest','/RESERVE/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

async function networkFirst(req){
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res && res.ok){
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
    }
    return res;
  }catch(e){
    return (await caches.match(req)) || (await caches.match('/RESERVE/'));
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(url.pathname.endsWith('/data/projects.json')){
    event.respondWith(networkFirst(req));
    return;
  }

  if(url.pathname.endsWith('/ranking-v06.js')){
    event.respondWith((async()=>{
      const res=await networkFirst(req);
      const text=await res.text();
      const loader=`\n;(()=>{\n  if(!document.querySelector('link[href="dashboard-v08.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='dashboard-v08.css?v=08';document.head.appendChild(l)}\n  if(!document.querySelector('script[src^="dashboard-v08.js"]')){const s=document.createElement('script');s.src='dashboard-v08.js?v=08';s.defer=true;document.body.appendChild(s)}\n})();\n`;
      return new Response(text+loader,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}});
    })());
    return;
  }

  if(req.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')){
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(caches.match(req).then(cached=>cached||networkFirst(req)));
});
