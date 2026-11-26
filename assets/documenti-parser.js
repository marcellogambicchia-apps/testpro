(function(root){'use strict';
const MONTHS='gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre'.split(' ');
function documentMoneyTokens(line){return [...String(line).matchAll(/(?:^|[^\d.,-])((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?![\d.,])/g)].map(m=>lannaParseItalianNumber(m[1])).filter(n=>n>0&&n<=1000000);}

  function lannaParseItalianNumber(s){
    s=String(s||'').trim();var neg=/-$/.test(s)||/^[-−]/.test(s);
    s=s.replace(/[−-]/g,'').replace(/\s/g,'');
    if(!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,3})?$/.test(s))return null;
    var n=Number(s.replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n)?(neg?-n:n):null;
  }
  // A87: Lettura per celle PDF con coordinate, non per quattro numeri consecutivi.
  // Ogni riga è individuata dalle sue sei intestazioni; celle vuote rimangono null.
  // A88: associazione rigorosa fra etichette, colonne e valori (coordinate PDF.js).
  // Nessun dato campione viene inserito nell'app.
  function lannaPositionedPage(items){
    var rows=[];
    (items||[]).forEach(function(it){
      if(!it||!it.str||!it.str.trim()||!it.transform)return;
      var x=Number(it.transform[4]),y=Number(it.transform[5]);
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      var r=rows.find(function(v){return Math.abs(v.y-y)<=2.5});
      if(!r){r={y:y,parts:[]};rows.push(r)}
      r.parts.push({x:x,s:it.str.trim(),w:Math.max(0,Number(it.width)||0)});
    });
    rows.sort(function(a,b){return b.y-a.y});
    rows.forEach(function(r){r.parts.sort(function(a,b){return a.x-b.x})});
    function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
    function isNum(s){return /^[-−]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}[-−]?$/.test(String(s).trim())}
    function rowAnchors(r,patterns){
      // Consente che PDF.js spezzi un'intestazione in più frammenti.
      var parts=r.parts,full='',starts=[];
      parts.forEach(function(p){starts.push(full.length);full+=norm(p.s)+' '});
      var matches=patterns.map(function(re){
        var m=re.exec(full);if(!m)return null;
        var ix=starts.length-1;
        for(var j=0;j<starts.length;j++){if(starts[j]<=m.index)ix=j;else break}
        return {x:parts[ix].x,at:m.index};
      });
      if(matches.some(function(v){return !v}))return null;
      if(matches.some(function(v,i){return i>0&&v.x<=matches[i-1].x+5}))return null;
      return matches;
    }
    function findTable(patterns){
      for(var i=0;i<rows.length;i++){
        var heads=rowAnchors(rows[i],patterns);if(!heads)continue;
        var values=[],validCount=0;
        for(var c=0;c<heads.length;c++){
          // Gli importi sono allineati a destra nelle celle: confini dalle intestazioni.
          var left=c===0?heads[0].x-7:heads[c].x-7;
          var right=c<heads.length-1?heads[c+1].x-5:Infinity;
          var candidates=[];
          for(var j=i+1;j<rows.length;j++){
            var distance=rows[i].y-rows[j].y;
            if(distance>57)break;
            // Non attraversare la riga di intestazione della tabella successiva.
            if(j>i+1&&rows[j].parts.filter(function(p){return /[a-zA-Z]{3}/.test(p.s)}).length>=3)break;
            rows[j].parts.forEach(function(p){
              if(isNum(p.s)&&p.x>=left&&p.x<right)candidates.push({n:lannaParseItalianNumber(p.s),distance:distance});
            });
          }
          var unique=candidates.filter(function(v){return v.n!==null});
          // Se la cella contiene più numeri non si sceglie arbitrariamente.
          var val=unique.length===1?unique[0].n:null;
          values.push(val);if(val!==null)validCount++;
        }
        if(validCount>=2)return values;
      }
      return null;
    }
    var leave={},fields={};
    var ferie=findTable([/ferie\s+res\.?\s*ap\b/,/ferie\s+maturate\b/,/ferie\s+godute\b/,/s\.?do\s+ferie\s+mat\.?\b/,/spett\s+ferie\s+anno\b/,/saldo\s+ferie\s+anno\b/]);
    if(ferie)leave.ferie={unit:'non specificata',previous:ferie[0],accrued:ferie[1],used:ferie[2],accruedBalance:ferie[3],annualEntitlement:ferie[4],annualBalance:ferie[5],source:'celle-pdf-v88'};
    var par=findTable([/par\s+res\.?\s*ap\b/,/par\s+maturate\b/,/par\s+godute\b/,/s\.?do\s+par\s+mat\.?\b/,/par\s+anno\b/,/par\s+saldo\s+anno\b/]);
    if(par)leave.rol={unit:'non specificata',previous:par[0],accrued:par[1],used:par[2],accruedBalance:par[3],annualEntitlement:par[4],annualBalance:par[5],source:'celle-pdf-v88'};
    var gg=findTable([/gg\s+ferie\s+saldo\s+ap\b/,/gg\s+ferie\s+saldo\s+ac\b/,/gg\s+ferie\s+saldo\s+tot\b/,/hh\s+ferie\s+saldo\s+ap\b/,/hh\s+ferie\s+saldo\s+ac\b/,/hh\s+ferie\s+saldo\s+tot\b/]);
    if(gg)leave.ferieBalances={daysPrevious:gg[0],daysCurrent:gg[1],daysTotal:gg[2],hoursPrevious:gg[3],hoursCurrent:gg[4],hoursTotal:gg[5],source:'celle-pdf-v88'};
    var conto=findTable([/residuo\s+conto\s+ore\s+ap\b/,/conto\s+ore\s+spettante\b/,/conto\s+ore\s+godute\b/,/saldo\s+banca\s+ore\b/,/res\.?\s*conto\s+ore\s+attual\b/,/conto\s+ore\s+res\.?\s*aa-?2\b/]);
    if(conto)leave.contoOre={previous:conto[0],entitlement:conto[1],used:conto[2],bankBalance:conto[3],currentBalance:conto[4],previous2:conto[5],source:'celle-pdf-v88'};
    // Totali finali: etichetta sopra il valore, anche con più colonne affiancate.
    var summary=[['total_earnings',/totale\s+competenze\b/],['total_deductions',/totale\s+trattenute\b/],['net_summary',/netto\s+a\s+pagare\b/]];
    summary.forEach(function(rule){
      for(var i=0;i<rows.length;i++){
        var parts=rows[i].parts,full='',starts=[];
        parts.forEach(function(p){starts.push(full.length);full+=norm(p.s)+' '});
        var m=rule[1].exec(full);if(!m)continue;
        var idx=0;for(var k=0;k<starts.length;k++){if(starts[k]<=m.index)idx=k;else break}
        var left=parts[idx].x-5;
        var next=parts.find(function(p){return p.x>left+25&&/[a-zA-Z]{3}/.test(p.s)});
        var right=next?next.x-5:Math.max(left+125,left+Number(parts[idx].w||0)+65);
        var hits=[];
        for(var j=i+1;j<rows.length;j++){
          var dy=rows[i].y-rows[j].y;if(dy>43)break;
          if(j>i+1&&rows[j].parts.some(function(p){return /[a-zA-Z]{4}/.test(p.s)}))break;
          rows[j].parts.forEach(function(p){if(isNum(p.s)&&p.x>=left&&p.x<right)hits.push(lannaParseItalianNumber(p.s))});
        }
        hits=hits.filter(function(v){return v!==null});
        if(hits.length===1){fields[rule[0]]=hits[0];break}
      }
    });
    return {leave:leave,fields:fields};
  }
  function extractLannaPayslipData(lines){
    var result={schema:1,fields:{},leave:{},items:[],warnings:[]};
    var rules=[
      ['total_earnings',/\btotale\s+competenze\b/i],
      ['total_deductions',/\btotale\s+trattenute\b/i],
      ['contribution_base',/\bimponibile\s+contributivo\b/i],
      ['tax_base',/\bimponibile\s+fiscale\b/i],
      ['gross_irpef',/\birpef\s+lorda\b/i],
      ['net_irpef',/\birpef\s+netta\b/i],
      ['employee_deductions',/\bdetr(?:azion[ei]|\.)?\s*(?:lav\.?\s*dipendente|lavoro\s+dipendente)\b/i],
      ['tfr_eligible_pay',/\bretribuzione\s+utile\s+tfr\b/i],
      ['tfr_accrued',/\btfr\s+(?:maturat[oa]|accantonat[oa])\b/i],
      ['inps',/\b(?:contributi?\s+inps|trattenut[ae]\s+inps)\b/i],
      ['overtime',/\bstraordinar[io]\b/i]
    ];
    function values(s){var m=String(s).match(/(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,3}-?/g)||[];return m.map(lannaParseItalianNumber).filter(function(x){return x!==null});}
    lines.forEach(function(line,i){
      line=String(line||'').trim();
      rules.forEach(function(rule){
        if(result.fields[rule[0]]!==undefined||!rule[1].test(line))return;
        var match=rule[1].exec(line),tail=line.slice(match.index+match[0].length),nums=values(tail);
        // A single clear amount after the label is accepted; multiple amounts require review.
        if(nums.length===1)result.fields[rule[0]]=nums[0];
        else if(nums.length>1)result.warnings.push('Verificare '+rule[0]+': più valori sulla riga');
      });
      // Tabelle ferie: accetta etichetta e quattro valori sulla stessa riga.
      var leaveMatch=/\b(ferie|rol|permessi(?:\s+riduzione\s+orario)?|ex\s+festivit[aà])\s*(?:\((ore|giorni|gg)\))?/i.exec(line);
      if(leaveMatch){
        var k=/ferie/i.test(leaveMatch[1])?'ferie':/rol|permessi/i.test(leaveMatch[1])?'rol':'ex_festivita';
        var unit=/giorni|gg/i.test(leaveMatch[2]||'')?'giorni':/ore/i.test(leaveMatch[2]||'')?'ore':null;
        var rest=line.slice(leaveMatch.index+leaveMatch[0].length);
        var nums=values(rest);
        // Alcuni PDF collocano intestazioni e numeri su righe diverse.
        // Si leggono soltanto quattro numeri consecutivi, senza parole estranee.
        if(nums.length!==4){
          var windowLines=lines.slice(i+1,i+5).map(function(x){return String(x||'').trim()});
          for(var j=0;j<windowLines.length;j++){
            var candidate=windowLines[j];
            if(/\b(ferie|rol|permessi|festivit[aà]|netto|totale|imponibile|irpef|tfr)\b/i.test(candidate))break;
            var found=values(candidate);
            if(found.length===4 && !/[a-z]{4,}/i.test(candidate)){nums=found;break;}
          }
        }
        if(nums.length===4 && nums.every(function(n){return Math.abs(n)<=100000})){
          result.leave[k]={unit:unit||'unità da verificare',previous:nums[0],accrued:nums[1],used:nums[2],remaining:nums[3]};
          if(!unit)result.warnings.push('Verificare unità '+k+' (ore/giorni)');
        }else result.warnings.push('Verificare saldo '+k+': quattro colonne non associate con certezza');
      }
    });
    // Coordinate-based fields supersede the legacy heuristic, which can mistake PAR for ferie.
    var positioned=lines.lannaPositioned||{};
    Object.keys(positioned.leave||{}).forEach(function(k){result.leave[k]=positioned.leave[k]});
    Object.keys(positioned.fields||{}).forEach(function(k){result.fields[k]=positioned.fields[k]});
    // Never trust four arbitrary numbers after a general FERIE/PERMESSI heading.
    ['ferie','rol','ex_festivita'].forEach(function(k){if(result.leave[k]&&result.leave[k].source!=='celle-pdf-v88')delete result.leave[k]});
    if(result.fields.total_earnings!==undefined&&result.fields.total_deductions!==undefined&&result.fields.net_summary!==undefined){
      if(Math.abs(result.fields.total_earnings-result.fields.total_deductions-result.fields.net_summary)>0.02)
        result.warnings.push('Totali competenze/trattenute/netto non coerenti: verificare PDF');
    }
    // The source PDF is deliberately not retained; neither names nor unclassified text are stored.
    return result;
  }
  // PAY-PURE-START
  var AMT_RE = /(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g;
  var MON_ABBR = '(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)';
  var MON_FULL = '(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)';
  var RE_NAMED = new RegExp('\\b' + MON_ABBR + '\\b\\.?\\s*(?:del\\s+|/|-)?\\s*(20\\d{2})\\b', 'i');
  var RE_NUM = /\b(0?[1-9]|1[0-2])\s*[\/\-.]\s*(20\d{2})\b/;
  var RE_KEY = /periodo|mese|competenza|retribuzion|cedolino|paga\b/i;
  var NETTO_KEYS = [/netto\s+del\s+mese/i, /netto\s+in\s+busta/i, /netto\s+(?:a|da)\s+pagare/i, /netto\s+busta/i, /totale\s+netto/i, /netto\s+pagato/i, /^\s*netto\b/i];

  function monthFromName(s) {
    s = String(s).toLowerCase();
    for (var m = 0; m < 12; m++) { if (MONTHS[m].toLowerCase().indexOf(s) === 0) return m; }
    return -1;
  }
  function amountsIn(str) { return str.match(AMT_RE) || []; }

  // Individua il netto in cedolini con etichette su una o più righe.
  // In caso di più importi plausibili non sceglie arbitrariamente.
  // Famiglie di etichette: gestionali italiani, PA e cedolini multilingue.
  // Priorità: netto da pagare > netto mensile > etichetta generica.
  var NETTO_LABELS = [
    /\bnetto\s+(?:a|da)\s+(?:pagare|corrispondere|liquidare|erogare|accreditare)\b/i,
    /\b(?:importo|totale)\s+(?:netto\s+)?(?:da\s+)?(?:accreditare|corrispondere|pagare)\b/i,
    /\b(?:liquido|somma)\s+(?:a|da)\s+(?:pagare|corrispondere|liquidare)\b/i,
    /\bnetto\s+(?:del\s+mese|in\s+busta|busta|pagato|mensile|dipendente|da\s+corrispondere)\b/i,
    /\b(?:importo|totale|retribuzione|stipendio)\s+netto\b/i,
    /\b(?:net\s+pay|take[\s-]*home\s+pay|net\s+salary|net\s+amount)\b/i,
    /\bnetto\b/i
  ];
  function moneyTokens(line) {
    return documentMoneyTokens(line,false);
  }
  function findNetto(lines) {
    var matches=[];
    for(var i=0;i<lines.length;i++) {
      var line=String(lines[i]||'');
      // Non confondere imponibile fiscale netto, ritenute e progressivi con il netto in busta.
      if (/\b(?:fiscale\s+netto|imponibile|ritenut[ae]|tfr|progressiv[oi]|contributi|detrazioni|netto\s+imponibile)\b/i.test(line) &&
          !/\bnetto\s+(?:a|da)\s+pagare\b/i.test(line)) continue;
      var combined=line+' '+String(lines[i+1]||'')+' '+String(lines[i+2]||'');
      var label=null, priority=0, labelEnd=0;
      for(var k=0;k<NETTO_LABELS.length;k++) {
        var m=NETTO_LABELS[k].exec(line);
        if(m) {label=m[0];priority=NETTO_LABELS.length-k;labelEnd=m.index+m[0].length;break;}
        // Etichette spezzate: "NETTO A" / "PAGARE".
        if(k<NETTO_LABELS.length-1) {
          m=NETTO_LABELS[k].exec(combined);
          if(m && m.index < line.length && m.index+m[0].length>line.length) {
            label=m[0];priority=NETTO_LABELS.length-k;labelEnd=-1;break;
          }
        }
      }
      if(!label) continue;
      // Stessa riga: cerca soltanto gli importi DOPO l'etichetta.
      var same=labelEnd>=0?moneyTokens(line.slice(labelEnd)):[];
      if(same.length===1) {matches.push({amount:same[0],score:priority*10+5,at:i});continue;}
      if(same.length>1) continue;
      // Un importo esplicito ma invalido non autorizza la scelta di un valore su un'altra riga.
      if(labelEnd>=0&&/\d\s*[.,]\s*\d/.test(line.slice(labelEnd)))continue;
      // Nelle tabelle il netto può essere sotto un'intestazione spezzata.
      // Non oltrepassare un'altra intestazione o una nuova sezione.
      for(var j=i+1;j<=i+4 && j<lines.length;j++){
        var next=String(lines[j]||'');
        if(/\b(?:imponibil[ei]|totale\s+competenze|totale\s+trattenute|ritenut[ae]|contributi|detrazioni|istituto\s+residue|elementi\s+retributivi)\b/i.test(next))break;
        var nums=moneyTokens(next);
        // Data valuta + importo netto: la data non viene riconosciuta come denaro.
        if(nums.length===1) {matches.push({amount:nums[0],score:priority*10+2-(j-i),at:i});break;}
        if(nums.length>1) break; // non indovinare tra competenze e trattenute
      }
    }
    if(!matches.length)return null;
    matches.sort(function(a,b){return b.score-a.score;});
    var best=matches[0], tied=matches.filter(function(x){return x.score>=best.score-2;});
    if(tied.some(function(x){return Math.abs(x.amount-best.amount)>0.005;}))return null;
    return best.amount;
  }

  function detectPeriod(lines) {
    var RE_SKIP = /assunz|assunt|nascita|nato\b|nata\b|anzianit|cessaz|scadenz|iscrizion/i;
    var head = lines.slice(0, 45).filter(function(l) { return !RE_SKIP.test(l); });
    var keyLines = head.filter(function(l) { return RE_KEY.test(l); });
    var i, m;
    for (i = 0; i < keyLines.length; i++) {
      m = RE_NAMED.exec(keyLines[i]);
      if (m) return { m: monthFromName(m[1]), y: parseInt(m[2], 10) };
    }
    for (i = 0; i < keyLines.length; i++) {
      m = RE_NUM.exec(keyLines[i]);
      if (m) return { m: parseInt(m[1], 10) - 1, y: parseInt(m[2], 10) };
    }
    for (i = 0; i < head.length; i++) {
      m = RE_NAMED.exec(head[i]);
      if (m) return { m: monthFromName(m[1]), y: parseInt(m[2], 10) };
    }
    var mo = -1, yr = 0;
    var reFull = new RegExp('\\b' + MON_FULL + '\\b', 'i');
    for (i = 0; i < keyLines.length && mo < 0; i++) { m = reFull.exec(keyLines[i]); if (m) mo = monthFromName(m[1]); }
    for (i = 0; i < head.length && !yr; i++) { m = /anno\s*:?\s*(20\d{2})/i.exec(head[i]); if (m) yr = parseInt(m[1], 10); }
    return { m: mo, y: yr };
  }

  function periodFromName(name) {
    var n = String(name).replace(/\.pdf$/i, '');
    var spaced = n.replace(/[_\.]/g, ' ');
    var m = RE_NAMED.exec(spaced);
    if (m) return { m: monthFromName(m[1]), y: parseInt(m[2], 10) };
    m = /(20\d{2})[-_. ]?(0[1-9]|1[0-2])(?!\d)/.exec(n);
    if (m) return { m: parseInt(m[2], 10) - 1, y: parseInt(m[1], 10) };
    m = /(?:^|[^\d])(0?[1-9]|1[0-2])[-_. ](20\d{2})(?!\d)/.exec(n);
    if (m) return { m: parseInt(m[1], 10) - 1, y: parseInt(m[2], 10) };
    var mm = new RegExp('\\b' + MON_FULL + '\\b', 'i').exec(spaced);
    var yy = /(20\d{2})/.exec(n);
    return { m: mm ? monthFromName(mm[1]) : -1, y: yy ? parseInt(yy[1], 10) : 0 };
  }

  var legacyPayLabels={
    legacy_social_base:'Imponibile Previdenziale Progressivo',
    legacy_tax_base:'Imponibile Fiscale Progressivo',
    legacy_social_contrib:'Contributi Previdenziali Progressivi',
    legacy_net_tax:'Imposta Netta Progressiva',
    legacy_tfr_pr:'TFR A Fondo PR',
    legacy_tfr_mm:'TFR A Fondo MM',
    legacy_employee_contrib:'Contributi A Carico Dipendente',
    legacy_company_contrib:'Contributi A Carico Azienda',
    legacy_tfr_contrib:'Contributi A Carico TFR'
  };
  function legacyPayFields(lines,net){
    var fields={};
    if(!lines.some(function(line){return /IMPONIBILI PROGRESSIVI.*RITENUTE PROGRESSIVE/i.test(line);}))return fields;
    var n='((?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2})';
    var rules={
      legacy_social_base:'^IMPONIBILE PREV\\.?',legacy_tax_base:'^IMPONIBILE FISC\\.?',
      legacy_social_contrib:'\\bCTR PREVIDENZ\\.',legacy_net_tax:'\\bIMPOSTA NETTA',
      tfr_eligible_pay:'\\bIMPON\\. TFR MESE',legacy_tfr_pr:'\\bTFR A FONDO PR\\.?',
      legacy_tfr_mm:'\\bTFR A FONDO MM\\.?',legacy_employee_contrib:'^CTR\\. C/DIPEND\\.',
      legacy_company_contrib:'^CTR\\. C/AZIENDA',legacy_tfr_contrib:'^CTR\\. C/T\\.F\\.R\\.'
    };
    Object.entries(rules).forEach(function(rule){
      var re=new RegExp(rule[1]+'\\s+'+n+'(?![\\d,])','i');
      var values=new Set(lines.map(function(line){return line.match(re)?.[1];}).filter(Boolean).map(lannaParseItalianNumber));
      if(values.size===1)fields[rule[0]]=values.values().next().value;
    });
    var totals=new RegExp('\\bTOTALI\\s+'+n+'\\s+'+n+'\\s*$','i');
    var pairs=new Map();
    lines.forEach(function(line){
      var match=line.match(totals);if(!match)return;
      var earned=lannaParseItalianNumber(match[1]),deducted=lannaParseItalianNumber(match[2]);
      if(net!==null&&Math.abs(Math.round((earned-deducted-net)*100))<=2)pairs.set(earned+'|'+deducted,[earned,deducted]);
    });
    if(pairs.size===1){
      var pair=pairs.values().next().value;
      fields.total_earnings=pair[0];fields.total_deductions=pair[1];
    }
    return fields;
  }
  function parsePayslip(lines, fileName) {
    var amount = findNetto(lines);
    if (amount !== null && (isNaN(amount) || amount <= 0 || amount > 1000000)) amount = null;
    var per = detectPeriod(lines);
    var fn = periodFromName(fileName || '');
    var detail=extractLannaPayslipData(lines);
    detail.fields=Object.assign(legacyPayFields(lines,amount),detail.fields);
    return { amount: amount, m: per.m >= 0 ? per.m : fn.m, y: per.y ? per.y : fn.y, detail: detail };
  }
function norm(s){return String(s||'').toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function uniqueBillNumber(text, pattern, parse) {
  var values = Array.from(text.matchAll(pattern), function(match) { return parse(match[1]); });
  values = Array.from(new Set(values.filter(Number.isFinite)));
  return values.length === 1 ? values[0] : null;
}

function billPageText(items) {
  var rows = [], row = [], previousY = null;
  items.forEach(function(item) {
    if (typeof item.str !== 'string') return;
    var y = item.transform && item.transform[5];
    if (row.length && Number.isFinite(y) && Number.isFinite(previousY) && Math.abs(y - previousY) > 3) {
      rows.push(row.join(' '));
      row = [];
    }
    if (item.str.trim()) row.push(item.str.trim());
    if (item.hasEOL && row.length) {
      rows.push(row.join(' '));
      row = [];
    }
    previousY = y;
  });
  if (row.length) rows.push(row.join(' '));
  return rows.join('\n');
}

var billFieldLabels = {
  pod:'POD', pdr:'PDR', kwh:'Consumo fatturato (kWh)', smc:'Consumo fatturato (Smc)',
  kw:'Potenza impegnata (kW)', priceKwh:'Prezzo medio quota consumi (€/kWh)', priceSmc:'Prezzo medio quota consumi (€/Smc)',
  supplyRate:'Prezzo medio della sola vendita (€/kWh o €/Smc)', consumptionCost:'Quota consumi (€)', tvFee:'Canone TV (€)',
  invoiceNumber:'Numero fattura', invoiceDate:'Data emissione', period:'Periodo', periodStart:'Inizio periodo', periodEnd:'Fine periodo',
  annualKwh:'Consumo annuo riportato (kWh)', annualSmc:'Consumo annuo riportato (Smc)',
  payable:'Totale da pagare (€)', paymentMethod:'Modalità di pagamento', debitDate:'Data addebito', dueDate:'Data di scadenza',
  energyCost:'Materia energia o gas (€)', fixedCost:'Quota fissa (€)', powerCost:'Quota potenza (€)',
  networkCost:'Trasporto e gestione contatore (€)', systemCharges:'Oneri di sistema (€)',
  taxes:'Totale imposte (€)', vat:'Totale IVA (€)', excise:'Totale accise (€)', adjustments:'Totale ricalcoli (€)'
};
var billTextFields = new Set(['pod','pdr','invoiceNumber','invoiceDate','period','periodStart','periodEnd','dueDate','paymentMethod','debitDate']);

function extract(text,file){
// Estrazione prudente: priorita' ai campi etichettati, mai ai primi kWh del PDF.
var n=norm(text);
function field(re){var m=text.match(re);return m?m[1].trim():''}
function num(v){if(!v)return null;v=String(v).replace(/\s/g,'').replace(/−/g,'-');if(v.indexOf(',')>=0)v=v.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(?:\.\d{3})+$/.test(v))v=v.replace(/\./g,'');var x=Number(v);return Number.isFinite(x)?x:null}
function amount(re){return num(field(re))}
var pod=field(/\bPOD\s*[:\-]?\s*(IT[A-Z0-9]{8,20})/i),pdr=field(/\bPDR\s*[:\-]?\s*(\d{10,18})/i);
// 'gas naturale' nelle note legali non rende una bolletta elettrica una bolletta gas.
var head=norm(text.slice(0,Math.min(text.length,2600)));
var electric=!!pod||/\benergia elettrica\b|\bservizio elettrico\b|\bbolletta luce\b/.test(head);
var gas=!!pdr||/\bfornitura (?:di )?gas\b|\bbolletta (?:del )?gas\b|\bservizio gas\b/.test(head);
var type=electric&&!gas?'Luce':gas&&!electric?'Gas':electric&&gas?(pod&&!pdr?'Luce':pdr&&!pod?'Gas':'Da verificare'):/\b(acquedotto|fognatura|depurazione)\b/.test(head)?'Acqua':'Da verificare';
var providers=['Enel Energia','Eni Plenitude','Edison','A2A','Acea','Iren','Hera','Engie','Sorgenia','Dolomiti Energia','E.ON','Illumia','Estra','Alperia','AGSM AIM','Duferco Energia','Pulsee','NeN','Enercom','Sinergas','Vivi Energia','Axpo','Octopus Energy','Energia','TIM','Vodafone','Fastweb','Iliad','WindTre'];
var namedProvider=field(/^[ \t]*(?:venditore|gestore|fornitore(?: di energia)?)\s*:[ \t]*([^\n]{3,75})$/im);
var provider=namedProvider||providers.filter(function(x){return !['Energia','TIM'].includes(x);}).find(function(x){return (' '+head+' ').includes(' '+norm(x)+' ');})||'';
var billAmount=amount(/(?:totale\s+bolletta|totale\s+fattura)\s*[:€\s]*([\d.,]+)/i);
var payable=amount(/(?:totale\s+da\s+pagare|importo\s+da\s+pagare)\s*[:€\s]*([\d.,]+)/i);
if(payable===null)payable=amount(/^[ \t]*(?:quanto pago(?: per questa bolletta)?|saldo da pagare|importo da versare|totale da versare)[ \t?:€]*[ \t\n]*([\d.,]+)[ \t]*€/im);
var kwh=amount(/(?:consumo\s+del\s+periodo|consumo\s+fatturato|consumo\s+rilevato|consumi\s+rilevati\s+nel\s+periodo)[\s\S]{0,90}?([\d.,]+)\s*kWh/i);
// Formato Enel: "377 kWh" precede "Consumi Rilevati nel periodo...".
if(kwh===null){kwh=amount(/(?:consumo\s+del\s+periodo)[\s\S]{0,120}?([\d.,]+)\s*kWh/i)}
if(kwh===null){kwh=amount(/(?:quota\s+consumi)[\s\S]{0,120}?([\d.,]+)\s*kWh/i)}
if(kwh===null){kwh=amount(/([\d.,]+)\s*kWh[ \t\n]{0,35}(?=consumi?\s+rilevat[io]\s+nel\s+periodo)/i)}
var smc=amount(/(?:consumo\s+del\s+periodo|consumo\s+fatturato|consumo\s+rilevato)[\s\S]{0,100}?([\d.,]+)\s*(?:Smc|S\.m\.c\.)/i);
var period=field(/\bperiodo\s+((?:GEN|FEB|MAR|APR|MAG|GIU|LUG|AGO|SET|OTT|NOV|DIC)[A-Z. ]*\s*20\d{2}\s*[-–]\s*(?:GEN|FEB|MAR|APR|MAG|GIU|LUG|AGO|SET|OTT|NOV|DIC)[A-Z. ]*\s*20\d{2})/i);
var datePattern = '(\\d{1,2}[./]\\d{1,2}[./]20\\d{2})';
var billingRange = new RegExp(
  '^[ \\t]*(?:periodo(?: di fatturazione)?|consum[oi] (?:rilevat[oi]|fatturat[oi]))[ \\t:(]*(?:dal[ \\t]+)?'+datePattern+
  '[ \\t]*(?:al|[-–])[ \\t]*'+datePattern, 'im');
var bounds = text.match(billingRange);
var from = bounds ? bounds[1] : '';
var to = bounds ? bounds[2] : '';
var annualTable = text.match(/^[ \t]*consumo annuo[^\n]*\n[ \t]*F1\s+F2\s+F3\s+Tot\.?\s*consumo[ \t]*\n[ \t]*(?:[\d.,]+\s*kWh\s+){3}([\d.,]+)\s*kWh\b/im);
var annual = annualTable ? num(annualTable[1]) : amount(/(?:consumo\s+annuo|consumo\s+annuale)[ \t:]*([\d.,]+)\s*kWh\b/i);
var invoiceDate=field(new RegExp('\\b(?:data\\s+(?:di\\s+)?(?:emissione|fattura|documento)|emess[ao]\\s+il)[ \t:]*'+datePattern,'i'));
var fields={invoiceDate:invoiceDate,pod:pod,pdr:pdr,kwh:type==='Luce'?kwh:null,smc:type==='Gas'?smc:null,kw:amount(/potenza\s+impegnata\s*[:\s]*([\d.,]+)\s*kW/i),priceKwh:null,priceSmc:null,invoiceNumber:field(/(?:fattura\s+elettronica\s+n\.?|numero\s+fattura|fattura\s+n\.?)\s*[:#\s]*([A-Z0-9/\-]+)/i),period:period,periodStart:from,periodEnd:to,annualKwh:annual,payable:payable};
var decimal = '([+−-]?\\d[\\d.,]*)';
// A heading at the start of a row excludes references in the front page.
var receiptStart=text.search(/^[ \t]*scontrino[ \t]+dell[’']energia\b/im);
var receipt=receiptStart<0?'':text.slice(receiptStart).split(/^[ \t]*box[ \t]+dell[’']offerta\b/im)[0];

function labeledCost(label) {
  return uniqueBillNumber(text, new RegExp('(?:^|\\n)[ \\t]*(?:'+label+')[ \\t:€\\n]*'+decimal+'[ \\t]*(?:€|EUR)?[ \\t]*(?=\\n|$)', 'gi'), num);
}
function unitRate(unit) {
  return uniqueBillNumber(text, new RegExp(
    '(?:prezzo\\s+(?:medio|unitario)|prezzo\\s+(?:della|dell[’\\\'])?\\s*materia\\s+(?:energia|gas))[^\\d\\n]{0,50}'+
    decimal+'[ \\t]*(?:€|EUR)[ \\t]*/[ \\t]*'+unit+'\\b','gi'), function(value) {
      // A dot can be the decimal separator of a per-unit rate.
      return value.includes(',') ? num(value) : Number(value);
    });
}
function tableRate(unit, row) {
  return uniqueBillNumber(receipt||text,new RegExp('^[ \\t]*'+row+'[ \\t]+[^\\n]*?'+decimal+
    '[ \\t]*(?:€|EUR)[ \\t]*/[ \\t]*'+unit+'\\b','gim'),function(value){
      return value.includes(',') ? num(value) : Number(value);
    });
}
function rowTotal(label, source) {
  return uniqueBillNumber(source||text,new RegExp('^[ \\t]*(?:'+label+')[ \\t:]+[^\\n]*?'+decimal+
    '[ \\t]*(?:€|EUR)[ \\t]*$','gim'),num);
}
var unit = type==='Luce' ? 'kWh' : type==='Gas' ? 'Smc' : '';
var reportedRate = unit ? (tableRate(unit,'quota consumi') ?? unitRate(unit)) : null;
fields.priceKwh = type==='Luce' ? reportedRate : null;
fields.priceSmc = type==='Gas' ? reportedRate : null;
fields.supplyRate = unit ? tableRate(unit,'di cui spesa per la vendita di (?:energia elettrica|gas naturale|gas)') : null;
fields.consumptionCost = unit ? rowTotal('quota consumi[ \\t]+[\\d.,]+[ \\t]*'+unit) : null;
if (fields.consumptionCost===null) fields.consumptionCost = labeledCost('quota consumi');
fields.tvFee = amount(/canone\s+di\s+abbonamento\s+alla\s+televisione\s+per\s+uso\s+privato\s+([\d.,]+)\s*€/i);
fields.dueDate = field(/(?:quando\s+scade|data\s+di\s+scadenza|scadenza(?:\s+(?:del\s+)?pagamento)?|(?:da\s+)?pagare\s+entro|entro\s+il)\s*[:?–-]?\s*(\d{1,2}[./-]\d{1,2}[./-]20\d{2})\b/i);
fields.paymentMethod = field(/(?:modalit[àa]\s+di\s+pagamento|metodo\s+di\s+pagamento)[ \t:]*\n?[ \t]*(addebito[^\n]{0,60}|domiciliazione[^\n]{0,55}|pagoPA|bollettino[^\n]{0,40}|bonifico[^\n]{0,40})/i);
if (!fields.paymentMethod && /(?:sar[àa]|verr[àa])\s+addebitat[ao]\s+(?:sul|su|in)\s+(?:conto\s+corrente|c\/c)/i.test(text)) fields.paymentMethod='Addebito su conto corrente';
fields.debitDate = field(/(?:data\s+(?:di\s+)?addebito|addebito\s+(?:previsto\s+)?(?:il|del)|(?:addebitat[ao]|addebiteremo)[^\n]{0,45}\bil)\s*[:–-]?\s*(\d{1,2}[./-]\d{1,2}[./-]20\d{2})\b/i);
if (!period) fields.period=field(/\b(?:periodo(?:\s+di\s+fatturazione)?|consumi?\s+rilevat[io]\s+nel\s+periodo)[ \t:]+((?:gen(?:naio)?|feb(?:braio)?|mar(?:zo)?|apr(?:ile)?|mag(?:gio)?|giu(?:gno)?|lug(?:lio)?|ago(?:sto)?|set(?:tembre)?|ott(?:obre)?|nov(?:embre)?|dic(?:embre)?)(?:[ \t]+20\d{2})?[ \t]*[-–—/][ \t]*(?:gen(?:naio)?|feb(?:braio)?|mar(?:zo)?|apr(?:ile)?|mag(?:gio)?|giu(?:gno)?|lug(?:lio)?|ago(?:sto)?|set(?:tembre)?|ott(?:obre)?|nov(?:embre)?|dic(?:embre)?)[ \t]+20\d{2})\b/i);
fields.annualSmc = type==='Gas' ? amount(/(?:consumo\s+annuo|consumo\s+annuale)[ \t:]*([\d.,]+)\s*Smc\b/i) : null;
if (type==='Luce' && fields.annualKwh===null) {
  fields.annualKwh = amount(/(?:consumo\s+annuo|consumo\s+annuale)[ \t:]*([\d.,]+)\s*kWh\b/i);
}
fields.energyCost = labeledCost('spesa per la materia (?:energia|gas)(?: elettrica| naturale)?');
fields.fixedCost = rowTotal('(?:totale )?quota fissa(?! e quota potenza)');
fields.powerCost = rowTotal('(?:totale )?quota potenza');
fields.networkCost = labeledCost('spesa per (?:il )?trasporto e (?:la )?gestione del contatore');
fields.systemCharges = labeledCost('(?:spesa per gli |totale )?oneri di sistema');
fields.taxes = labeledCost('totale imposte(?: e iva)?|accise e iva');
fields.vat = rowTotal('totale iva|IVA[ \\t]+[\\d.,]+%[ \\t]+su imponibile');
fields.excise = labeledCost('totale accise');
fields.adjustments = labeledCost('totale ricalcoli');
if(receipt){
  var invoiceTotal=rowTotal('totale (?:bolletta|fattura)',receipt);
  var amountDue=rowTotal('totale da pagare',receipt);
  if(invoiceTotal!==null)billAmount=invoiceTotal;
  if(amountDue!==null)fields.payable=amountDue;
  fields.fixedCost=rowTotal('(?:totale )?quota fissa(?! e quota potenza)',receipt)??fields.fixedCost;
  fields.powerCost=type==='Luce'?(rowTotal('(?:totale )?quota potenza',receipt)??fields.powerCost):null;
  fields.consumptionCost=(unit?rowTotal('quota consumi[ \\t]+[\\d.,]+[ \\t]*'+unit,receipt):null)??fields.consumptionCost;
  fields.taxes=rowTotal('accise e iva|imposte e iva|totale imposte(?: e iva)?',receipt)??fields.taxes;
  if(unit){
    var billed=uniqueBillNumber(receipt,new RegExp('^[ \\t]*quota consumi[ \\t]+'+decimal+'[ \\t]*'+unit+'\\b','gim'),num);
    if(billed!==null)fields[type==='Luce'?'kwh':'smc']=billed;
  }
  var tvRows=new Map();
  for(var item of receipt.matchAll(/^[ \t]*canone di abbonamento alla televisione per uso privato(?:[ \t]*\(([^)\n]+)\))?[ \t]+([\d.,]+)[ \t]*€[ \t]*$/gim)){
    var periodKey=norm(item[1]||''), charge=num(item[2]);
    if(!tvRows.has(periodKey))tvRows.set(periodKey,new Set());
    tvRows.get(periodKey).add(charge);
  }
  if(tvRows.size&&Array.from(tvRows.values()).every(function(charges){return charges.size===1;})){
    fields.tvFee=Math.round(Array.from(tvRows.values()).reduce(function(total,charges){return total+charges.values().next().value;},0)*100)/100;
  }
}


// Tabelle storiche: per sicurezza, acquisire solo righe con intestazioni esplicite e 4 serie coerenti.
var historical={};
var t=text.match(/Consumi\s+in\s+kWh\s+degli\s+ultimi\s+18\s+mesi([\s\S]{0,3500}?)(?:Potenza\s+mensile|Letture\s+e\s+Consumi|$)/i);
if(t){var block=t[1], months=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
 var dates=[...block.matchAll(/\b(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)\s*(20\d{2})\b/gi)].map(function(m){return m[2]+'-'+String(months.indexOf(m[1].toLowerCase())+1).padStart(2,'0')});
 var rows={};['F1','F2','F3','Tot'].forEach(function(label){var r=block.match(new RegExp('(?:^|\\n)\\s*'+label+'\\s+([\\d\\s]+)(?=\\n|$)','im'));if(r)rows[label]=r[1].trim().split(/\s+/).map(Number)});
 if(dates.length>=2&&['F1','F2','F3','Tot'].every(function(x){return rows[x]&&rows[x].length===dates.length}))dates.forEach(function(date,i){if(rows.F1[i]+rows.F2[i]+rows.F3[i]===rows.Tot[i])historical[date]={f1:rows.F1[i],f2:rows.F2[i],f3:rows.F3[i],total:rows.Tot[i]}});
}
fields.monthlyKwh=historical;
return {file:file,type:type,provider:provider,amount:billAmount,fields:fields,date:new Date().toLocaleDateString('sv-SE')}
}

root.WalletProDocuments={parsePayslip,extractBill:extract,billPageText,positioned:lannaPositionedPage,labels:billFieldLabels};
})(typeof window==='undefined'?globalThis:window);
