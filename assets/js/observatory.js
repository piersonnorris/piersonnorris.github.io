/* ============================================================
   PNObservatory — R18 phase B/C. The ship-in-a-bottle vault scene.

     PNObservatory.mount(el, {
       data:        window.PNVaultPublic,   // the published snapshot
       orientation: 'auto' | 'landscape' | 'portrait',
       depth:       'deep' | 'dusk',
       onOpen:      function (note) {}      // a node was activated
     }) → { open, close, destroy, state }

   Styles live in assets/css/observatory.css.

   WHAT PHASE A DECIDED, ENCODED HERE
   ----------------------------------
   1. "Inside" is a different LAYOUT, not a zoom. Pushing the camera in
      inflates the nodes and leaves four notes of thirteen on screen —
      the vault vanishes exactly when you arrive in it. So there are two
      layouts, and opening the bottle morphs every node from its place in
      the glass to its place in the room. That is the whole trick.
   2. Portrait is a third composition, not a reflow. The bottle stands on
      its base, the copy goes above it, and the geometry below is a
      separate set of numbers rather than a squeezed version of the
      landscape one.
   3. Nodes never enter the shoulder or the neck, where the clip slices
      them and the curvature is tightest.
   4. Two marks make it read as glass — one travelling glint and one rim
      light. Everything else was noise.

   The structure is real: edges are [[wikilinks]] actually written in the
   notes, counted the way PNGraphify counts them (code spans stripped, so
   a note documenting the syntax doesn't invent edges).
   ============================================================ */
(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------- geometry ----------------
     Two compositions, not one with breakpoints. Each carries its own
     viewBox, silhouette, node field, cork travel and furniture. */

  var LANDSCAPE = {
    id: 'landscape',
    vb: { x: 0, y: 0, w: 1440, h: 820 },
    /* Lying on its side: base left, cork right, so the "pull me"
       affordance points away from the headline instead of into it. */
    bottle: 'M600 258 H1050 C1122 258 1158 300 1170 374 H1252 V446 H1170 ' +
            'C1158 520 1122 562 1050 562 H600 C538 562 516 520 516 410 ' +
            'C516 300 538 258 600 258 Z',
    body: { x0: 636, y0: 324, x1: 1014, y1: 496 },
    cols: 5,
    cork: { x: 1246, y: 364, w: 54, h: 92, r: 9 },
    corkPull: 'translate(58px,0)',
    glint: 'M646 306 q160-20 322 0',
    rims: [
      { d: 'M1058 532 q64-26 86-70', o: .16, w: 3 },
      { d: 'M548 334 q-13 74 0 148', o: .13, w: 3 }
    ],
    water: 'M500 528 q108-14 216 0 t216 0 t216 0 t216 0 l0 120 l-880 0 z',
    ship: { x: 800, y: 528, s: 1 },
    bubbles: [[690, 500], [880, 512], [980, 496]],
    floor: 762,
    pull: { right: '6%', top: '32%', left: 'auto', bottom: 'auto', align: 'right' }
  };

  var PORTRAIT = {
    id: 'portrait',
    vb: { x: 0, y: 0, w: 760, h: 1300 },
    /* Standing on its base. Phase A shipped a band-and-stack fallback
       for phone; this is the real answer it deferred. */
    bottle: 'M322 200 V330 C322 398 292 428 250 470 C206 514 176 556 176 632 ' +
            'V1146 C176 1214 216 1250 282 1250 H478 C544 1250 584 1214 584 1146 ' +
            'V632 C584 556 554 514 510 470 C468 428 438 398 438 330 V200 Z',
    body: { x0: 244, y0: 700, x1: 516, y1: 1160 },
    cols: 3,
    cork: { x: 316, y: 124, w: 128, h: 86, r: 11 },
    corkPull: 'translate(0,-62px)',
    glint: 'M232 700 q-16 190 0 380',
    rims: [
      { d: 'M528 760 q22 180 0 350', o: .15, w: 3 },
      { d: 'M262 560 q26-56 66-92', o: .18, w: 3 }
    ],
    water: 'M150 1120 q76-12 152 0 t152 0 t152 0 t152 0 l0 200 l-608 0 z',
    ship: { x: 300, y: 1120, s: .8 },
    bubbles: [[300, 1080], [420, 1050], [360, 1010]],
    floor: 1272,
    /* On the neck, not at the top of the frame — in portrait the copy
       occupies the first fifth and the affordance landed straight on the
       h1. Sitting it just under the shoulder also puts it where the
       thumb already is. */
    pull: { left: '50%', top: '30%', right: 'auto', bottom: 'auto', align: 'center' }
  };

  /* ---------------- data ---------------- */

  /* Code is not writing. Same rule as PNGraphify: a note explaining how
     [[wikilinks]] work is not linking to a note called "wikilinks". */
  function linkable(body) {
    return String(body || '')
      .replace(/```[\s\S]*?(?:```|$)/g, ' ')
      .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
      .replace(/`[^`\n]*`/g, ' ');
  }

  function index(notes) {
    var byTitle = {};
    notes.forEach(function (n) {
      var k = String(n.title || '').trim().toLowerCase();
      if (k && !byTitle[k]) byTitle[k] = n;
    });
    return byTitle;
  }

  function outgoing(note, byTitle) {
    var seen = {}, out = [];
    linkable(note.body).replace(/\[\[([^\[\]|]+)(?:\|[^\[\]]+)?\]\]/g, function (_, raw) {
      var hit = byTitle[raw.split('#')[0].trim().toLowerCase()];
      if (hit && hit.path !== note.path && !seen[hit.path]) { seen[hit.path] = 1; out.push(hit); }
      return '';
    });
    return out;
  }

  /* Stable, seeded scatter. A comp that reshuffles cannot be judged, and
     neither can a home page that does — the same notes must land in the
     same places on every load. */
  function seedOf(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      /* Math.imul, not `h * 16777619`: the plain multiply overflows past
         2^53 and JS silently drops the low bits, so every seed came out
         a multiple of 4 and `seed % 4` picked colour 0 every single
         time. Thirteen notes, one colour, and it looked deliberate. */
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function fieldLayout(notes, rect, cols) {
    var rows = Math.max(1, Math.ceil(notes.length / cols) - 1);
    var spanX = rect.x1 - rect.x0;
    var spanY = rect.y1 - rect.y0;
    return notes.map(function (n, i) {
      var s = seedOf(n.path);
      var col = i % cols, row = Math.floor(i / cols);
      var jx = ((s % 1000) / 1000 - .5) * (spanX / (cols * 1.6));
      var jy = (((s >> 10) % 1000) / 1000 - .5) * (spanY / (rows * 1.7 || 1));
      return {
        x: rect.x0 + (cols === 1 ? spanX / 2 : col * spanX / (cols - 1)) + jx,
        y: rect.y0 + row * spanY / rows + jy
      };
    });
  }

  function radiusFor(note) {
    var len = String(note.body || '').length;
    return len > 6000 ? 11 : len > 2500 ? 8.5 : len > 900 ? 6.5 : 5;
  }

  var PALETTE = ['var(--node-a)', 'var(--node-b)', 'var(--node-c)', 'var(--node-d)'];

  /* ---------------- helpers ---------------- */

  function svg(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) {
      el.setAttribute(k, attrs[k]);
    }
    return el;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------------- mount ---------------- */

  function mount(el, opts) {
    opts = opts || {};
    var data = opts.data || global.PNVaultPublic || { notes: [] };
    var notes = (data.notes || []).slice();
    if (!notes.length) {
      el.classList.add('obs');
      el.innerHTML = '<p style="padding:28px;font-family:ui-monospace,monospace;font-size:12px;color:#7a8392">' +
        'No published snapshot to draw. Run <b>node tools/obsidian-sync.js --public</b>.</p>';
      return { open: function () {}, close: function () {}, destroy: function () {}, state: function () { return 'empty'; } };
    }

    var byTitle = index(notes);
    var reduced = false;
    try { reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* older */ }

    /* edges, as unique undirected pairs — the same count the status bar
       and PNGraphify report, so nothing on the page can disagree */
    var edges = [];
    var seenPair = {};
    notes.forEach(function (n, i) {
      outgoing(n, byTitle).forEach(function (t) {
        var j = notes.indexOf(t);
        var key = [Math.min(i, j), Math.max(i, j)].join(':');
        if (j >= 0 && !seenPair[key]) { seenPair[key] = 1; edges.push([i, j]); }
      });
    });

    var G = pickGeometry(el, opts.orientation);
    var sealed = fieldLayout(notes, G.body, G.cols);
    var inside = insideLayout(notes, G);
    var live = sealed.map(function (p) { return { x: p.x, y: p.y, r: 0 }; });

    el.classList.add('obs');
    el.setAttribute('data-state', 'sealed');
    el.setAttribute('data-depth', opts.depth === 'dusk' ? 'dusk' : 'deep');
    el.style.setProperty('--cork-pull', G.corkPull);
    el.innerHTML = markup(G, notes, edges, data);

    var root = el.querySelector('svg');
    var nodeEls = Array.prototype.slice.call(el.querySelectorAll('.obs-node'));
    var edgeEls = Array.prototype.slice.call(el.querySelectorAll('.obs-edge'));
    var pulseEls = Array.prototype.slice.call(el.querySelectorAll('.obs-pulse'));

    notes.forEach(function (n, i) {
      live[i].r = radiusFor(n);
      place(i, sealed[i].x, sealed[i].y, live[i].r);
    });
    drawEdges();

    function place(i, x, y, r) {
      live[i].x = x; live[i].y = y; live[i].r = r;
      nodeEls[i].setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
      nodeEls[i].querySelector('.obs-node-core').setAttribute('r', r.toFixed(1));
      nodeEls[i].querySelector('.obs-node-halo').setAttribute('r', (r * 2.6).toFixed(1));
      var label = nodeEls[i].querySelector('.obs-label');
      if (label) label.setAttribute('x', (r + 11).toFixed(1));
    }

    function drawEdges() {
      edges.forEach(function (e, k) {
        var a = live[e[0]], b = live[e[1]];
        var d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
        edgeEls[k].setAttribute('d', d);
        if (pulseEls[k]) pulseEls[k].setAttribute('d', d);
      });
    }

    /* ---- the morph: phase A's finding, made real ---- */
    var raf = null;
    var state = 'sealed';

    function morph(to, done) {
      if (raf) cancelAnimationFrame(raf);
      var from = live.map(function (p) { return { x: p.x, y: p.y, r: p.r }; });
      var target = notes.map(function (n, i) {
        var base = to === 'inside' ? inside[i] : sealed[i];
        return { x: base.x, y: base.y, r: radiusFor(n) * (to === 'inside' ? 1.5 : 1) };
      });
      if (reduced) {
        target.forEach(function (t, i) { place(i, t.x, t.y, t.r); });
        drawEdges();
        if (done) done();
        return;
      }
      var start = performance.now();
      var DUR = 950;
      (function step(now) {
        var t = Math.min(1, (now - start) / DUR);
        var e = easeInOut(t);
        for (var i = 0; i < target.length; i += 1) {
          /* Each node travels its own path — that is why this reads as
             the bottle opening out rather than a cross-fade. */
          place(i,
            from[i].x + (target[i].x - from[i].x) * e,
            from[i].y + (target[i].y - from[i].y) * e,
            from[i].r + (target[i].r - from[i].r) * e);
        }
        drawEdges();
        if (t < 1) raf = requestAnimationFrame(step);
        else { raf = null; if (done) done(); }
      }(start));
    }

    function open() {
      if (state === 'inside') return;
      state = 'opening';
      el.setAttribute('data-state', 'opening');
      /* the cork travels first, then the vault comes out after it */
      setTimeout(function () {
        el.setAttribute('data-state', 'inside');
        morph('inside');
        state = 'inside';
      }, reduced ? 0 : 260);
    }

    function close() {
      if (state === 'sealed') return;
      state = 'sealed';
      el.setAttribute('data-state', 'sealed');
      morph('sealed');
    }

    var pull = el.querySelector('.obs-pull');
    var surface = el.querySelector('.obs-surface');
    if (pull) pull.addEventListener('click', open);
    if (surface) surface.addEventListener('click', close);

    /* The whole bottle is the target, not just the cork — a 54px cork is
       a cruel click target and the affordance is the object. */
    var hit = el.querySelector('.obs-hit');
    if (hit) hit.addEventListener('click', function () { if (state === 'sealed') open(); });

    nodeEls.forEach(function (g, i) {
      g.addEventListener('click', function (event) {
        event.stopPropagation();
        if (state !== 'inside') { open(); return; }
        if (opts.onOpen) opts.onOpen(notes[i]);
      });
      g.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); g.click(); }
      });
    });

    function onKey(event) {
      if (event.key === 'Escape' && state === 'inside') { event.preventDefault(); close(); }
    }
    document.addEventListener('keydown', onKey);

    /* Re-mount on an orientation flip: the two compositions are
       different drawings, so this is a rebuild, not a reflow. */
    var currentId = G.id;
    function onResize() {
      var next = pickGeometry(el, opts.orientation);
      if (next.id === currentId) return;
      destroy();
      mount(el, opts);
    }
    global.addEventListener('resize', onResize);

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      global.removeEventListener('resize', onResize);
      el.innerHTML = '';
      el.classList.remove('obs');
    }

    return {
      open: open, close: close, destroy: destroy,
      state: function () { return state; },
      stats: function () { return { notes: notes.length, links: edges.length }; }
    };
  }

  function pickGeometry(el, forced) {
    if (forced === 'portrait') return PORTRAIT;
    if (forced === 'landscape') return LANDSCAPE;
    var r = el.getBoundingClientRect();
    return (r.width && r.height && r.width / r.height < 0.92) ? PORTRAIT : LANDSCAPE;
  }

  /* Inside: the same notes spread across the whole frame at readable
     size. Deliberately generous margins — the rim vignette eats the
     corners, and a note lost under the glass edge is a note nobody can
     click. */
  function insideLayout(notes, G) {
    var W = G.vb.w, H = G.vb.h;
    /* Portrait drops to two columns and uses the full height. Three
       columns fit the *nodes* but not their labels: a slice crop takes
       ~50 viewBox units off each side on a phone, and the third column's
       filenames ran straight off the glass.

       Asymmetric margins on both: a label sits to the RIGHT of its node,
       so that side has to carry the widest filename plus the rim
       vignette, or the last column reads as half-erased. */
    var portrait = G.id === 'portrait';
    var cols = portrait ? 2 : 5;
    var rect = {
      x0: W * (portrait ? .16 : .14),
      x1: W * (portrait ? .40 : .70),
      y0: H * (portrait ? .16 : .20),
      y1: H * (portrait ? .88 : .78)
    };
    return fieldLayout(notes, rect, cols);
  }

  /* ---------------- markup ---------------- */

  function markup(G, notes, edges, data) {
    var vb = [G.vb.x, G.vb.y, G.vb.w, G.vb.h].join(' ');
    var W = G.vb.w, H = G.vb.h;

    var shafts = '';
    [[.12, .18], [.46, .13], [.80, .16]].forEach(function (s) {
      var x = W * s[0], w = W * s[1];
      shafts += '<path class="obs-shaft" d="M' + x + ' 0 L' + (x - w * .35) + ' ' + H +
        ' L' + (x + w * .75) + ' ' + H + ' L' + (x + w) + ' 0 Z" fill="url(#obs-shaft)"/>';
    });

    var caustics =
      '<path class="obs-caustic" d="M0 ' + G.floor + ' q' + (W / 12) + ' -20 ' + (W / 6) + ' 0 ' +
        't' + (W / 6) + ' 0 t' + (W / 6) + ' 0 t' + (W / 6) + ' 0 t' + (W / 6) + ' 0 t' + (W / 6) + ' 0"/>' +
      '<path class="obs-caustic" d="M0 ' + (G.floor + 30) + ' q' + (W / 10) + ' -16 ' + (W / 5) + ' 0 ' +
        't' + (W / 5) + ' 0 t' + (W / 5) + ' 0 t' + (W / 5) + ' 0 t' + (W / 5) + ' 0"/>';

    var bubbles = G.bubbles.map(function (b, i) {
      return '<circle class="obs-bubble" cx="' + b[0] + '" cy="' + b[1] + '" r="' + (2 + i * .8) +
        '" fill="var(--glass-edge)" style="animation-delay:' + (i * 2.6) + 's"/>';
    }).join('');

    var s = G.ship.s;
    /* Same nesting rule as the nodes: position on the outer group,
       animate the inner one, or the bob keyframe throws the ship to
       the top-left corner of the viewBox. */
    var ship =
      '<g transform="translate(' + G.ship.x + ',' + G.ship.y + ') scale(' + s + ')">' +
      '<g class="obs-ship">' +
        '<path d="M-30 0 h60 l-10 16 h-40 z" fill="var(--hull)"/>' +
        '<path d="M2 0 v-52 l34 37 z" fill="var(--sail)"/>' +
        '<path d="M-2 0 v-52 l-28 31 z" fill="#d8cbab"/>' +
        '<line x1="0" y1="-54" x2="0" y2="3" stroke="#8a7a58" stroke-width="2.2"/>' +
        '<path d="M-30 18 h60 l-8 10 h-44 z" fill="var(--hull)" opacity=".14"/>' +
      '</g></g>';

    var edgeD = edges.map(function () { return '<path class="obs-edge" fill="none"/>'; }).join('');
    var pulseD = edges.map(function (e, i) {
      return '<path class="obs-pulse" fill="none" stroke="var(--glass-edge)" stroke-width="3" ' +
        'stroke-linecap="round" style="animation-delay:' + ((i * 1.7) % 9).toFixed(1) + 's"/>';
    }).join('');

    var nodes = notes.map(function (n, i) {
      var c = PALETTE[seedOf(n.path) % PALETTE.length];
      var name = esc(n.path.split('/').pop().replace(/\.(md|markdown)$/i, ''));
      /* Two nested groups on purpose. A CSS animation's `transform`
         beats the SVG `transform` *attribute* — so animating drift on
         the same element that carries the position snaps every node to
         the origin the moment its delay elapses. The outer group is
         positioned by script; only the inner one is ever animated. */
      return '<g class="obs-node" tabindex="0" role="button" aria-label="' + esc(n.title) + '">' +
          '<g class="obs-drift" style="animation-delay:' + ((i * 1.3) % 7).toFixed(1) + 's">' +
            '<circle class="obs-node-halo" r="12" fill="' + c + '"/>' +
            '<circle class="obs-node-core" r="6" fill="' + c + '"/>' +
            '<text class="obs-label" x="14" y="4">' + name + '</text>' +
          '</g>' +
        '</g>';
    }).join('');

    var rims = G.rims.map(function (r) {
      return '<path d="' + r.d + '" fill="none" stroke="#fff" stroke-opacity="' + r.o +
        '" stroke-width="' + r.w + '" stroke-linecap="round"/>';
    }).join('');

    var pullStyle = 'right:' + G.pull.right + ';top:' + G.pull.top + ';left:' + G.pull.left +
      ';bottom:' + G.pull.bottom + ';text-align:' + G.pull.align +
      (G.pull.left === '50%' ? ';transform:translateX(-50%)' : '');

    return '' +
      '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="obs-sea" cx="50%" cy="46%" r="78%">' +
            '<stop offset="0%" stop-color="var(--sea-far)"/>' +
            '<stop offset="100%" stop-color="var(--sea-near)"/>' +
          '</radialGradient>' +
          '<linearGradient id="obs-shaft" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--shaft)" stop-opacity="var(--shaft-a)"/>' +
            '<stop offset="100%" stop-color="var(--shaft)" stop-opacity="0"/>' +
          '</linearGradient>' +
          /* Glass is three stops, not two: bright where the curve turns
             away at the top, nearly clear through the belly, bright
             again at the bottom where the sea floor reflects up. */
          '<linearGradient id="obs-glass" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--glass)" stop-opacity=".26"/>' +
            '<stop offset="24%" stop-color="var(--glass)" stop-opacity=".08"/>' +
            '<stop offset="70%" stop-color="var(--glass)" stop-opacity=".04"/>' +
            '<stop offset="100%" stop-color="var(--glass)" stop-opacity=".22"/>' +
          '</linearGradient>' +
          '<linearGradient id="obs-cork" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--cork)"/>' +
            '<stop offset="55%" stop-color="var(--cork-dark)"/>' +
            '<stop offset="100%" stop-color="var(--cork)"/>' +
          '</linearGradient>' +
          '<radialGradient id="obs-rim" cx="50%" cy="50%" r="62%">' +
            '<stop offset="50%" stop-color="#000" stop-opacity="0"/>' +
            '<stop offset="86%" stop-color="var(--sea-near)" stop-opacity=".7"/>' +
            '<stop offset="100%" stop-color="#000" stop-opacity=".93"/>' +
          '</radialGradient>' +
          '<filter id="obs-glow" x="-60%" y="-60%" width="220%" height="220%">' +
            '<feGaussianBlur stdDeviation="5" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
          '</filter>' +
          '<clipPath id="obs-clip"><path d="' + G.bottle + '"/></clipPath>' +
        '</defs>' +

        '<rect width="' + W + '" height="' + H + '" fill="url(#obs-sea)"/>' +
        shafts +
        '<g stroke="var(--shaft)" stroke-opacity="var(--caustic-a)" stroke-width="2" fill="none">' +
          caustics +
        '</g>' +

        /* the vault. Drawn OUTSIDE the bottle group so that when the
           glass fades on open, the notes stay exactly where they are and
           simply travel — no re-parenting, no flicker. */
        '<g clip-path="url(#obs-clip)" class="obs-inner">' +
          '<path d="' + G.water + '" fill="var(--sea-near)" opacity=".45"/>' +
          ship + bubbles +
        '</g>' +
        '<g class="obs-graph">' +
          '<g stroke="var(--link)" stroke-opacity="var(--link-a)" stroke-width="1.2">' + edgeD + '</g>' +
          '<g>' + pulseD + '</g>' +
          '<g filter="url(#obs-glow)">' + nodes + '</g>' +
        '</g>' +

        '<g class="obs-bottle">' +
          '<path d="' + G.bottle + '" fill="url(#obs-glass)" stroke="var(--glass)" ' +
            'stroke-opacity=".45" stroke-width="2"/>' +
          rims +
          '<path class="obs-glint" d="' + G.glint + '" fill="none" stroke="#fff" ' +
            'stroke-width="6" stroke-linecap="round"/>' +
          '<rect class="obs-cork" x="' + G.cork.x + '" y="' + G.cork.y + '" width="' + G.cork.w +
            '" height="' + G.cork.h + '" rx="' + G.cork.r + '" fill="url(#obs-cork)"/>' +
          '<path class="obs-hit" d="' + G.bottle + '" fill="transparent" style="cursor:pointer"/>' +
        '</g>' +

        '<rect class="obs-rim" width="' + W + '" height="' + H + '" fill="url(#obs-rim)" ' +
          'pointer-events="none"/>' +
      '</svg>' +

      '<button type="button" class="obs-pull" style="' + pullStyle + '">' +
        '<span class="obs-ring" aria-hidden="true"></span>Pull the cork' +
        '<small>' + notes.length + ' notes are inside</small>' +
      '</button>' +
      '<button type="button" class="obs-surface">↑ Back to the surface</button>' +
      '<div class="obs-readout">' +
        '<span><b>' + notes.length + '</b> notes</span>' +
        '<span><b>' + edges.length + '</b> links</span>' +
        '<span>' + (notes.length ? (edges.length * 2 / notes.length).toFixed(1) : '0.0') + ' per note</span>' +
        '<span>' + esc(data.label || '') + '</span>' +
      '</div>';
  }

  global.PNObservatory = { mount: mount };
}(window));
