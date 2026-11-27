/* External Web Push is loaded only following consent or a previously enabled preference. */
(()=>{'use strict';let pending=null,instance=null;
window.walletProLoadOneSignal=function(){
 if(instance)return Promise.resolve(instance);if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  const queue=window.OneSignalDeferred=window.OneSignalDeferred||[];
  let finished=false, script=document.createElement('script'),timer;
  const fail=err=>{if(finished)return;finished=true;clearTimeout(timer);const i=queue.indexOf(init);if(i>=0)queue.splice(i,1);script.remove();reject(err);};
  const init=async OneSignal=>{if(finished)return;try{await OneSignal.init({appId:'c3c2efd9-1d3c-4806-aacc-8486e777c0c7',serviceWorkerPath:new URL('OneSignalSDKWorker.js',location.href).pathname,serviceWorkerParam:{scope:new URL('onesignal/',location.href).pathname},notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false});if(finished)return;finished=true;clearTimeout(timer);instance=OneSignal;resolve(OneSignal);}catch(e){fail(e);}};
  queue.push(init);script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.async=true;script.referrerPolicy='no-referrer';script.onerror=()=>fail(Error('SDK non scaricato. Riprova online.'));timer=setTimeout(()=>fail(Error('SDK non inizializzato. Riprova online.')),14000);document.head.appendChild(script);
 }).catch(e=>{pending=null;throw e;});return pending;
};})();
