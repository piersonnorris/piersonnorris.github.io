/* ============================================================
   PNCalendar — private portfolio-calendar helpers.

   This module is deliberately storage- and provider-agnostic. The
   password-gated tracker supplies events only after unlock, while the
   encrypted stock vault owns user-created reminders.
   ============================================================ */
(function (global) {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(value) {
    var date = value instanceof Date ? value : new Date(String(value || '') + (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? 'T12:00:00' : ''));
    if (!isFinite(date.getTime())) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseDay(key) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
  }

  function addDays(key, amount) {
    var date = parseDay(key);
    if (!date) return '';
    date.setDate(date.getDate() + amount);
    return dateKey(date);
  }

  function anchorKey(value) {
    var date = parseDay(value) || (value instanceof Date ? value : new Date());
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-01';
  }

  function moveMonth(anchor, amount) {
    var date = parseDay(anchorKey(anchor));
    date.setMonth(date.getMonth() + amount);
    return anchorKey(date);
  }

  function monthTitle(anchor) {
    var date = parseDay(anchorKey(anchor));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function monthCells(anchor, today) {
    var first = parseDay(anchorKey(anchor));
    var start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay(), 12);
    var activeMonth = first.getMonth();
    var todayKey = dateKey(today || new Date());
    var out = [];
    for (var i = 0; i < 42; i++) {
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
      out.push({ key: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === activeMonth, isToday: dateKey(date) === todayKey });
    }
    return out;
  }

  function cleanEvent(event, index) {
    if (!event || !dateKey(event.date) || !String(event.title || '').trim()) return null;
    return {
      id: String(event.id || ('event-' + dateKey(event.date) + '-' + index)),
      date: dateKey(event.date),
      title: String(event.title || '').trim(),
      kind: String(event.kind || 'reminder'),
      symbol: String(event.symbol || '').trim().toUpperCase(),
      notes: String(event.notes || event.amount || '').trim(),
      readonly: !!event.readonly,
      source: String(event.source || 'private')
    };
  }

  function normalize(events) {
    return (events || []).map(cleanEvent).filter(Boolean).sort(function (a, b) {
      return a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
    });
  }

  function upcoming(events, from, days) {
    var start = dateKey(from || new Date());
    var end = addDays(start, Number(days) || 30);
    return normalize(events).filter(function (event) { return event.date >= start && event.date <= end; });
  }

  function escapeIcs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
  }

  function stampNow() {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function toIcs(events, name) {
    var rows = normalize(events);
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PN Website//Portfolio Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + escapeIcs(name || 'Private portfolio calendar')];
    rows.forEach(function (event) {
      var next = addDays(event.date, 1);
      lines.push('BEGIN:VEVENT',
        'UID:' + escapeIcs(event.id.replace(/[^a-z0-9-]/gi, '-')) + '@pn-portfolio',
        'DTSTAMP:' + stampNow(),
        'DTSTART;VALUE=DATE:' + event.date.replace(/-/g, ''),
        'DTEND;VALUE=DATE:' + next.replace(/-/g, ''),
        'SUMMARY:' + escapeIcs(event.title),
        'DESCRIPTION:' + escapeIcs(event.notes),
        'CATEGORIES:' + escapeIcs(event.kind),
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function googleUrl(event) {
    var clean = cleanEvent(event, 0);
    if (!clean) return 'https://calendar.google.com/calendar/u/0/r';
    var params = new URLSearchParams({
      action: 'TEMPLATE',
      text: clean.title,
      dates: clean.date.replace(/-/g, '') + '/' + addDays(clean.date, 1).replace(/-/g, ''),
      details: clean.notes
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  global.PNCalendar = {
    dateKey: dateKey,
    addDays: addDays,
    anchorKey: anchorKey,
    moveMonth: moveMonth,
    monthTitle: monthTitle,
    monthCells: monthCells,
    normalize: normalize,
    upcoming: upcoming,
    toIcs: toIcs,
    googleUrl: googleUrl
  };
})(window);
