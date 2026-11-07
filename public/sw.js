/* KITTO offline shell. Never cache API requests, user uploads or converted files. */
const CACHE = 'kitto-app-v4.0.0';
const LOCAL_ASSETS = [
  './', './index.html', './workflow.html', './notepad.html', './file-converter.html',
  './favicon.ico', './favicon.png',
  './assets/illustrations/kitto-cat.svg',
  './assets/icons/favicon-32.png', './assets/icons/apple-touch-icon.png',
  './css/style.css', './css/file-converter.css', './css/notepad.css', './css/ui-system.css', './css/kitto-studio.css', './css/kitto-next.css',
  './css/kitto-v4.css', './css/modules/workspace-components.css', './css/modules/file-converter-components.css','./css/modules/notepad-components.css',
  './js/app.js',
  './js/file-converter.js',
  './js/i18n.js',
  './js/kitto-next-lang.js',
  './js/kitto-queue.js',
  './js/kitto-settings.js',
  './js/kitto-settings-ui.js',
  './js/kitto-filename.js',
  './js/kitto-worker-pool.js',
  './js/kitto-image-refine.js',
  './js/notepad.js',
  './js/page-shell.js',
  './js/pdf-worker-client.js',
  './js/pdf-worker.js',
  './js/runtime-setup.js',
  './js/tool-image-bgremove.js',
  './js/tool-image-compress.js',
  './js/tool-image-convert.js',
  './js/tool-image-crop.js',
  './js/tool-images-to-pdf.js',
  './js/tool-pdf-merge.js',
  './js/tool-pdf-pagenumbers.js',
  './js/tool-pdf-pages.js',
  './js/tool-pdf-to-images.js',
  './js/tool-pdf-watermark.js',
  './js/utils.js',
  './js/workflow-image-core.js',
  './js/workflow-worker.js',
  './js/workflow.js',
  './js/zip-store.js'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // Individual requests keep one missing optional file from breaking the whole install.
    await Promise.allSettled(LOCAL_ASSETS.map(async url=>{
      const response=await fetch(url,{cache:'reload'});
      if(response.ok)await cache.put(url,response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('kitto-app-v')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate') {
    event.respondWith((async()=>{
      try {const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone()).catch(()=>{});}return response;}
      catch(_){return await caches.match(req,{ignoreSearch:true}) || await caches.match('./index.html') || Response.error();}
    })());
    return;
  }
  // Network-first for CSS/JS: deployed updates are never hidden by an older cache.
  // Offline falls back to the pre-cached bundle (no APIs or user files are stored).
  if(url.pathname.startsWith('/js/')||url.pathname.startsWith('/css/')){
    event.respondWith((async()=>{
      try {
        const response=await fetch(req,{cache:'no-cache'});
        if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone()).catch(()=>{});}
        return response;
      }catch(_){return await caches.match(req,{ignoreSearch:true})||Response.error();}
    })());
    return;
  }
  event.respondWith((async()=>{
    try{return await fetch(req);}
    catch(_){return await caches.match(req,{ignoreSearch:true})||Response.error();}
  })());
});
