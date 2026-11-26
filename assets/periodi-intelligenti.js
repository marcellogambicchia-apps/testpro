
(function () {
  'use strict';
  const months = 'gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre'.split(' ');
  const words = 'zero uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici quattordici quindici sedici diciassette diciotto diciannove venti'.split(' ');
  const dimensions = {anni: 'year', mesi: 'month', giorni: 'day'};
  const digit = '(?:19|20)\\d{2}';
  const month = '(?:' + months.join('|') + ')';
  const range = (item) => new RegExp('\\b(?:d[ae]l{0,2}|tra|fra)\\s+(' + item + ')\\s+(?:al{0,2}|e)\\s+(' + item + ')\\b', 'g');
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const iso = date => [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()].map((v, i) => String(v).padStart(i ? 2 : 4, '0')).join('-');
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(+date) && iso(date) === value;
  }
  function documentDate(value) {
    const raw = String(value || '').trim();
    if (validDate(raw)) return raw;
    const parts = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-]((?:19|20)\d{2})$/);
    if (!parts) return '';
    const date = parts[3] + '-' + parts[2].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
    return validDate(date) ? date : '';
  }
  function periodRule(raw, now = new Date(), allowSingle = false) {
    raw = String(raw || '');
    const text = normalize(raw.replace(/(\d{1,2})[/.](\d{1,2})[/.]((?:19|20)\d{2})\b/g,
      (_, d, m, y) => months[Number(m) - 1] ? d + ' ' + months[Number(m) - 1] + ' ' + y : _));
    const filters = [];
    let group = '';
    let hasDay = false;
    let invalid = false;
    const setGroup = unit => {
      const order = ['year', 'month', 'day'];
      if (order.indexOf(unit) > order.indexOf(group)) group = unit;
      if (unit === 'day') hasDay = true;
    };
    const add = (unit, predicate) => {
      setGroup(unit);
      filters.push(date => predicate(date[unit]));
    };
    const current = [now.getFullYear(), now.getMonth(), now.getDate()];
    let remaining = text.replace(/\bultim[ie]\s+(\d+|[a-z]+)\s+(anni|mesi|giorni)(?:\s+(complet[ie]|inter[ie]))?\b/g,
      (_, count, plural, complete) => {
        const n = /^\d+$/.test(count) ? Number(count) : /^(?:un|una)$/.test(count) ? 1 : words.indexOf(count);
        const unit = dimensions[plural];
        setGroup(unit);
        if (n < 1 || n > 100000 || !Number.isInteger(n)) { invalid = true; return ' '; }
        let start, end;
        const [y, m, d] = current;
        if (unit === 'year') {
          start = new Date(Date.UTC(y - n + 1 - Number(Boolean(complete)), 0, 1));
          end = complete ? new Date(Date.UTC(y, 0, 0)) : new Date(Date.UTC(y, m, d));
        } else if (unit === 'month') {
          start = new Date(Date.UTC(y, m - n + 1 - Number(Boolean(complete)), 1));
          end = complete ? new Date(Date.UTC(y, m, 0)) : new Date(Date.UTC(y, m, d));
        } else {
          start = new Date(Date.UTC(y, m, d - n + 1 - Number(Boolean(complete))));
          end = new Date(Date.UTC(y, m, d - Number(Boolean(complete))));
        }
        const from = iso(start.getUTCFullYear() < 1 ? new Date('0001-01-01T00:00:00Z') : start), to = iso(end);
        filters.push(date => {
          const key = unit === 'year' ? date.iso.slice(0, 4) : unit === 'month' ? date.iso.slice(0, 7) : date.iso;
          return key >= from.slice(0, key.length) && key <= to.slice(0, key.length);
        });
        return ' ';
      });
    remaining = remaining.replace(/\b(?:(?:questo?\s+)?ultimo\s+(giorno|mese|bimestre|trimestre|quadrimestre|semestre|anno)(?:\s+completo)?|(mese)\s+(?:scorso|precedente|passato)|scorso\s+(mese))\b/g,
      (_, named, trailing, leading) => {
        const period = named || trailing || leading;
        const [year, month, day] = current;
        if (period === 'giorno') {
          const yesterday = iso(new Date(Date.UTC(year, month, day - 1)));
          setGroup('day');
          filters.push(value => value.iso === yesterday);
        } else {
          const length = {mese: 1, bimestre: 2, trimestre: 3, quadrimestre: 4, semestre: 6, anno: 12}[period];
          const boundary = Math.floor(month / length) * length;
          const from = iso(new Date(Date.UTC(year, boundary - length, 1)));
          const to = iso(new Date(Date.UTC(year, boundary, 0)));
          setGroup(period === 'anno' ? 'year' : 'month');
          filters.push(value => value.iso.slice(0, 7) >= from.slice(0, 7) &&
            value.iso.slice(0, 7) <= to.slice(0, 7));
        }
        return ' ';
      });
    remaining = remaining.replace(/\b(?:questo mese|mese corrente|mese in corso|mese attuale)\b/g, () => {
      const today = iso(new Date(Date.UTC(...current)));
      setGroup('month');
      filters.push(value => value.iso.slice(0, 7) === today.slice(0, 7) && value.iso <= today);
      return ' ';
    });
    remaining = remaining.replace(/\b(?:tutt[ieo](?:\s+(?:i|gli|le))?\s+|inter[ie]\s+)(anni|mesi|giorni)\b/g, (_, plural) => {
      setGroup(dimensions[plural]); return ' ';
    }).replace(/\b(?:solo\s+)?(?:(?:i|gli)\s+)?(anni|mesi|giorni)\s+(pari|dispari)\b/g, (_, plural, parity) => {
      add(dimensions[plural], value => value % 2 === Number(parity === 'dispari')); return ' ';
    });
    remaining = remaining.replace(/\b(?:tranne|eccetto|esclus[ioae]|a eccezione di)\s+((?:(?:gli?\s+|l\s+|i\s+|il\s+|lo\s+|del\s+|di\s+|mese\s+|giorn[oi]\s+|ann[oi]\s+|e\s+)*[a-z0-9]+)(?:\s+e\s+(?:(?:il|i|l)\s+)?[a-z0-9]+)*)/g,
      (_, excluded) => {
        const tokens = excluded.split(' ').filter(token => /^\d+$/.test(token) || months.includes(token));
        const excludedByUnit = {};
        tokens.forEach(token => {
          const unit = months.includes(token) ? 'month' : token.length === 4 ? 'year' : /\bmes[ei]\b/.test(excluded) || (!/\bgiorn[oi]\b/.test(excluded) && group === 'month') ? 'month' : 'day';
          (excludedByUnit[unit] ||= []).push(unit === 'month' && months.includes(token) ? months.indexOf(token) + 1 : Number(token));
        });
        Object.entries(excludedByUnit).forEach(([unit, values]) => add(unit, value => !values.includes(value)));
        if (!tokens.length) invalid = true;
        return ' ';
      });
    const day = '(?:[1-9]|[12]\\d|3[01]|0[1-9])';
    const fullRange = new RegExp('\\b(?:dal?|dalla) (' + day + ') (' + month + ') (' + digit + ') (?:al?|alla) (' + day + ') (' + month + ') (' + digit + ')\\b');
    remaining = remaining.replace(fullRange, (_, d1, m1, y1, d2, m2, y2) => {
      const key = (d, m, y) => y + '-' + String(months.indexOf(m) + 1).padStart(2, '0') + '-' + d.padStart(2, '0');
      const a = key(d1, m1, y1), b = key(d2, m2, y2);
      setGroup('day');
      if (!validDate(a) || !validDate(b) || a > b) invalid = true;
      filters.push(date => date.iso >= a && date.iso <= b);
      return ' ';
    });
    const monthRange = new RegExp('\\b(?:da|dal) (' + month + ') (' + digit + ') (?:a|al) (' + month + ') (' + digit + ')\\b');
    remaining = remaining.replace(monthRange, (_, m1, y1, m2, y2) => {
      const a = Number(y1) * 12 + months.indexOf(m1), b = Number(y2) * 12 + months.indexOf(m2);
      setGroup('month');
      if (a > b) invalid = true;
      filters.push(date => date.year * 12 + date.month - 1 >= a && date.year * 12 + date.month - 1 <= b);
      return ' ';
    });
    const monthNumberRange = new RegExp('\\b(?:da|dal) (?:mes[ei] )?(0?[1-9]|1[0-2]) (?:a|al) (?:mes[ei] )?(0?[1-9]|1[0-2]) mes[ei]\\b|\\b(?:da|dal) mese (0?[1-9]|1[0-2]) (?:a|al) (?:mese )?(0?[1-9]|1[0-2])\\b', 'g');
    remaining = remaining.replace(monthNumberRange, (_, a, b, c, d) => {
      const start = Number(a || c), end = Number(b || d);
      add('month', value => value >= start && value <= end);
      if (start > end) invalid = true;
      return ' ';
    });
    for (const [unit, pattern, convert] of [
      ['year', digit, Number], ['month', month, value => months.indexOf(value) + 1], ['day', day, Number]
    ]) {
      remaining = remaining.replace(range(pattern), (_, a, b) => {
        const start = convert(a), end = convert(b);
        add(unit, value => value >= start && value <= end);
        if (start > end) invalid = true;
        return ' ';
      });
    }
    const [yearNow, monthNow, dayNow] = current;
    const calendar = (y, m, d) => new Date(Date.UTC(y, m, d));
    const todayDate = calendar(...current);
    const shifted = days => calendar(yearNow, monthNow, dayNow + days);
    const weekday = date => (date.getUTCDay() + 6) % 7;
    function bound(unit, start, end) {
      setGroup(unit);
      const size = unit === 'day' ? 10 : unit === 'month' ? 7 : 4;
      const lower = start && iso(start).slice(0, size), upper = end && iso(end).slice(0, size);
      filters.push(value => {
        const key = value.iso.slice(0, size);
        return (!lower || key >= lower) && (!upper || key <= upper);
      });
    }
    const aliases = {
      avantieri: -2, 'l altro ieri': -2, 'altro ieri': -2, ieri: -1,
      oggi: 0, adesso: 0, ora: 0, 'in questo momento': 0, domani: 1, dopodomani: 2
    };
    const weekdays = ['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'];
    const weekdayPattern = '(?:' + weekdays.join('|') + ')';
    remaining = remaining.replace(new RegExp('\\b(?:da|dal) (' + weekdayPattern + ') (?:a|al) (' + weekdayPattern + ')\\b','g'), (_, first, last) => {
      const monday = -weekday(todayDate);
      const a = weekdays.indexOf(first), b = weekdays.indexOf(last);
      bound('day', shifted(monday + a), shifted(monday + b + (b < a ? 7 : 0)));
      return ' ';
    });
    remaining = remaining.replace(new RegExp('\\b(?:tutti i|tutte le|ogni) (' + weekdayPattern + ')\\b','g'), (_, name) => {
      setGroup('day');
      filters.push(value => weekday(new Date(value.iso + 'T00:00:00Z')) === weekdays.indexOf(name));
      return ' ';
    });
    remaining = remaining.replace(new RegExp('\\b(?:quest[oa] )?(' + weekdayPattern + ')(?: (prossim[oa]|scors[oa]))?\\b','g'), (_, name, modifier) => {
      const offset = weekdays.indexOf(name) - weekday(todayDate);
      const delta = modifier?.startsWith('prossim') ? (offset <= 0 ? offset + 7 : offset) :
        modifier?.startsWith('scors') ? (offset >= 0 ? offset - 7 : offset) : offset;
      bound('day', shifted(delta), shifted(delta));
      return ' ';
    });
    remaining = remaining.replace(/\b(?:nei |nel |durante il )?(?:weekend|fine settimana|giorni feriali)\b/g, phrase => {
      if (phrase.endsWith('feriali')) {
        setGroup('day');
        filters.push(value => weekday(new Date(value.iso + 'T00:00:00Z')) < 5);
      } else {
        const monday = -weekday(todayDate);
        bound('day', shifted(monday + 5), shifted(monday + 6));
      }
      return ' ';
    });
    remaining = remaining.replace(/\b(?:questa settimana|(?:la )?prossima settimana|(?:la )?settimana (?:prossima|scorsa|passata|precedente)|sett prox)\b/g, phrase => {
      const offset = /prossim|prox/.test(phrase) ? 7 : /scorsa|passata|precedente/.test(phrase) ? -7 : 0;
      const first = shifted(offset - weekday(todayDate));
      const last = offset ? shifted(offset - weekday(todayDate) + 6) : todayDate;
      bound('day', first, last);
      return ' ';
    });
    remaining = remaining.replace(/\b(?:il )?mese (?:prossimo|prox)\b|\bprossimo mese\b/g, () => {
      const date = calendar(yearNow, monthNow + 1, 1);
      bound('month', date, date);
      return ' ';
    });
    remaining = remaining.replace(/\b(?:quest anno|questo anno|anno corrente|anno in corso|(?:l )?anno (?:scorso|passato|precedente|prossimo)|prossimo anno)\b/g, phrase => {
      const offset = /prossim/.test(phrase) ? 1 : /scorso|passato|precedente/.test(phrase) ? -1 : 0;
      bound('year', calendar(yearNow + offset, 0, 1), calendar(yearNow + offset, 11, 31));
      return ' ';
    });
    remaining = remaining.replace(/\b(?:(tra|fra) )?(\d+|uno|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici) (giorn[oi]|mes[ei]|ann[oi]|settiman[ae])(?: (fa))?\b/g,
      (whole, future, count, unit, past) => {
        if (!future && !past) return whole;
        const n = /\d/.test(count) ? Number(count) : /^(un|una)$/.test(count) ? 1 : words.indexOf(count);
        if (n < 1 || n > 10000) { invalid = true; return ' '; }
        const offset = future ? n : -n;
        if (unit.startsWith('ann')) {
          const date = calendar(yearNow + offset, 0, 1);
          bound('year', date, date);
        } else if (unit.startsWith('mes')) {
          const date = calendar(yearNow, monthNow + offset, 1);
          bound('month', date, date);
        } else if (unit.startsWith('settiman')) {
          const first = offset * 7 - weekday(todayDate);
          bound('day', shifted(first), shifted(first + 6));
        } else {
          const date = shifted(offset);
          bound('day', date, date);
        }
        return ' ';
      });
    const relativeDay = '(?:' + Object.keys(aliases).join('|') + ')';
    remaining = remaining.replace(new RegExp('\\b(?:da|dal) (' + relativeDay + ') (?:a|al|fino a) (' + relativeDay + ')\\b','g'), (_, first, last) => {
      if (aliases[first] > aliases[last]) invalid = true;
      bound('day', shifted(aliases[first]), shifted(aliases[last]));
      return ' ';
    });
    remaining = remaining.replace(/\b(ogni giorno|quotidianamente|ogni mese|mensilmente|ogni anno|annualmente)\b/g, phrase => {
      setGroup(/anno|annual/.test(phrase) ? 'year' : /mese|mensil/.test(phrase) ? 'month' : 'day');
      return ' ';
    });
    remaining = remaining.replace(/\b(?:(fino a|entro|da) )?(dopodomani|domani|oggi|l altro ieri|altro ieri|avantieri|ieri|adesso|ora|in questo momento)\b/g,
      (_, edge, phrase) => {
        const date = shifted(aliases[phrase]);
        bound('day', edge && edge !== 'da' ? null : date, edge === 'da' ? todayDate : date);
        return ' ';
      });
    remaining = remaining.replace(/\b(?:negli |degli |anni )(?:anni )?(\d0)\b/g, (_, decade) => {
      const start = (Number(decade) > yearNow % 100 ? 1900 : 2000) + Number(decade);
      bound('year', calendar(start, 0, 1), calendar(start + 9, 11, 31));
      return ' ';
    });
    remaining = remaining.replace(/\b(?:a|il|per) (natale|ferragosto)\b/g, (_, holiday) => {
      const date = holiday === 'natale' ? calendar(yearNow, 11, 25) : calendar(yearNow, 7, 15);
      bound('day', date, date);
      return ' ';
    });
    remaining = remaining.replace(/\b(?:(?:in|d|di|quest[oa]|l) )?(primavera|estate|autunno|inverno)(?: (scors[oa]|prossim[oa]|(?:19|20)\d{2}))?\b/g, (_, season, qualifier) => {
      const startMonth = {primavera:2,estate:5,autunno:8,inverno:11}[season];
      let year = Number(qualifier) || yearNow;
      if (!Number(qualifier) && season === 'inverno' && monthNow < 2) year--;
      const firstThisYear = calendar(yearNow, startMonth, 1);
      const lastThisYear = calendar(yearNow, startMonth + 3, 0);
      if (qualifier?.startsWith('scors')) year = yearNow - Number(todayDate <= lastThisYear);
      if (qualifier?.startsWith('prossim')) year = yearNow + Number(todayDate >= firstThisYear);
      const first = calendar(year, startMonth, 1);
      bound('month', first, calendar(first.getUTCFullYear(), startMonth + 3, 0));
      return ' ';
    });
    const years = [...remaining.matchAll(new RegExp('\\b' + digit + '\\b', 'g'))].map(match => Number(match[0]));
    const selectedMonths = [...remaining.matchAll(new RegExp('\\b' + month + '\\b', 'g'))].map(match => months.indexOf(match[0]) + 1);
    const preciseDate = /\b(?:il|nel|a|di|del|entro|fino a)\b/.test(remaining) || /\b\d{1,2}[/.]\d{1,2}[/.]\d{4}\b/.test(raw);
    if (!group && !invalid && !((allowSingle || (preciseDate && years.length <= 1)) && (years.length || selectedMonths.length))) return null;
    if (preciseDate && selectedMonths.length && !years.length && !group) add('year', value => value === yearNow);
    if (years.length) add('year', value => years.includes(value));
    if (selectedMonths.length) add('month', value => selectedMonths.includes(value));
    const selectedDays = [...remaining.matchAll(new RegExp('\\b(' + day + ') (?:di )?' + month + '\\b', 'g'))].map(match => Number(match[1]));
    if (selectedDays.length) {
      if (selectedDays.length===1&&selectedMonths.length===1&&years.length<=1) {
        const year=years[0]||yearNow, month=selectedMonths[0], day=selectedDays[0];
        if (calendar(year,month-1,day).getUTCMonth()!==month-1) invalid=true;
      }
      add('day', value => selectedDays.includes(value));
    }
    return {group, hasDay, invalid, subject: remaining, accepts: key => {
      if (!validDate(key.length === 7 ? key + '-01' : key) || (hasDay && key.length === 7)) return false;
      const [year, month, day] = key.split('-').map(Number);
      return filters.every(filter => filter({year, month, day, iso: key}));
    }};
  }
  window.WalletProPeriods = {parse: periodRule, documentDate};
})();