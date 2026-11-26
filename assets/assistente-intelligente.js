/* Wallet-PRO: motore analitico locale, adattamento delle regole periodo di Lanna 1.0.0. */
(function(root){'use strict';
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const has=(q,s)=>(' '+q+' ').includes(' '+norm(s)+' ');
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const list=x=>Array.isArray(x)?x:[];
const KEY='walletpro_assistant_charts_v1';
function model(raw,state,now=new Date(),catalog={}){
 const q=norm(raw), years=[...new Set(q.match(/\b(?:19|20)\d{2}\b/g)||[])].sort();
 const inc=list(state.bankIncomeEntries).filter(Boolean),out=list(state.expenses).filter(Boolean);
 const salary=/\b(stipend\w*|cedolin\w*|retribuzion\w*)\b/.test(q), income=/\b(entrat\w*|incass\w*)\b/.test(q), expense=/\b(uscit\w*|spes\w*|pagat\w*)\b/.test(q), fuel=/\b(carburante|benzina|gasolio|diesel|riforniment\w*)\b/.test(q);
 if(/\b(ferie|rol|tfr|kwh|smc|consum\w*|irpef|oneri|imposte)\b/.test(q))return {error:'Dati tecnici documentali non disponibili in questo motore.'};
 const cats=[...new Set([...list(catalog.income),...list(catalog.expense),...inc.map(x=>x.category),...out.map(x=>x.category)].filter(Boolean))].sort((a,b)=>b.length-a.length);
 let cat=cats.find(c=>has(q,c)), direction=salary||income?'income':'expense';
 if(!cat&&/\bbonific[oi]\b/.test(q))cat=cats.find(c=>norm(c)==='bonifici');
 if(cat&&!income&&!expense&&!salary){const a=inc.some(x=>x.category===cat),b=out.some(x=>x.category===cat);if(a&&b)return {error:'Specifica entrate oppure uscite per questa categoria.'};if(a||list(catalog.income).includes(cat)&&!list(catalog.expense).includes(cat))direction='income';}
 if(income&&expense)return {error:'Specifica entrate oppure uscite.'};
 if(!cat&&!salary&&!income&&!expense&&!fuel)return {error:'Indica entrate, uscite, stipendio o una categoria esistente.'};
 let rows=direction==='income'?inc:out;
 if(cat&&!(fuel&&norm(cat)==='carburante'))rows=rows.filter(x=>x.category===cat);else if(salary)rows=rows.filter(x=>norm(x.category)==='stipendio');else if(fuel)rows=rows.filter(x=>norm(x.category)==='carburante'||(/auto.*trasport/.test(norm(x.category))&&/benzina|gasolio|diesel|carburante|riforniment|q8|tamoil|esso|shell/.test(norm(x.desc))));
 if(direction==='income'){
 rows=rows.slice();for(const [y,vals] of Object.entries(state.monthly||{}))list(vals).forEach((v,m)=>{const date=y+'-'+String(m+1).padStart(2,'0'), category=state.monthlyIncomeCategories?.[y+'-'+m]||'Stipendio';if(cat&&cat!==category||salary&&norm(category)!=='stipendio')return;const represented=inc.filter(x=>String(x.date).startsWith(date+'-')).reduce((n,x)=>n+(Number(x.amount)||0),0);const residual=Math.round((Number(v)-represented)*100)/100;if(residual>0)rows.push({date,amount:residual});});}
 let rule=root.WalletProPeriods.parse(raw,now,true);if(!rule)rule=root.WalletProPeriods.parse(raw+' tutti gli anni',now,true);if(!rule||rule.invalid)return {error:'Periodo non valido.'};
 rows=rows.filter(x=>typeof x.date==='string'&&Number.isFinite(Number(x.amount))&&x.amount!==null&&rule.accepts(x.date));
 const group=years.length===1&&rule.group==='year'?'month':rule.group||'year',width={year:4,month:7,day:10}[group]||4, sums=new Map();for(const x of rows){let k=x.date.slice(0,width);sums.set(k,(sums.get(k)||0)+Math.round(Number(x.amount)*100));}
 const points=[...sums].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,cents])=>({label,value:cents/100}));
 const totals=years.map(y=>({label:y,value:rows.filter(x=>x.date.startsWith(y)).reduce((n,x)=>n+Math.round(Number(x.amount)*100),0)/100}));
 return {title:cat||(salary?'Stipendio':fuel?'Carburante':direction==='income'?'Entrate':'Uscite'),points,totals,total:rows.reduce((n,x)=>n+Math.round(Number(x.amount)*100),0)/100,count:rows.length};
}
root.WalletProAssistant={model};if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),ui=root.walletProAssistantUI;
const read=(key,fallback)=>{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v)};
function data(){return read('lamiabp_pro_data_v1',read('lamiabp_new_data_v2',{}));}
function el(tag,parent,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;}
function btn(parent,text,action){const b=el('button',parent,text,'mini-btn');b.type='button';b.onclick=action;return b;}
function bubble(text){return el('div',$('wpAssistantLog'),text,'wp-assistant-bubble');}
function plot(parent,m){if(!m.points.length){el('p',parent,'Nessun movimento nel periodo.');return;}const max=Math.max(1,...m.points.map(p=>Math.abs(p.value)));for(const p of m.points){const r=el('div',parent,undefined,'wp-assistant-point');el('span',r,p.label);const bar=el('div',r,undefined,'wp-assistant-track');const fill=el('div',bar,undefined,'wp-assistant-fill');fill.style.width=(Math.abs(p.value)/max*100)+'%';el('span',r,money(p.value));}}
function chartKey(q){return norm(q).replace(/\b(crea|fammi|mostra|grafico|grafici|diagramma|andamento|per favore)\b/g,'').replace(/\s+/g,' ').trim();}
function charts(){const x=read(KEY,[]);if(!Array.isArray(x)||x.some(q=>typeof q!=='string'))throw Error('Grafici non validi');return x;}
function render(){const host=$('wpAssistantCharts');host.replaceChildren();try{for(const q of charts()){const c=el('div',host,undefined,'card');const m=model(q,data(),new Date(),ui.categories());el('h3',c,m.title||q,'chart-title');if(m.error)el('p',c,m.error);else plot(c,m);btn(c,'Elimina grafico',()=>{try{localStorage.setItem(KEY,JSON.stringify(charts().filter(x=>x!==q)));render()}catch(e){alert('Salvataggio non riuscito')}});}}catch(e){el('p',host,'Archivio grafici non leggibile. Nessun dato modificato.');}}
$('wpAssistantOpen').onclick=()=>ui.tab('assistente');$('wpAssistantBack').onclick=()=>ui.tab('dashboard');
for(const [label,id] of [['Buste paga PDF','payFilesInput'],['Estratto conto Excel','bankExcelInput'],['CSV Entrate','csvFileInput'],['CSV Uscite','expCsvFileInput']])btn($('wpAssistantImports'),label,()=>$(id).click());
btn($('wpAssistantImports'),'Scansiona scontrino',()=>{ui.open('uscita');$('receiptFileInput').click()});
$('wpAssistantForm').onsubmit=e=>{e.preventDefault();const field=$('wpAssistantText'),q=field.value.trim();if(!q)return;field.value='';bubble('Tu: '+q);try{
 if(/^(aggiungi|inserisci|registra|ho speso|ho ricevuto|ricevuto|pagato)\b/i.test(q)){const n=norm(q);if(/\b(scadenza|ricordami)\b/.test(n)){bubble('Usa Inserisci Scadenze nelle Impostazioni: verifica data e importo prima di salvare.');ui.tab('impostazioni');$('wpReminderType').closest('details').open=true;return;}const mode=/\bevento\b/.test(n)?'evento':/\b(uscita|spesa|speso|pagato)\b/.test(n)?'uscita':/\b(entrata|stipendio|bonifico|ricevuto|incassato)\b/.test(n)?'netto':'uscita';ui.open(mode);if(ui.currency()!=='EUR'){bubble('Compila manualmente l’importo nella valuta selezionata.');return;}const text=$('wpLannaVoiceText');text.value=q;if(/(?:€|euro|eur)/i.test(q))$('wpLannaVoiceImport').click();bubble('Verifica i campi e conferma con Salva. Nessuna registrazione automatica.');return;}
 if(/^ricordami\b/i.test(q)){ui.tab('impostazioni');$('wpReminderType').closest('details').open=true;$('wpReminderType').value='once';$('wpReminderType').dispatchEvent(new Event('change'));const date=q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);const amount=q.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€)/i);$('wpReminderDate').value=date?date[1]:'';$('wpRecurringAmount').value=amount?amount[1]:'';$('wpRecurringName').value=q.replace(/^ricordami\s*(?:di\s*)?/i,'').replace(date?.[0]||'__NO_DATE__','').replace(amount?.[0]||'__NO_AMOUNT__','').trim().slice(0,80);bubble('Controlla descrizione, data e importo, poi conferma nelle Impostazioni.');return;}
 const doc=root.WalletProDocArchive?.query(q,root.WalletProDocArchive.read());if(doc){const b=bubble(doc.title);if(!doc.points.length)el('p',b,'Nessun dato documentale disponibile.');for(const p of doc.points)el('p',b,p.label+': '+p.value+' '+p.unit);return;}const m=model(q,data(),new Date(),ui.categories());if(m.error){bubble(m.error);return;}const b=bubble(m.title+' · '+m.count+' movimenti · '+money(m.total));if(m.totals.length>1){for(const x of m.totals)el('div',b,x.label+': '+money(x.value));if(m.totals.length===2)el('div',b,'Differenza: '+money(m.totals[1].value-m.totals[0].value));}if(/\b(grafic\w*|andamento|confront\w*)\b/i.test(q)){plot(b,m);btn(b,'Aggiungi alla Dashboard',()=>{try{const a=charts();if(!a.some(x=>chartKey(x)===chartKey(q))){a.push(q);localStorage.setItem(KEY,JSON.stringify(a));}render();bubble('Grafico disponibile nella Dashboard.');}catch(e){bubble('Impossibile salvare il grafico.')}});}
 }catch(err){bubble('Archivio o richiesta non leggibile. Nessun dato modificato.');}};
root.addEventListener('walletpro:data-changed',render);root.addEventListener('storage',render);render();
})(typeof window==='undefined'?globalThis:window);
