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
    rows = clean(rows).slice().sort(function (a, b) { return b.value - a.value; });
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
    var rawMin = Math.min.apply(null, vals), rawMax = Math.max.apply(null, vals);
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
      '<line x1="' + padL + '" y1="262" x2="' + (w - padR) + '" y2="262" stroke="' + LINE2 + '"/><text x="' + padL + '" y="272" fill="' + DIM + '" font-family="IBM Plex Mono,monospace" font-size="9" letter-spacing="1.2">VOLUME</text>' +
      volumeBars + xLabels +
      '<line class="pn-market-cross" x1="0" y1="' + padT + '" x2="0" y2="' + volumeBottom + '" stroke="' + MUT + '" stroke-width="1" stroke-dasharray="3 4" visibility="hidden"/>' +
      '<circle class="pn-market-dot" cx="0" cy="0" r="5" fill="' + accent + '" stroke="#0e1116" stroke-width="2.5" visibility="hidden"/>' +
      '<rect class="pn-market-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + (volumeBottom - padT) + '" fill="transparent"/>';

    var id = ids();
    id.title.text = opts.title || 'Stock price history';
    id.desc.text = pts.length + ' daily closing prices from ' + pts[0].label + ' to ' + pts[pts.length - 1].label + ', with volume when available.';
    el.innerHTML = '<div class="market-frame">' + wrapSvg(inner, w, h, id.title, id.desc, 'pnchart-market') +
      '<div class="market-tooltip" hidden></div></div>' + srTable(pts.map(function (p) { return { label: p.date || p.label, value: p.value }; }), 'money');

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
        '<span>' + (dayMove == null ? '' : (dayMove >= 0 ? '+' : '') + dayMove.toFixed(2) + '% day') + (maxVolume ? ' · Vol ' + esc(compactNumber(p.volume)) : '') + '</span>';
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

  global.PNCharts = {
    donut: donut,
    bars: bars,
    stack: stack,
    line: line,
    market: market,
    spark: spark,
    money: money,
    pct: pct,
    palette: PALETTE,
    ramp: RAMP
  };
})(window);
