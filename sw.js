/* Wallet-PRO 5.0.3 — verified release assets, local data independent of cache. */
const ROOT=new URL('./',self.registration.scope),HOME=new URL('index.html',ROOT).pathname;
const CACHE_NAME='wallet-pro-v503-20261127-'+encodeURIComponent(ROOT.pathname);
const CORE=["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./assets/notifiche-locali-5.0.0.js", "./assets/onesignal-config-5.0.0.js", "./assets/protezione-locale-5.0.0.js"],OPTIONAL=["./vendor/pdf.mjs", "./vendor/pdf.worker.mjs", "./vendor/xlsx.full.min.js", "./vendor/tesseract.min.js", "./vendor/tesseract-core.wasm.js", "./vendor/tesseract-core.wasm", "./vendor/worker.min.js", "./vendor/lang/ita.traineddata.gz", "./vendor/lang/eng.traineddata.gz"];
const HASH={
  "./index.html": "0f86e41d70e562920a370a16eaa24a310def0d11c717183fd8bc71990efa24f1",
  "./manifest.json": "20fdd09f8bbce9d99d8dc7d582849cc4abf211d372d13f35ea52d1facf15942d",
  "./icon-192.png": "a4a9705b2f87c2941a918014ee5f308b9ce95fcdacd73a77ab80564298d3286a",
  "./icon-512.png": "82846f9fe28b0e1b0a19b03f47288a268764a14251d79b14bbe785677c87ce8f",
  "./apple-touch-icon.png": "faaaccdc08c3bbf340696dc4bd61587b7c3fd1d295932da3ab062ed606c329ab",
  "./assets/notifiche-locali-5.0.0.js": "e23103696e14747e100ecaba0584a8f3116babe8685c9a0a1e87643996ddcfb3",
  "./assets/onesignal-config-5.0.0.js": "d9ee7a9eeb5cd30a33ee01b9b074b8a95a293b7b717f6a986676fe6e220ed747",
  "./assets/protezione-locale-5.0.0.js": "a326a2812795c937301b0f9bf972c9d52c9bcc445cf65219aa6234891bb45f98",
  "./vendor/pdf.mjs": "f1ee2b86d34109a9d3475b23f26882e1c8df38e051a74e4f1e8fd72c9a51885a",
  "./vendor/pdf.worker.mjs": "43710009ea26bfbcb615524946e46e3aaf8ad927514f5e465e8ff6d18044ffe9",
  "./vendor/xlsx.full.min.js": "cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41",
  "./vendor/tesseract.min.js": "99d4a84071a4d6c084a1a2a32f4df9a2290b2ad7da8270ee5d4fb152333e7440",
  "./vendor/tesseract-core.wasm.js": "c7309ce105c085c6afffc18090d29a271c4991526a179b0a78b61ee708f5a09d",
  "./vendor/tesseract-core.wasm": "a26ae92906331aa6303bda75e940ed56ae7d3f80ee60ad4074572405b25a83f7",
  "./vendor/worker.min.js": "c1c22bcc747e414ed95e12c99a2480740bfd6ba038836edc8f28df836825fdcf",
  "./vendor/lang/ita.traineddata.gz": "02cdb2adc096f65d5f746a5dd7c909497e113a86ed8a1a0fb19518e0955974a6",
  "./vendor/lang/eng.traineddata.gz": "75d12471a3f70f776364ddbbeb5032cce3e5457df4e7c3515cf2dfa08cb2e3c5"
};
const key=path=>new URL(path,ROOT).href;
const paths=new Map([...CORE,...OPTIONAL].map(path=>[new URL(path,ROOT).pathname,path]));
const inFlight=new Map();
function isHome(path){return path===ROOT.pathname||path===HOME;}
async function valid(response,path){if(!response?.ok||response.type==='opaque')return false;try{const bytes=await response.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')===HASH[path];}catch{return false;}}
async function cacheOne(cache,path){if(inFlight.has(path))return inFlight.get(path);const task=(async()=>{const req=new Request(key(path),{cache:'reload',credentials:'same-origin'}),response=await fetch(req);if(!await valid(response,path))throw Error('Risorsa non integra o non disponibile: '+path);await cache.put(key(path),response);})();inFlight.set(path,task);try{await task;}finally{inFlight.delete(path);}}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);try{const results=await Promise.allSettled(CORE.map(path=>cacheOne(cache,path)));if(results.some(r=>r.status==='rejected'))throw Error('Installazione incompleta: versione precedente conservata');await self.skipWaiting();}catch(e){await caches.delete(CACHE_NAME);throw e;}})()));
const previous=['wallet-pro-v502-20261127-'+encodeURIComponent(ROOT.pathname),'wallet-pro-v501-20261127-'+encodeURIComponent(ROOT.pathname),'wallet-pro-v500-20261127-'+encodeURIComponent(ROOT.pathname),'wallet-pro-v421-20261127','wallet-pro-v420-telecom-charts-20261127'];
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys(),cache=await caches.open(CACHE_NAME);for(const name of previous){if(!keys.includes(name))continue;const old=await caches.open(name);for(const path of OPTIONAL){try{if(await cache.match(key(path)))continue;const hit=await old.match(key(path),{ignoreSearch:true});if(await valid(hit,path))await cache.put(key(path),hit);}catch(e){console.warn('Migrazione facoltativa:',path,e);}}
// Never delete a cache containing another installation's paths on the same origin.
try{const entries=await old.keys();if(entries.length&&entries.every(req=>new URL(req.url).origin===ROOT.origin&&new URL(req.url).pathname.startsWith(ROOT.pathname))&&await old.match(key('./index.html'),{ignoreSearch:true}))await caches.delete(name);}catch(e){console.warn('Pulizia cache precedente:',e);}}
await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type!=='WALLET_PREPARE_OFFLINE_V500'||!event.ports?.[0])return;const port=event.ports[0];event.waitUntil((async()=>{try{const cache=await caches.open(CACHE_NAME),failed=[];let done=0;for(const path of OPTIONAL){try{if(!await valid(await cache.match(key(path)),path)){await cache.delete(key(path));await cacheOne(cache,path);}if(!await valid(await cache.match(key(path)),path))throw Error('Cache incompleta');}catch{failed.push(path);}port.postMessage({type:'progress',done:++done,total:OPTIONAL.length});}port.postMessage({type:'complete',failed});}catch(e){port.postMessage({type:'error',message:String(e.message||e)});}})());});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname)||url.searchParams.has('walletpro_check'))return;
if(req.mode==='navigate'){if(!isHome(url.pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);return (await cache.match(key('./index.html')))||fetch(req);})());return;}
const path=paths.get(url.pathname);if(!path)return; // No arbitrary cache entries, no push/API/version traffic.
event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME),hit=await cache.match(key(path));if(hit)return hit;try{await cacheOne(cache,path);const response=await cache.match(key(path));if(response)return response;}catch(e){console.warn('Risorsa release:',path,e);}return new Response('Risorsa della release non disponibile',{status:503,statusText:'Service Unavailable'});})());});
