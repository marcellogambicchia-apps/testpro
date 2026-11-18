/* Wallet-PRO 2.3.10 TEST: precache verificata, navigazione protetta, offline. */
const CACHE_NAME = 'wallet-pro-test-v2310-20261118';
const ESSENTIAL = ['./index.html','./vendor/pdf.mjs','./vendor/pdf.worker.mjs',
 './vendor/xlsx.full.min.js','./vendor/tesseract.min.js','./vendor/worker.min.js',
 './vendor/tesseract-core.wasm.js','./vendor/tesseract-core.wasm',
 './vendor/lang/ita.traineddata.gz','./vendor/lang/eng.traineddata.gz'];
const OPTIONAL = ['./','./manifest.json','./apple-touch-icon.png','./icon-192.png','./icon-512.png'];
const ROOT = new URL('./', self.registration.scope);
const HOME = new URL('index.html', ROOT).pathname;
function isHome(path){ return path === ROOT.pathname || path === HOME; }
async function cacheOne(cache,path){
 const req = new Request(new URL(path,ROOT),{cache:'reload'});
 const response = await fetch(req);
 if(!response.ok || response.type === 'opaque') throw new Error('Risorsa offline non disponibile: '+path+' HTTP '+response.status);
 await cache.put(req,response);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE_NAME);
 try {
  await Promise.all(ESSENTIAL.map(path=>cacheOne(cache,path)));
  await Promise.allSettled(OPTIONAL.map(path=>cacheOne(cache,path)));
  await self.skipWaiting();
 } catch(e) { await caches.delete(CACHE_NAME); throw e; }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('wallet-pro-test-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin || !url.pathname.startsWith(ROOT.pathname))return;
 if(req.mode==='navigate'){
  if(!isHome(url.pathname))return;
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE_NAME);
   try {
    const res=await fetch(new Request(req,{cache:'no-store'}));
    if(res.ok&&res.type==='basic') await cache.put(new URL('index.html',ROOT),res.clone());
    return res;
   }catch(e){return (await cache.match(new URL('index.html',ROOT)))||Response.error();}
  })());return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  const match=await cache.match(req,{ignoreSearch:true});
  if(match)return match;
  const response=await fetch(req);
  if(response.ok&&response.type==='basic')event.waitUntil(cache.put(req,response.clone()));
  return response;
 })());
});
