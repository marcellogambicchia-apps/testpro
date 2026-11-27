/* Wallet-PRO: modulo notifiche separato, inizializzato dopo il database. */
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
 const toggle=$('wpNotifyDevice'),connect=$('wpNotifyConnect'); let busy=false, os=null, loading=null, ready=false, consent=!!prefs.onDevice;
 const permission=()=>typeof Notification==='undefined'?'unsupported':Notification.permission;
 const actual=()=>!!(os?.User?.PushSubscription?.optedIn&&os.User.PushSubscription.id&&os.User.PushSubscription.token&&permission()==='granted');
 function saveChoice(value){prefs.onDevice=!!value;prefs.pushChoiceExplicit=true;store();}
 function render(){toggle.checked=!!prefs.onDevice;toggle.disabled=busy||!ready;
  if(busy)return;
  if(!navigator.onLine){status('OneSignal: preferenza salvata; connessione assente.');return;}
  if(!ready)return;
  if(permission()==='denied'){status('Notifiche bloccate da iOS/browser. Controlla Impostazioni > Notifiche.');return;}
  if(actual()){status(prefs.onDevice?'OneSignal: iscrizione attiva. ID: '+os.User.PushSubscription.id:'Iscrizione presente; disattivazione non ancora confermata.');return;}
  status(prefs.onDevice?'Preferenza attiva, iscrizione non confermata. Disattiva e riattiva per riprovare.':'OneSignal disattivato. Attiva la spunta per autorizzare.');
 }
 function checkSupport(){if(!window.isSecureContext)throw Error('Apri Wallet-PRO via HTTPS.');if(!('serviceWorker' in navigator)||!('Notification' in window))throw Error('Su iPhone apri Wallet-PRO dalla schermata Home.');}
 async function getPush(){checkSupport();if(!navigator.onLine)throw Error('Connessione assente.');if(!window.walletProLoadOneSignal)throw Error('Configurazione OneSignal non caricata.');let timer;try{return await Promise.race([window.walletProLoadOneSignal(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SDK non inizializzato: ricarica online.')),15000)})]);}finally{clearTimeout(timer);}}
 function watch(){os.User.PushSubscription.addEventListener('change',()=>{if(!busy){if(!prefs.pushChoiceExplicit&&actual()){prefs.onDevice=true;store();}render();}});os.Notifications.addEventListener?.('permissionChange',()=>{if(!busy)render();});}
 async function refresh(){if(!consent&&!prefs.onDevice){ready=false;toggle.disabled=true;connect.disabled=false;status(os?'OneSignal disattivato. Per chiudere la sessione SDK già caricata, riapri l’app.':'OneSignal non connesso. Nessun caricamento del servizio esterno.');return;}if(busy||loading)return loading;if(!navigator.onLine){render();return;}
  loading=(async()=>{try{if(!os){status('Connessione a OneSignal…');os=await getPush();if(os.Notifications.isPushSupported?.()===false)throw Error('Web Push non supportato da questo browser.');watch();}ready=true;connect.disabled=true;
   if(!prefs.pushChoiceExplicit&&actual()){prefs.onDevice=true;store();}
   // Recover an already-authorized choice; never trigger a permission prompt outside a user gesture.
   if(prefs.onDevice&&permission()==='granted'&&!actual()&&!os.User.PushSubscription.optedIn){try{await os.User.PushSubscription.optIn();}catch(e){render();status('Iscrizione non confermata: '+e.message);return;}}
   render();
  }catch(e){ready=false;toggle.disabled=true;connect.disabled=false;status('OneSignal: '+(e.message||String(e)));}finally{loading=null;}})();return loading;
 }
 $('wpNotifyOpen').checked=!!prefs.onOpen;toggle.checked=!!prefs.onDevice;toggle.disabled=true;
 $('wpNotifyOpen').addEventListener('change',function(){prefs.onOpen=this.checked;store();draw()});
 toggle.addEventListener('change',async function(){const desired=toggle.checked;if(!ready||busy||!os){render();return;}busy=true;toggle.disabled=true;
  try{if(desired){saveChoice(true);status('Attivazione OneSignal…');if(permission()!=='granted'){
    // Invoke immediately within the real tap/change, without awaiting SDK initialization first.
    await os.Notifications.requestPermission();}
    if(permission()!=='granted')throw Error('Autorizzazione notifiche non concessa.');await os.User.PushSubscription.optIn();
   }else{await os.User.PushSubscription.optOut();if(os.User.PushSubscription.optedIn)throw Error('Disattivazione non confermata');saveChoice(false);consent=false;ready=false;connect.disabled=false;}
   busy=false;if(!consent&&!prefs.onDevice){await refresh();}else render();
  }catch(e){busy=false;render();status('Preferenza salvata; '+(e.message||String(e)));}finally{busy=false;toggle.disabled=!ready;toggle.checked=!!prefs.onDevice;}
 });
 connect.addEventListener('click',async function(){if(!confirm('Connettere OneSignal? Il servizio esterno riceve dati tecnici di connessione e iscrizione push. I documenti e i movimenti non vengono inviati.'))return;consent=true;await refresh();});
 $('wpNotifyTest').addEventListener('click',async function(){if(!consent&&!prefs.onDevice){status('Connetti OneSignal prima di verificare.');return;}await refresh();if(!os||!ready)return;try{const regs=await navigator.serviceWorker.getRegistrations();const root=new URL('./',location.href).href;const push=regs.find(r=>r.scope===new URL('onesignal/',root).href);const pwa=regs.find(r=>r.scope===root);status('Permesso: '+permission()+' · Iscrizione: '+(actual()?'attiva':'non confermata')+' · ID: '+(os.User.PushSubscription.id||'assente')+' · Token: '+(os.User.PushSubscription.token?'presente':'assente')+' · Worker push: '+(push?.active?'attivo':'non attivo')+' · Worker offline: '+(pwa?.active?'attivo':'non attivo')+'. Per una vera push usa la dashboard OneSignal.');}catch(e){status('Diagnostica: '+e.message);}});
 refresh();window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.LannaResetNotifications=async()=>{if(prefs.onDevice||os?.User.PushSubscription.optedIn){const sdk=os||await getPush();await sdk.User.PushSubscription.optOut();if(sdk.User.PushSubscription.optedIn)throw Error('Disattivazione push non verificata');}saveChoice(false);consent=false;ready=false;connect.disabled=false;await refresh();};
 draw();window.addEventListener('lanna:language-changed',draw);window.addEventListener('walletpro:reminders-changed',draw);document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw()});

})();

};
