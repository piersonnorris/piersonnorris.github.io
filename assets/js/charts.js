/* ============================================================
   PNCharts — tiny dependency-free SVG charts
   No library, no CDN, no build step. Renders inline SVG that
   inherits the site's dark palette and scales with its container.

   Every chart is role="img" with a <title>/<desc> so it is
   announced meaningfully, and each renderer also emits a
   visually-hidden data table for screen readers.

   PNCharts.donut(el, rows, opts)
   PNCharts.bars(el, rows, opts)      horizontal bars
   PNCharts.line(el, series, opts)    single line/area over time
   PNCharts.stack(el, rows, opts)     one 100% stacked bar
   PNCharts.market(el, series, opts)  interactive price + volume
   PNCharts.spark(el, values, opts)   inline sparkline

   `rows` is always [{label, value, color?}, …]
   ============================================================ */
(function (global) {
  'use strict';

  var PALETTE = {
    sofi: '#00A2C7',
    webull: '#3d6ea8',
    robinhood: '#00C805',
    gemini: '#F5A623',
    gomining: '#7C3AED'
  };

  /* generic fallback ramp for non-platform series (tickers, asset classes) */
  var RAMP = [
    '#5FAE5A', '#4CC9F0', '#E8A33D', '#7C3AED', '#00A2C7',
    '#e5534b', '#8ED18A', '#c084fc', '#f472b6', '#38bdf8',
    '#facc15', '#34d399'
  ];

  var INK = '#e9edf3', MUT = '#8b95a5', DIM = '#5c6675',
      LINE = '#232d39', LINE2 = '#2e3947', ACC = '#5FAE5A';

  // ---------- helpers ----------

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function colorFor(row, i) {
    if (row && row.color) return row.color;
    var key = String(row && row.label || '').toLowerCase().replace(/[^a-z]/g, '');
    if (PALETTE[key]) return PALETTE[key];
    return RAMP[i % RAMP.length];
  }

  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    var abs = Math.abs(n);
    if (abs >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
    if (abs >= 10000) return '$' + Math.round(n).toLocaleString('en-US');
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    return (n * 100).toFixed(n * 100 < 10 ? 1 : 0) + '%';
  }

  function fmt(v, kind) {
    if (kind === 'money') return money(v);
    if (kind === 'pct') return pct(v);
    if (v == null || !isFinite(v)) return '—';
    return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }

  function empty(el, message) {
    el.innerHTML =
      '<p class="chart-empty">' + esc(message || 'No data yet.') + '</p>';
  }

  /* screen-reader table so the numbers are never image-only */
  function srTable(rows, valueKind) {
    var body = rows.map(function (r) {
      return '<tr><th scope="row">' + esc(r.label) + '</th><td>' +
        esc(fmt(r.value, valueKind)) + '</td></tr>';
    }).join('');
    return '<table class="visually-hidden"><tbody>' + body + '</tbody></table>';
  }

  function wrapSvg(inner, w, h, title, desc, extraClass) {
    return '<svg class="pnchart ' + (extraClass || '') + '" viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-labelledby="' + title.id + ' ' + desc.id + '" preserveAspectRatio="xMidYMid meet">' +
      '<title id="' + title.id + '">' + esc(title.text) + '</title>' +
      '<desc id="' + desc.id + '">' + esc(desc.text) + '</desc>' +
      inner + '</svg>';
  }

  var uid = 0;
  function ids() {
    uid++;
    return { title: { id: 'pnct' + uid }, desc: { id: 'pncd' + uid } };
  }

  function clean(rows) {
    return (rows || []).filter(function (r) {
      return r && isFinite(r.value) && r.value > 0;
    });
  }

  // ---------- donut ----------

  function donut(el, rows, opts) {
    opts = opts || {};
    rows = clean(rows).slice().sort(function (a, b) { return b.value - a.value; });
    if (!rows.length) return empty(el, opts.emptyMessage);

    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    var size = 220, cx = size / 2, cy = size / 2, r = 84, thick = 26;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var seg = '';

    rows.forEach(function (row, i) {
      var frac = row.value / total;
      var len = frac * circ;
      seg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none"' +
        ' stroke="' + colorFor(row, i) + '" stroke-width="' + thick + '"' +
        ' stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '"' +
        ' stroke-dashoffset="' + (-offset).toFixed(2) + '"' +
        ' transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>' + esc(row.label + ' — ' + fmt(row.value, opts.valueKind) + ' (' + pct(frac) + ')') + '</title>' +
        '</circle>';
      offset += len;
    });

    var centerTop = opts.centerLabel || fmt(total, opts.valueKind);
    var centerSub = opts.centerSub || 'total';

    var inner = seg +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" fill="' + INK + '"' +
      ' font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="21">' + esc(centerTop) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" fill="' + DIM + '"' +
      ' font-family="IBM Plex Mono,monospace" font-size="9.5" letter-spacing="1.4">' +
      esc(String(centerSub).toUpperCase()) + '</text>';

    var id = ids();
    id.title.text = opts.title || 'Breakdown';
    id.desc.text = rows.map(function (rw) {
      return rw.label + ' ' + pct(rw.value / total);
    }).join(', ');

    var legend = '<ul class="chart-legend">' + rows.map(function (row, i) {
      return '<li><span class="dot" style="background:' + colorFor(row, i) + '"></span>' +
        '<span class="lg-label">' + esc(row.label) + '</span>' +
        '<span class="lg-val">' + esc(fmt(row.value, opts.valueKind)) + '</span>' +
        '<span class="lg-pct">' + esc(pct(row.value / total)) + '</span></li>';
    }).join('') + '</ul>';

    el.innerHTML = '<div class="chart-donutwrap">' +
      wrapSvg(inner, size, size, id.title, id.desc, 'pnchart-donut') +
      legend + '</div>' + srTable(rows, opts.valueKind);
  }

  // ---------- horizontal bars ----------

  function bars(el, rows, opts) {
    opts = opts || {};
    rows = clean(rows).slice();
    if (!opts.keepOrder) rows.sort(function (a, b) { return b.value - a.value; });
    if (opts.limit) rows = rows.slice(0, opts.limit);
    if (!rows.length) return empty(el, opts.emptyMessage);

    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0);
    var rowH = 30, gap = 8, padL = 96, padR = 76, w = 560;
    var h = rows.length * (rowH + gap) + 8;
    var trackW = w - padL - padR;

    var inner = rows.map(function (row, i) {
      var y = i * (rowH + gap) + 4;
      var bw = max > 0 ? Math.max(2, (row.value / max) * trackW) : 2;
      var c = colorFor(row, i);
      return '<g>' +
        '<rect x="' + padL + '" y="' + y + '" width="' + trackW + '" height="' + rowH +
          '" rx="5" fill="' + LINE + '" opacity=".55"/>' +
        '<rect x="' + padL + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + rowH +
          '" rx="5" fill="' + c + '" opacity=".85">' +
          '<title>' + esc(row.label + ' — ' + fmt(row.value, opts.valueKind)) + '</title>' +
        '</rect>' +
        '<text x="' + (padL - 10) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" fill="' + INK + '"' +
          ' font-family="IBM Plex Mono,monospace" font-size="12">' + esc(row.label) + '</text>' +
        '<text x="' + (w - padR + 10) + '" y="' + (y + rowH / 2 + 4) + '" fill="' + MUT + '"' +
          ' font-family="IBM Plex Mono,monospace" font-size="12">' + esc(fmt(row.value, opts.valueKind)) + '</text>' +
        '</g>';
    }).join('');

    var id = ids();
    id.title.text = opts.title || 'Ranked bars';
    id.desc.text = rows.map(function (rw) {
      return rw.label + ' ' + fmt(rw.value, opts.valueKind);
    }).join(', ');

    el.innerHTML = wrapSvg(inner, w, h, id.title, id.desc, 'pnchart-bars') +
      srTable(rows, opts.valueKind);
  }

  // ---------- 100% stacked bar ----------

  function stack(el, rows, opts) {
    opts = opts || {};
    rows = clean(rows);
    if (!rows.length) return empty(el, opts.emptyMessage);

    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    var w = 560, h = 34, x = 0;

    var inner = rows.map(function (row, i) {
      var bw = (row.value / total) * w;
      var seg = '<rect x="' + x.toFixed(2) + '" y="0" width="' + Math.max(bw, 0).toFixed(2) +
        '" height="' + h + '" fill="' + colorFor(row, i) + '" opacity=".88">' +
        '<title>' + esc(row.label + ' — ' + pct(row.value / total)) + '</title></rect>';
      x += bw;
      return seg;
    }).join('');

    var id = ids();
    id.title.text = opts.title || 'Composition';
    id.desc.text = rows.map(function (rw) {
      return rw.label + ' ' + pct(rw.value / total);
    }).join(', ');

    var legend = '<ul class="chart-legend chart-legend-inline">' + rows.map(function (row, i) {
      return '<li><span class="dot" style="background:' + colorFor(row, i) + '"></span>' +
        '<span class="lg-label">' + esc(row.label) + '</span>' +
        '<span class="lg-pct">' + esc(pct(row.value / total)) + '</span></li>';
    }).join('') + '</ul>';

    el.innerHTML = '<div class="chart-stackwrap">' +
      wrapSvg(inner, w, h, id.title, id.desc, 'pnchart-stack') + legend + '</div>' +
      srTable(rows, opts.valueKind);
  }

  // ---------- line / area over time ----------

  function line(el, series, opts) {
    opts = opts || {};
    var pts = (series || []).filter(function (p) {
      return p && isFinite(p.value);
    });
    if (pts.length < 2) {
      return empty(el, opts.emptyMessage ||
        'Needs at least two months of history — one snapshot so far.');
    }

    var w = 560, h = 200, padL = 58, padR = 14, padT = 14, padB = 34;
    var plotW = w - padL - padR, plotH = h - padT - padB;

    var vals = pts.map(function (p) { return p.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min = min * 0.95; max = max * 1.05 || 1; }
    var span = max - min;

    function px(i) { return padL + (i / (pts.length - 1)) * plotW; }
    function py(v) { return padT + plotH - ((v - min) / span) * plotH; }

    var d = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(p.value).toFixed(1);
    }).join(' ');

    var area = d + ' L' + px(pts.length - 1).toFixed(1) + ' ' + (padT + plotH) +
      ' L' + px(0).toFixed(1) + ' ' + (padT + plotH) + ' Z';

    /* horizontal gridlines + y labels */
    var grid = '';
    for (var g = 0; g <= 3; g++) {
      var v = min + (span * g / 3);
      var y = py(v);
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (w - padR) +
        '" y2="' + y.toFixed(1) + '" stroke="' + LINE + '" stroke-width="1"/>' +
        '<text x="' + (padL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" fill="' + DIM +
        '" font-family="IBM Plex Mono,monospace" font-size="10">' +
        esc(fmt(v, opts.valueKind)) + '</text>';
    }

    /* x labels — first, middle, last, to avoid crowding */
    var marks = pts.length <= 4
      ? pts.map(function (_, i) { return i; })
      : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
    var xlab = marks.map(function (i) {
      return '<text x="' + px(i).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle" fill="' + DIM +
        '" font-family="IBM Plex Mono,monospace" font-size="10">' + esc(pts[i].label) + '</text>';
    }).join('');

    var dots = pts.map(function (p, i) {
      return '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(p.value).toFixed(1) +
        '" r="3.5" fill="' + ACC + '" stroke="#0e1116" stroke-width="2">' +
        '<title>' + esc(p.label + ' — ' + fmt(p.value, opts.valueKind)) + '</title></circle>';
    }).join('');

    var gid = 'pngrad' + (++uid);
    var inner =
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + ACC + '" stop-opacity=".28"/>' +
      '<stop offset="100%" stop-color="' + ACC + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="' + ACC + '" stroke-width="2"' +
      ' stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + xlab;

    var id = ids();
    id.title.text = opts.title || 'Trend over time';
    id.desc.text = pts.map(function (p) {
      return p.label + ' ' + fmt(p.value, opts.valueKind);
    }).join(', ');

    el.innerHTML = wrapSvg(inner, w, h, id.title, id.desc, 'pnchart-line') +
      srTable(pts, opts.valueKind);
  }

  // ---------- interactive market chart ----------

  function market(el, series, opts) {
    opts = opts || {};
    var pts = (series || []).filter(function (p) { return p && isFinite(p.value); });
    if (pts.length < 2) return empty(el, opts.emptyMessage || 'Price history is not available yet.');

    var w = 820, h = 352, padL = 66, padR = 24, padT = 20, priceBottom = 248,
        volumeTop = 276, volumeBottom = 322, plotW = w - padL - padR, plotH = priceBottom - padT;
    var vals = pts.map(function (p) { return Number(p.value); });
    /* Overlay series (e.g. EMAs) share the price scale, so their finite
       values must widen the axis or a long-period average would clip. */
    var overlays = (opts.overlays || []).filter(function (o) {
      return o && Array.isArray(o.values) && o.values.some(function (v) { return Number.isFinite(v); });
    });
    var scaleVals = vals.slice();
    overlays.forEach(function (o) {
      /* Number.isFinite, not isFinite — warm-up slots are null and
         isFinite(null) is true, which would drag the scale to zero. */
      o.values.forEach(function (v) { if (Number.isFinite(v)) scaleVals.push(v); });
    });
    var rawMin = Math.min.apply(null, scaleVals), rawMax = Math.max.apply(null, scaleVals);
    var breathing = Math.max((rawMax - rawMin) * 0.1, rawMax * 0.012, 0.01);
    var min = rawMin - breathing, max = rawMax + breathing, span = max - min;
    var volumes = pts.map(function (p) { return isFinite(p.volume) ? Number(p.volume) : 0; });
    var maxVolume = Math.max.apply(null, volumes.concat([0]));
    var rising = vals[vals.length - 1] >= vals[0];
    var accent = rising ? '#5FAE5A' : '#e5534b';

    function px(i) { return padL + (i / (pts.length - 1)) * plotW; }
    function py(v) { return padT + plotH - ((v - min) / span) * plotH; }
    function volumeY(v) { return maxVolume ? volumeBottom - (v / maxVolume) * (volumeBottom - volumeTop) : volumeBottom; }

    var linePath = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(p.value).toFixed(1);
    }).join(' ');
    var areaPath = linePath + ' L' + px(pts.length - 1).toFixed(1) + ' ' + priceBottom +
      ' L' + px(0).toFixed(1) + ' ' + priceBottom + ' Z';

    var grid = '';
    for (var g = 0; g < 5; g++) {
      var ratio = g / 4, value = max - span * ratio, y = padT + plotH * ratio;
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + y.toFixed(1) + '" stroke="' + LINE + '" stroke-width="1"/>' +
        '<text x="' + (padL - 11) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" fill="' + DIM + '" font-family="IBM Plex Mono,monospace" font-size="10">' + esc(money(value)) + '</text>';
    }

    var volumeBars = maxVolume ? pts.map(function (p, i) {
      var barW = Math.max(1.4, plotW / pts.length * 0.58), y = volumeY(volumes[i]);
      var up = isFinite(p.open) && isFinite(p.close) ? p.close >= p.open : rising;
      return '<rect x="' + (px(i) - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, volumeBottom - y).toFixed(1) + '" rx="1" fill="' + (up ? '#5FAE5A' : '#e5534b') + '" opacity=".32"/>';
    }).join('') : '';

    var markCount = Math.min(5, pts.length), marks = [];
    for (var m = 0; m < markCount; m++) marks.push(Math.round(m * (pts.length - 1) / Math.max(1, markCount - 1)));
    var xLabels = marks.map(function (i) {
      return '<text x="' + px(i).toFixed(1) + '" y="346" text-anchor="middle" fill="' + DIM + '" font-family="IBM Plex Mono,monospace" font-size="10">' + esc(pts[i].label) + '</text>';
    }).join('');

    var firstY = py(vals[0]);
    var gid = 'pnmarketgrad' + (++uid);
    var inner = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + accent + '" stop-opacity=".34"/><stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<line x1="' + padL + '" y1="' + firstY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + firstY.toFixed(1) + '" stroke="' + accent + '" stroke-width="1" stroke-dasharray="4 6" opacity=".36"/>' +
      '<path d="' + areaPath + '" fill="url(#' + gid + ')"/><path d="' + linePath + '" fill="none" stroke="' + accent + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      overlays.map(function (o) {
        var d = '', pen = false;
        o.values.forEach(function (v, i) {
          if (i >= pts.length) return;
          if (!Number.isFinite(v)) { pen = false; return; }
          d += (pen ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1);
          pen = true;
        });
        return d ? '<path d="' + d + '" fill="none" stroke="' + (o.color || MUT) +
          '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".92"/>' : '';
      }).join('') +
      '<line x1="' + padL + '" y1="262" x2="' + (w - padR) + '" y2="262" stroke="' + LINE2 + '"/><text x="' + padL + '" y="272" fill="' + DIM + '" font-family="IBM Plex Mono,monospace" font-size="9" letter-spacing="1.2">VOLUME</text>' +
      volumeBars + xLabels +
      '<line class="pn-market-cross" x1="0" y1="' + padT + '" x2="0" y2="' + volumeBottom + '" stroke="' + MUT + '" stroke-width="1" stroke-dasharray="3 4" visibility="hidden"/>' +
      '<circle class="pn-market-dot" cx="0" cy="0" r="5" fill="' + accent + '" stroke="#0e1116" stroke-width="2.5" visibility="hidden"/>' +
      '<rect class="pn-market-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + (volumeBottom - padT) + '" fill="transparent"/>';

    var id = ids();
    id.title.text = opts.title || 'Stock price history';
    id.desc.text = pts.length + ' daily closing prices from ' + pts[0].label + ' to ' + pts[pts.length - 1].label + ', with volume when available.';
    /* Dividend markers. Each event date is snapped to the nearest
       trading day actually in `pts` (ex/pay dates fall on weekends or
       non-trading days as often as not) so it always lands on a real
       point on the line rather than silently vanishing. Confirmed
       events (from the private research JSON) render solid; estimated
       ones (this symbol's own frequency projected backward/forward)
       render hollow, per STOCK_CHART_PLAN.md's "styled differently." */
    var events = (opts.events || []).filter(function (e) { return e && e.date; });
    var eventMarks = events.map(function (e) {
      var target = new Date(e.date + 'T12:00:00').getTime();
      var bestI = 0, bestDiff = Infinity;
      pts.forEach(function (p, i) {
        var d = Math.abs(new Date((p.date || p.label) + 'T12:00:00').getTime() - target);
        if (isFinite(d) && d < bestDiff) { bestDiff = d; bestI = i; }
      });
      /* only mark it if a trading day within ~4 days actually exists —
         otherwise a stray date far outside the series would misleadingly
         snap to an edge point */
      if (bestDiff > 4 * 86400000) return null;
      return { i: bestI, kind: e.kind, confirmed: !!e.confirmed, date: e.date, label: e.label || '' };
    }).filter(Boolean);

    var eventColor = { 'ex-dividend': '#4CC9F0', payment: '#5FAE5A' };
    var eventSvg = eventMarks.map(function (m) {
      var x = px(m.i), y = priceBottom + 9;
      var color = eventColor[m.kind] || ACC;
      var shape = m.confirmed
        ? '<path d="M' + x.toFixed(1) + ' ' + (y - 5) + ' l5 5 -5 5 -5 -5 Z" fill="' + color + '"/>'
        : '<path d="M' + x.toFixed(1) + ' ' + (y - 5) + ' l5 5 -5 5 -5 -5 Z" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-dasharray="2 1.5"/>';
      var title = esc(m.date + ' — ' + (m.confirmed ? 'confirmed ' : 'estimated ') +
        (m.kind === 'ex-dividend' ? 'ex-dividend date' : 'dividend payment') + (m.label ? ' — ' + m.label : ''));
      return '<g>' + shape + '<title>' + title + '</title></g>';
    }).join('');

    var overlayLegend = (overlays.length || eventMarks.length)
      ? '<div class="market-overlaylegend">' + overlays.map(function (o) {
          return '<span><i style="background:' + (o.color || MUT) + '"></i>' + esc(o.label || '') + '</span>';
        }).join('') + (eventMarks.length ? (
          '<span><i class="mk-diamond" style="background:' + eventColor.payment + '"></i>Confirmed dividend</span>' +
          '<span><i class="mk-diamond mk-hollow" style="border-color:' + eventColor.payment + '"></i>Estimated (frequency pattern)</span>'
        ) : '') + '</div>'
      : '';

    var eventList = eventMarks.length
      ? '<ul class="visually-hidden">' + eventMarks.map(function (m) {
          return '<li>' + esc(m.date) + ' — ' + (m.confirmed ? 'confirmed' : 'estimated') + ' ' +
            (m.kind === 'ex-dividend' ? 'ex-dividend date' : 'dividend payment') + '</li>';
        }).join('') + '</ul>'
      : '';

    el.innerHTML = '<div class="market-frame">' + overlayLegend + wrapSvg(inner + eventSvg, w, h, id.title, id.desc, 'pnchart-market') +
      '<div class="market-tooltip" hidden></div></div>' + srTable(pts.map(function (p) { return { label: p.date || p.label, value: p.value }; }), 'money') + eventList;

    var svg = el.querySelector('.pnchart-market');
    var cross = el.querySelector('.pn-market-cross'), dot = el.querySelector('.pn-market-dot'), tooltip = el.querySelector('.market-tooltip');
    var activeIndex = pts.length - 1;
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', id.title.text + '. Use left and right arrow keys to inspect daily values.');

    function compactNumber(n) {
      if (!isFinite(n) || n <= 0) return '—';
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return Math.round(n).toLocaleString('en-US');
    }
    function showPoint(index) {
      activeIndex = Math.max(0, Math.min(pts.length - 1, index));
      var p = pts[activeIndex], x = px(activeIndex), y = py(p.value);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('visibility', 'visible');
      var dayMove = isFinite(p.open) && p.open ? ((p.value - p.open) / p.open) * 100 : null;
      tooltip.hidden = false;
      tooltip.style.left = Math.max(12, Math.min(88, x / w * 100)) + '%';
      tooltip.style.top = Math.max(8, y / h * 100 - 4) + '%';
      tooltip.innerHTML = '<b>' + esc(p.date || p.label) + '</b><span>Close ' + esc(money(p.value)) + '</span>' +
        (isFinite(p.high) && isFinite(p.low) ? '<span>High ' + esc(money(p.high)) + ' · Low ' + esc(money(p.low)) + '</span>' : '') +
        '<span>' + (dayMove == null ? '' : (dayMove >= 0 ? '+' : '') + dayMove.toFixed(2) + '% day') + (maxVolume ? ' · Vol ' + esc(compactNumber(p.volume)) : '') + '</span>' +
        overlays.map(function (o) {
          var v = o.values[activeIndex];
          return Number.isFinite(v)
            ? '<span style="color:' + (o.color || MUT) + '">' + esc(o.label || '') + ' ' + esc(money(v)) + '</span>'
            : '';
        }).join('');
    }
    function hidePoint() {
      cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tooltip.hidden = true;
    }
    svg.addEventListener('pointermove', function (event) {
      var rect = svg.getBoundingClientRect();
      var svgX = (event.clientX - rect.left) * (w / rect.width);
      showPoint(Math.round(((svgX - padL) / plotW) * (pts.length - 1)));
    });
    svg.addEventListener('pointerleave', hidePoint);
    svg.addEventListener('focus', function () { showPoint(activeIndex); });
    svg.addEventListener('blur', hidePoint);
    svg.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      showPoint(event.key === 'Home' ? 0 : event.key === 'End' ? pts.length - 1 : activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
  }

  // ---------- sparkline ----------

  function spark(el, values, opts) {
    opts = opts || {};
    var vals = (values || []).filter(function (v) { return isFinite(v); });
    if (vals.length < 2) { el.innerHTML = ''; return; }

    var w = 120, h = 28, pad = 3;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 1; max += 1; }

    var d = vals.map(function (v, i) {
      var x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      var y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');

    var up = vals[vals.length - 1] >= vals[0];
    var stroke = opts.color || (up ? '#45c26b' : '#e5534b');

    var id = ids();
    id.title.text = opts.title || 'Sparkline';
    id.desc.text = (up ? 'Trending up' : 'Trending down') + ' across ' + vals.length + ' points.';

    el.innerHTML = wrapSvg(
      '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="1.75"' +
      ' stroke-linejoin="round" stroke-linecap="round"/>',
      w, h, id.title, id.desc, 'pnchart-spark'
    );
  }

  // ---------- Obsidian-style vault graph ----------

  /* A small force-directed graph, laid out synchronously (a few
     hundred spring iterations, no animation loop) and rendered as SVG.
     Nodes: {id, label, type ('hub'|'project'|'thought'|'note'), size?}
     Links: {source, target}
     Hover a node to highlight its neighbourhood; click fires
     opts.onSelect(node). */
  function graph(el, data, opts) {
    opts = opts || {};
    var nodes = (data && data.nodes || []).slice();
    var links = (data && data.links || []).filter(function (l) { return l && l.source && l.target; });
    if (!nodes.length) return empty(el, opts.emptyMessage || 'Nothing to map yet.');

    var w = 760, h = 430, cx = w / 2, cy = h / 2;
    var TYPE_COLOR = { hub: ACC, project: '#4CC9F0', thought: '#c084fc', note: '#8b95a5' };

    var index = {};
    nodes.forEach(function (n, i) {
      index[n.id] = i;
      var golden = i * 2.39996323;
      n.x = cx + Math.cos(golden) * (60 + 24 * Math.sqrt(i));
      n.y = cy + Math.sin(golden) * (42 + 17 * Math.sqrt(i));
      n.vx = 0; n.vy = 0;
      n.r = n.type === 'hub' ? 15 : n.type === 'project' ? 10 : 7;
      if (n.size) n.r = Math.max(n.r, Math.min(17, n.r + n.size));
    });
    var edges = links.map(function (l) {
      return { a: index[l.source], b: index[l.target] };
    }).filter(function (e) { return e.a != null && e.b != null && e.a !== e.b; });

    var degree = nodes.map(function () { return 0; });
    edges.forEach(function (e) { degree[e.a]++; degree[e.b]++; });

    for (var iter = 0; iter < 260; iter++) {
      var t = 1 - iter / 260;
      /* repulsion */
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          var d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2);
          var f = Math.min(14, 2600 / d2) * t;
          var fx = dx / d * f, fy = dy / d * f;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }
      /* springs */
      edges.forEach(function (e) {
        var a = nodes[e.a], b = nodes[e.b];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var rest = 74 + (a.r + b.r);
        var f = (d - rest) * 0.018 * t;
        var fx = dx / d * f, fy = dy / d * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      });
      /* mild gravity to the center + integrate */
      nodes.forEach(function (n) {
        n.vx += (cx - n.x) * 0.004 * t;
        n.vy += (cy - n.y) * 0.004 * t;
        n.x += Math.max(-9, Math.min(9, n.vx));
        n.y += Math.max(-9, Math.min(9, n.vy));
        n.vx *= 0.62; n.vy *= 0.62;
        n.x = Math.max(26, Math.min(w - 26, n.x));
        n.y = Math.max(24, Math.min(h - 24, n.y));
      });
    }

    var edgeSvg = edges.map(function (e, i) {
      var a = nodes[e.a], b = nodes[e.b];
      return '<line class="vg-edge" data-a="' + e.a + '" data-b="' + e.b + '" x1="' + a.x.toFixed(1) +
        '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) +
        '" stroke="' + LINE2 + '" stroke-width="1" opacity=".7"/>';
    }).join('');

    var nodeSvg = nodes.map(function (n, i) {
      var color = TYPE_COLOR[n.type] || TYPE_COLOR.note;
      var labelY = n.y + n.r + 13;
      return '<g class="vg-node" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(n.label) + '">' +
        '<circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + (n.r + 7) +
          '" fill="' + color + '" opacity="0" class="vg-halo"/>' +
        '<circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + n.r +
          '" fill="' + color + '" opacity="' + (n.type === 'note' ? '.66' : '.9') +
          '" stroke="#0e1116" stroke-width="1.6"/>' +
        '<text x="' + n.x.toFixed(1) + '" y="' + Math.min(h - 6, labelY).toFixed(1) +
          '" text-anchor="middle" fill="' + (n.type === 'hub' ? INK : MUT) +
          '" font-family="IBM Plex Mono,monospace" font-size="' + (n.type === 'hub' ? 11 : 9.5) + '">' +
          esc(String(n.label).length > 22 ? String(n.label).slice(0, 21) + '…' : n.label) + '</text>' +
        '</g>';
    }).join('');

    var id = ids();
    id.title.text = opts.title || 'Vault graph';
    id.desc.text = nodes.length + ' notes and projects, ' + edges.length + ' links.';

    el.innerHTML = wrapSvg(edgeSvg + nodeSvg, w, h, id.title, id.desc, 'pnchart-graph') +
      '<div class="vg-legend">' +
      ['hub', 'project', 'thought', 'note'].map(function (k) {
        var names = { hub: 'vault', project: 'project', thought: 'AI thought', note: 'note' };
        return '<span><i style="background:' + TYPE_COLOR[k] + '"></i>' + names[k] + '</span>';
      }).join('') + '</div>';

    var svg = el.querySelector('.pnchart-graph');
    var edgeEls = svg.querySelectorAll('.vg-edge');

    function setFocus(i) {
      var neighbours = {};
      if (i != null) {
        neighbours[i] = true;
        edges.forEach(function (e) {
          if (e.a === i) neighbours[e.b] = true;
          if (e.b === i) neighbours[e.a] = true;
        });
      }
      Array.prototype.forEach.call(svg.querySelectorAll('.vg-node'), function (g) {
        var gi = +g.dataset.i;
        g.style.opacity = (i == null || neighbours[gi]) ? '1' : '.22';
        g.querySelector('.vg-halo').setAttribute('opacity', gi === i ? '.18' : '0');
      });
      Array.prototype.forEach.call(edgeEls, function (line) {
        var on = i == null || +line.dataset.a === i || +line.dataset.b === i;
        line.setAttribute('opacity', on ? (i == null ? '.7' : '1') : '.12');
        line.setAttribute('stroke', on && i != null ? ACC : LINE2);
      });
    }

    Array.prototype.forEach.call(svg.querySelectorAll('.vg-node'), function (g) {
      var i = +g.dataset.i;
      g.addEventListener('pointerenter', function () { setFocus(i); });
      g.addEventListener('focus', function () { setFocus(i); });
      g.addEventListener('pointerleave', function () { setFocus(null); });
      g.addEventListener('blur', function () { setFocus(null); });
      function pick(ev) {
        if (opts.onSelect) { ev.preventDefault(); opts.onSelect(nodes[i]); }
      }
      g.addEventListener('click', pick);
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') pick(ev);
      });
    });
  }

  // ---------- normalized multi-symbol comparison ----------

  /* seriesList: [{ symbol, label, color, points: [{date,label,value}, …] }]
     Each series is indexed to 100 at its own first point, per
     STOCK_CHART_PLAN.md's Version 2 spec ("every series normalized to
     100 at the range start"). This is a PRICE comparison only — no
     portfolio weighting, no total return, since those need a dated
     transaction ledger the tracker doesn't have yet. If series carry
     different point counts (a data gap, a newer listing), each is
     trimmed to the shortest length from its own end so every line
     still spans the same number of trading sessions, aligned on the
     x-axis by position rather than by exact date. */
  function compare(el, seriesList, opts) {
    opts = opts || {};
    var lists = (seriesList || []).filter(function (s) {
      return s && Array.isArray(s.points) && s.points.filter(function (p) { return isFinite(p.value); }).length >= 2;
    });
    if (!lists.length) return empty(el, opts.emptyMessage || 'Pick at least one stock to compare.');

    var minLen = Math.min.apply(null, lists.map(function (s) { return s.points.length; }));
    var series = lists.map(function (s, i) {
      var pts = s.points.slice(-minLen);
      var base = pts[0] && pts[0].value;
      var idx = pts.map(function (p) {
        return { date: p.date || p.label, label: p.label, value: (base && isFinite(p.value)) ? (p.value / base * 100) : null };
      });
      return { symbol: s.symbol, label: s.label || s.symbol, color: s.color || RAMP[i % RAMP.length], points: idx };
    });

    var w = 820, h = 300, padL = 50, padR = 20, padT = 18, padB = 30;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var n = minLen;

    var allVals = [];
    series.forEach(function (s) { s.points.forEach(function (p) { if (isFinite(p.value)) allVals.push(p.value); }); });
    allVals.push(100); // the shared baseline is always in view even if every series only goes one direction
    var min = Math.min.apply(null, allVals), max = Math.max.apply(null, allVals);
    var breathing = Math.max((max - min) * 0.08, 1);
    min -= breathing; max += breathing;
    var span = max - min || 1;

    function px(i) { return padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2); }
    function py(v) { return padT + plotH - ((v - min) / span) * plotH; }

    var grid = '';
    for (var g = 0; g < 4; g++) {
      var val = max - span * (g / 3), y = padT + plotH * (g / 3);
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + y.toFixed(1) +
        '" stroke="' + LINE + '" stroke-width="1"/><text x="' + (padL - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end" fill="' + DIM + '" font-family="IBM Plex Mono,monospace" font-size="10">' + val.toFixed(0) + '</text>';
    }
    var baseY = py(100);
    grid += '<line x1="' + padL + '" y1="' + baseY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + baseY.toFixed(1) +
      '" stroke="' + MUT + '" stroke-width="1" stroke-dasharray="3 4" opacity=".5"/>';

    var lines = series.map(function (s) {
      var d = '', pen = false;
      s.points.forEach(function (p, i) {
        if (!isFinite(p.value)) { pen = false; return; }
        d += (pen ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(p.value).toFixed(1);
        pen = true;
      });
      return d ? '<path data-symbol="' + esc(s.symbol) + '" d="' + d + '" fill="none" stroke="' + s.color +
        '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' : '';
    }).join('');

    var xMarks = Math.min(5, n), marks = [];
    for (var m = 0; m < xMarks; m++) marks.push(Math.round(m * (n - 1) / Math.max(1, xMarks - 1)));
    var xLabels = marks.map(function (i) {
      return '<text x="' + px(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" fill="' + DIM +
        '" font-family="IBM Plex Mono,monospace" font-size="10">' + esc(series[0].points[i].label || '') + '</text>';
    }).join('');

    var cross = '<line class="cmp-cross" x1="0" y1="' + padT + '" x2="0" y2="' + (padT + plotH) +
      '" stroke="' + MUT + '" stroke-width="1" stroke-dasharray="3 4" visibility="hidden"/>';
    var dots = series.map(function (s) {
      return '<circle class="cmp-dot" data-symbol="' + esc(s.symbol) + '" cx="0" cy="0" r="4" fill="' + s.color +
        '" stroke="#0e1116" stroke-width="2" visibility="hidden"/>';
    }).join('');
    var hit = '<rect class="cmp-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent"/>';

    var id = ids();
    id.title.text = opts.title || 'Normalized price comparison';
    id.desc.text = series.map(function (s) { return s.symbol; }).join(', ') + ', each indexed to 100 at the start of the range.';

    var legend = '<ul class="chart-legend chart-legend-inline">' + series.map(function (s) {
      var lastVal = s.points.filter(function (p) { return isFinite(p.value); }).slice(-1)[0];
      var ret = lastVal ? (lastVal.value - 100) : null;
      return '<li><span class="dot" style="background:' + s.color + '"></span>' +
        '<span class="lg-label">' + esc(s.symbol) + '</span>' +
        '<span class="lg-val" style="color:' + (ret >= 0 ? '#45c26b' : '#e5534b') + '">' +
        (ret == null ? '—' : (ret >= 0 ? '+' : '') + ret.toFixed(1) + '%') + '</span></li>';
    }).join('') + '</ul>';

    el.innerHTML = '<div class="cmp-frame">' + wrapSvg(grid + lines + cross + dots + hit + xLabels, w, h, id.title, id.desc, 'pnchart-compare') +
      '<div class="market-tooltip cmp-tooltip" hidden></div></div>' + legend +
      series.map(function (s) { return srTable(s.points.map(function (p) { return { label: (p.date || p.label) + ' ' + s.symbol, value: p.value }; }), 'num'); }).join('');

    var svg = el.querySelector('.pnchart-compare');
    var crossEl = el.querySelector('.cmp-cross'), tooltip = el.querySelector('.cmp-tooltip');
    var dotEls = {};
    Array.prototype.forEach.call(el.querySelectorAll('.cmp-dot'), function (d) { dotEls[d.dataset.symbol] = d; });

    function showAt(i) {
      i = Math.max(0, Math.min(n - 1, i));
      var x = px(i);
      crossEl.setAttribute('x1', x); crossEl.setAttribute('x2', x); crossEl.setAttribute('visibility', 'visible');
      var rows = series.map(function (s) {
        var p = s.points[i];
        var dot = dotEls[s.symbol];
        if (p && isFinite(p.value)) {
          dot.setAttribute('cx', x); dot.setAttribute('cy', py(p.value)); dot.setAttribute('visibility', 'visible');
        } else { dot.setAttribute('visibility', 'hidden'); }
        var ret = p && isFinite(p.value) ? p.value - 100 : null;
        return '<span style="color:' + s.color + '">' + esc(s.symbol) + ' ' +
          (ret == null ? '—' : (ret >= 0 ? '+' : '') + ret.toFixed(1) + '%') + '</span>';
      }).join('');
      var dateLabel = series[0].points[i] ? (series[0].points[i].date || series[0].points[i].label) : '';
      tooltip.hidden = false;
      tooltip.style.left = Math.max(10, Math.min(90, x / w * 100)) + '%';
      tooltip.style.top = '6%';
      tooltip.innerHTML = '<b>' + esc(dateLabel) + '</b>' + rows;
    }
    function hide() {
      crossEl.setAttribute('visibility', 'hidden');
      Object.keys(dotEls).forEach(function (k) { dotEls[k].setAttribute('visibility', 'hidden'); });
      tooltip.hidden = true;
    }
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('pointermove', function (e) {
      var rect = svg.getBoundingClientRect();
      var sx = (e.clientX - rect.left) * (w / rect.width);
      showAt(Math.round(((sx - padL) / plotW) * (n - 1)));
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { showAt(n - 1); });
    svg.addEventListener('blur', hide);
    var activeI = n - 1;
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      activeI = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : activeI + (e.key === 'ArrowRight' ? 1 : -1);
      activeI = Math.max(0, Math.min(n - 1, activeI));
      showAt(activeI);
    });
  }

  global.PNCharts = {
    donut: donut,
    bars: bars,
    stack: stack,
    line: line,
    market: market,
    compare: compare,
    graph: graph,
    spark: spark,
    money: money,
    pct: pct,
    palette: PALETTE,
    ramp: RAMP
  };
})(window);
