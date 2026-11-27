/* Wallet-PRO: modulo notifiche separato, inizializzato dopo il database. */
window.walletProOneSignalReady?.catch(()=>{});
window.walletProStartNotifications=function(){
if(window.wp417NotificationsStarted)return;window.wp417NotificationsStarted=true;

/* Wallet-PRO Web: promemoria locali e OneSignal v16. */
(function(){'use strict';
 const KEY='walletpro_notify_settings_v1', REM='walletpro_simple_v2', IDS='lanna_ios_notification_ids_v1';
 const $=id=>document.getElementById(id);
 let prefs;try{prefs=Object.assign({onOpen:true,onDevice:false},JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){prefs={onOpen:true,onDevice:false}}
 const tr=t=>window.LannaLocale?.text(t)??t;
 const status=t=>{$('wpNotifyStatus').textContent=tr(t)};
 const store=()=>window.safeSet(KEY,JSON.stringify(prefs));
 const read=()=>{try{return JSON.parse(localStorage.getItem(REM)||'{}').reminders||[]}catch(e){return []}};
 const oldIds=()=>{try{return JSON.parse(localStorage.getItem(IDS)||'[]').filter(Number.isInteger)}catch(e){return []}};
 const day=(y,m,d)=>new Date(y,m,d,12,0,0,0);
 const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 function occurs(x,d){
   const y=d.getFullYear(),m=d.getMonth(),date=fmt(d),last=new Date(y,m+1,0).getDate();
   if(x.type==='once')return x.date===date;
   if(x.type==='yearly'){
     const parts=String(x.date||'').split('-').map(Number);
     return parts.length===3&&parts[1]===m+1&&Math.min(parts[2],last)===d.getDate();
   }
   if(x.type==='weekly'){
     const base=new Date(String(x.date||'')+'T12:00:00');
     return Number.isFinite(base.getTime())&&d>=base&&Math.round((d-base)/86400000)%7===0;
   }
   const n=Number(x.day);
   return x.type==='monthly'&&Number.isInteger(n)&&n>=1&&n<=31&&Math.min(n,last)===d.getDate();
 }
 function dueTomorrow(){const n=new Date(),t=day(n.getFullYear(),n.getMonth(),n.getDate()+1);return read().filter(x=>occurs(x,t))}
 function draw(){const due=dueTomorrow(),el=$('wpNotifyDue');el.replaceChildren();if(!prefs.onOpen||!due.length)return;
   const box=document.createElement('div');box.className='wp-notify-due';const title=document.createElement('strong');title.textContent=due.length===1?tr('Hai una scadenza domani'):(window.LannaLocale?.dueCount(due.length)??('Hai '+due.length+' scadenze domani'));box.append(title);
   due.forEach(x=>{const row=document.createElement('div');row.setAttribute('data-lanna-user-text','');row.textContent=String(x.name||tr('Scadenza'));row.style.marginTop='6px';box.append(row)});el.append(box);
 }
 const toggle=$('wpNotifyDevice'); let busy=false, os=null, loading=null, ready=false;
 const permission=()=>typeof Notification==='undefined'?'unsupported':Notification.permission;
 const sub=()=>os?.User?.PushSubscription;
 const actual=()=>!!(sub()?.optedIn&&permission()==='granted');
 function saveChoice(value){prefs.onDevice=!!value;store();}
 function render(){toggle.checked=os?actual():!!prefs.onDevice;toggle.disabled=busy||!ready;
  if(busy)return;
  if(!navigator.onLine){status('OneSignal: connessione assente.');return;}
  if(!ready)return;
  if(permission()==='denied'){status('Notifiche bloccate da iOS/browser. Controlla Impostazioni > Notifiche.');return;}
  status(actual()?'OneSignal: iscrizione attiva'+(sub().id?' · ID: '+sub().id:' · ID in attesa'):'OneSignal pronto. Attiva Notifiche sul dispositivo.');
 }
 function checkSupport(){if(!window.isSecureContext)throw Error('Apri Wallet-PRO via HTTPS.');if(!('serviceWorker' in navigator)||!('Notification' in window))throw Error('Su iPhone apri Wallet-PRO dalla schermata Home.');}
 async function getPush(){checkSupport();if(!navigator.onLine)throw Error('Connessione assente.');if(!window.walletProOneSignalReady)throw Error('Configurazione OneSignal non caricata.');let timer;try{return await Promise.race([window.walletProOneSignalReady,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SDK non inizializzato: ricarica online.')),15000)})]);}finally{clearTimeout(timer);}}
 // Original v3.1.0 startup and synchronization with the SDK's real subscription.
 function sync(){if(!busy&&os){saveChoice(actual());render();}}
 function watch(){sub().addEventListener('change',sync);os.Notifications.addEventListener?.('permissionChange',sync);}
 async function refresh(){if(busy||loading)return loading;if(!navigator.onLine){render();return;}
  loading=(async()=>{try{if(!os){status('Connessione a OneSignal…');os=await getPush();if(os.Notifications.isPushSupported?.()===false){os=null;throw Error('Web Push non supportato da questo browser.');}watch();}ready=true;sync();
  }catch(e){ready=false;toggle.disabled=true;status('OneSignal: '+(e.message||String(e)));}finally{loading=null;}})();return loading;
 }
 // Handle original initializer rejection even if local database boot is delayed.
 window.walletProOneSignalReady?.catch(()=>{});
 $('wpNotifyOpen').checked=!!prefs.onOpen;toggle.checked=!!prefs.onDevice;toggle.disabled=true;
 $('wpNotifyOpen').addEventListener('change',function(){prefs.onOpen=this.checked;store();draw()});
 toggle.addEventListener('change',async function(){const desired=toggle.checked;if(!ready||busy||!os){render();return;}busy=true;toggle.disabled=true;
  try{if(desired){status('Attivazione OneSignal…');if(permission()!=='granted')await os.Notifications.requestPermission();if(permission()!=='granted')throw Error('Autorizzazione notifiche non concessa.');await sub().optIn();if(!actual())throw Error('Iscrizione non ancora attiva. Riprova tra qualche secondo.');}
   else{await sub().optOut();if(sub().optedIn)throw Error('Disattivazione non confermata');}
   busy=false;sync();
  }catch(e){busy=false;sync();status('OneSignal: '+(e.message||String(e)));}finally{busy=false;toggle.disabled=!ready;toggle.checked=actual();}
 });
 $('wpNotifyTest').addEventListener('click',async function(){await refresh();if(!os||!ready)return;try{const regs=await navigator.serviceWorker.getRegistrations();const root=new URL('./',location.href).href;const push=regs.find(r=>r.scope===new URL('onesignal/',root).href);const pwa=regs.find(r=>r.scope===root);status('Permesso: '+permission()+' · Iscrizione: '+(actual()?'attiva':'non confermata')+' · ID: '+(sub().id||'assente')+' · Token: '+(sub().token?'presente':'assente')+' · Worker push: '+(push?.active?'attivo':'non attivo')+' · Worker offline: '+(pwa?.active?'attivo':'non attivo')+'. Per una vera push usa la dashboard OneSignal.');}catch(e){status('Diagnostica: '+e.message);}});
 refresh();window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.LannaResetNotifications=async()=>{if(prefs.onDevice||sub()?.optedIn){const sdk=os||await getPush();await sdk.User.PushSubscription.optOut();if(sdk.User.PushSubscription.optedIn)throw Error('Disattivazione push non verificata');}saveChoice(false);render();};
 draw();window.addEventListener('lanna:language-changed',draw);window.addEventListener('walletpro:reminders-changed',draw);document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw()});

})();

};
