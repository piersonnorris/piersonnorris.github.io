/* ============================================================
   PNJar — the vault as fireflies in one jar.

     PNJar.mount(el, {data, cap, onOpen, onSelect}) → controller

   One firefly per note. Everything you can see about a firefly is
   read off the vault; nothing here is decorative-only:

     cluster  → hue          (communities, via PNVaultGroups)
     degree   → size + brightness   (a hub is heavy and bright)
     recency  → flicker rate (recent notes pulse, stale ones ember)
     orphan   → dark, drifting alone, still counted
     missing  → a firefly flying at nothing, winking out at the edge

   Structure comes from PNGraphify, so the counts etched on the glass
   and the counts on /vault/ agree by construction.

   ---- two states, and the walk between them ----

   SEALED  the jar stands on its shelf, lid on, swarm inside the glass
   OPEN    the lid lifts, the swarm pours out through the mouth and
           spreads across the whole scene; the jar demotes to a rim
           vignette and the shelf it stands on

   OPEN is a second layout, not a zoom. The Observatory learned that
   the expensive way: pushing a camera in inflates the nodes and
   leaves half the vault off-screen, so the vault disappears at the
   moment you arrive in it. Every firefly walks its own path instead
   — and here that path runs through the jar's mouth, because a
   firefly leaving a jar goes out of the opening, not through the
   glass.

   Two rules inherited from that build, both learned the hard way:

     1. Position and animation live on SEPARATE nested groups. A CSS
        animation on the same element the script positions snaps it
        to the viewBox origin the instant its delay elapses.
     2. Nothing enters the shoulder or the neck while sealed, where
        the glass curve is tightest and the clip slices a node.

   prefers-reduced-motion is a path, not a switch: the morph becomes
   an instant placement, drift stops, flicker becomes a static
   brightness. The page still works; it just stops moving.

   ---- coordinates ----

   The svg's viewBox is the scene in CSS pixels, so 1 unit = 1px and
   nothing distorts at any aspect. The jar is drawn in its own 460 ×
   748 space inside <g class="jar-world">, and the swarm lives in
   that same jar space — which is what lets one clip path hold the
   fireflies in while sealed and one transform place the whole jar.
   ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* ---- geometry, in jar units. One jar, standing on a plank.

     Proportioned off a real regular-mouth quart jar: body a shade
     wider than it is tall over four (296 × 390, ratio 1.32), mouth
     at 68% of the body. The first pass drew it narrow and tall and
     it read as a bottle — which is the other page's object. ---- */
  var VIEW = { w: 460, h: 748 };

  var BODY = [
    'M 130 118', 'L 330 118', 'L 330 152',
    'C 352 166 370 196 376 240',
    'C 379 300 380 380 380 452',
    'C 380 530 377 588 372 622',
    'C 369 645 350 658 320 659',
    'L 140 659',
    'C 110 658 91 645 88 622',
    'C 83 588 80 530 80 452',
    'C 80 380 81 300 84 240',
    'C 90 196 108 166 130 152',
    'Z'
  ].join(' ');

  var CX = 230;
  var FLY_TOP = 262;      /* below the shoulder — rule 2 */
  var FLY_BOT = 616;
  var PLANK_Y = 659;
  var MOUTH = { x: CX, y: 96 };   /* where the swarm pours out */

  /* The six domain hues already in atlas-data.js, so a note's identity
     colour survives being grouped. Shifted per cluster, not replaced. */
  var HUES = ['#E8A33D', '#5FAE5A', '#4CC9F0', '#c084fc', '#37d7c2', '#a9bcd6'];
  var DARK = '#7286a3';   /* orphans: lit enough to be seen, not to glow */

  var CAP = 90;              /* fireflies drawn before we start ranking */
  var RECENCY_FLOOR = 36e5;  /* under an hour of spread is not a signal */
  var LABEL_MAX = 24;        /* labels shown in OPEN before it reads as soup */
  var MORPH_MS = 1150;
  var STAGGER_MS = 26;

  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function stamp(v) { var t = Date.parse(v || ''); return isFinite(t) ? t : 0; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  /* Half the interior width available to a firefly at height y. The jar
     bellies out very slightly and pulls in hard over the base curve. */
  function halfWidth(y) {
    if (y <= FLY_TOP || y >= FLY_BOT) return 0;
    var t = (y - FLY_TOP) / (FLY_BOT - FLY_TOP);
    var w = 126 + Math.sin(Math.PI * t) * 8;
    if (t < 0.08) w -= ((0.08 - t) / 0.08) * 26;   /* under the shoulder */
    if (t > 0.90) w -= ((t - 0.90) / 0.10) * 34;   /* over the base curve */
    return Math.max(18, w);
  }

  // ------------------------------------------------------------- the model

  function build(notes, cap) {
    var G = global.PNGraphify, V = global.PNVaultGroups;
    if (!G) throw new Error('PNJar needs PNGraphify — load assets/js/notes-graph.js');
    if (!V) throw new Error('PNJar needs PNVaultGroups — load assets/js/vault-groups.js');

    var model = G.build(notes, { tags: false, missing: true });
    var grouped = V.groups(notes);

    var noteNodes = model.nodes.filter(function (n) { return n.kind === 'note'; });

    var times = notes.map(function (n) { return stamp(n.updated || n.created); })
      .filter(function (t) { return t > 0; });
    var lo = times.length ? Math.min.apply(null, times) : 0;
    var hi = times.length ? Math.max.apply(null, times) : 0;
    /* If every note carries the same timestamp — which is exactly what a
       fresh git checkout produces, since git does not preserve mtime —
       then recency is not a signal and we must not draw one. Every
       firefly breathes at the same rate and the readout says why. */
    var recencyReal = (hi - lo) > RECENCY_FLOOR;

    var items = noteNodes.map(function (node, i) {
      var note = notes[i] || {};
      var c = grouped.of[i];
      var orphan = node.links === 0;
      var age = recencyReal ? (stamp(note.updated || note.created) - lo) / (hi - lo) : 0.5;
      return {
        i: i,
        id: node.id,
        title: node.label,
        path: note.path || '',
        folder: note.folder || '',
        links: node.links,
        cluster: c,
        orphan: orphan,
        hue: orphan ? DARK : HUES[((c < 0 ? 0 : c) % HUES.length)],
        /* degree drives every "how much" — size, glow, brightness */
        r: 2.9 + Math.min(5.1, node.links * 0.62),
        bright: orphan ? 0.32 : 0.52 + Math.min(0.44, node.links * 0.062),
        /* recent notes pulse quickly, stale ones fade to a slow ember */
        flicker: recencyReal ? (5.2 - age * 3.2) : 4.0
      };
    });

    /* Cap, ranked by degree then recency — never a silent truncation. */
    var total = items.length;
    var shown = items;
    if (total > cap) {
      shown = items.slice().sort(function (a, b) {
        return (b.links - a.links) || (b.flicker - a.flicker) || (a.i - b.i);
      }).slice(0, cap);
    }

    /* Which fireflies get a name in OPEN. All of them, until that stops
       being legible; then the most-connected, and the readout says how
       many are named. A hundred overlapping labels is not a label. */
    var ranked = shown.slice().sort(function (a, b) {
      return (b.links - a.links) || (a.i - b.i);
    });
    /* Rank now, decide how many of those names actually fit later —
       that depends on the size of the scene, which mount() has not
       measured yet. A phone cannot hold what a desktop can. */
    ranked.forEach(function (it, n) {
      it.rank = n;
      it.named = n < LABEL_MAX;
      it.short = V.shortTitle(it.title);
    });

    return {
      items: shown,
      total: total,
      capped: total > cap,
      labelled: Math.min(shown.length, LABEL_MAX),
      clusters: grouped.clusters,
      groupStats: grouped.stats,
      recencyReal: recencyReal,
      stats: model.stats,
      /* id → neighbour ids, for step 4's highlighting */
      near: model.links.reduce(function (a, l) {
        (a[l.source] || (a[l.source] = [])).push(l.target);
        (a[l.target] || (a[l.target] = [])).push(l.source);
        return a;
      }, {})
    };
  }

  // ------------------------------------------------------ layout: SEALED

  /* Fireflies sorted into their real clusters, so the jar reads as
     several glowing masses rather than soup. Seeded — a jar that
     reshuffles on reload cannot be judged, and neither can a page. */
  function layoutSealed(m) {
    var R = rng(0x3A12), i;
    var items = m.items;
    var midY = (FLY_TOP + FLY_BOT) / 2;

    var k = Math.max(1, m.clusters.length);
    var centre = {};
    for (i = 0; i < k; i++) {
      var a = i * 2.39996323;
      var rad = k === 1 ? 0 : 46 + 20 * Math.sqrt(i);
      centre[i] = { x: CX + Math.cos(a) * rad, y: midY + Math.sin(a) * rad * 0.9 };
    }

    items.forEach(function (item) {
      var home = centre[item.cluster] || { x: CX, y: midY };
      var size = item.cluster >= 0 && m.clusters[item.cluster] ? m.clusters[item.cluster].size : 3;
      var spread = 34 + Math.sqrt(size) * 26;
      var ang = R() * Math.PI * 2;
      var dist = Math.sqrt(R()) * spread;
      item.hx = home.x + Math.cos(ang) * dist;
      item.hy = home.y + Math.sin(ang) * dist * 1.18;

      /* Orphans drift alone — pushed out to the quiet edges, low in the
         jar, away from whatever mass they are not part of. */
      if (item.orphan) {
        item.hx = CX + (R() < 0.5 ? -1 : 1) * (58 + R() * 40);
        item.hy = FLY_TOP + 40 + R() * (FLY_BOT - FLY_TOP - 70);
      }

      /* Its own seeded drift path — never the same loop twice over. */
      item.ax = 6 + R() * 11;
      item.ay = 5 + R() * 9;
      item.sx = 0.16 + R() * 0.22;
      item.sy = 0.13 + R() * 0.20;
      item.px = R() * Math.PI * 2;
      item.py = R() * Math.PI * 2;
    });

    relax(items, Math.max(15, 210 / Math.sqrt(Math.max(1, items.length))), 110, clampSealed);
    return m;
  }

  // -------------------------------------------------------- layout: OPEN

  /* The second composition. Clusters spread across the whole scene at
     readable scale, still in jar coordinates so one transform places
     everything. `rect` is the visible scene expressed in those units. */
  function layoutOpen(m, rect, fontSize, avoid) {
    var R = rng(0x71C4);
    var items = m.items;
    var n = Math.max(1, items.length);
    var pad = 44;
    var fs = fontSize || 11.5;
    var x0 = rect.x0 + pad, x1 = rect.x1 - pad;
    var y0 = rect.y0 + pad;
    /* The shelf survives into OPEN — it is the half of the jar you
       keep — so the swarm has to stay in the room above it rather
       than sinking through the wood. */
    var y1 = Math.min(rect.y1 - pad, PLANK_Y - 26);
    var w = Math.max(120, x1 - x0), h = Math.max(120, y1 - y0);
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;

    var k = Math.max(1, m.clusters.length);
    var centre = {}, i;
    for (i = 0; i < k; i++) {
      /* Golden angle, squashed to the scene's aspect so clusters land
         across the width rather than in a ring in the middle. Radius
         is linear in i, not sqrt: sqrt bunches the first few clusters
         at the centre, and the first few are the big ones. */
      var a = i * 2.39996323;
      var t = k === 1 ? 0 : (i + 0.55) / k;
      centre[i] = {
        x: mx + Math.cos(a) * t * w * 0.44,
        y: my + Math.sin(a) * t * h * 0.42
      };
    }

    items.forEach(function (item) {
      var home = centre[item.cluster] || { x: mx, y: my };
      var size = item.cluster >= 0 && m.clusters[item.cluster] ? m.clusters[item.cluster].size : 3;
      /* A cluster's blob is sized by its share of the swarm, so a
         community of sixty reads as a bigger part of the room than a
         community of four — which is the true thing to say about it. */
      var spread = Math.sqrt(size / n) * Math.min(w, h) * 0.46 + 26;
      var ang = R() * Math.PI * 2;
      var dist = Math.sqrt(R()) * spread;
      item.ox = home.x + Math.cos(ang) * dist;
      item.oy = home.y + Math.sin(ang) * dist * 0.82;

      /* Orphans still drift alone: out at the margins, where nothing
         else is, because nothing links them to anything else. */
      if (item.orphan) {
        item.ox = R() < 0.5 ? x0 + R() * w * 0.15 : x1 - R() * w * 0.15;
        item.oy = y0 + R() * h;
      }

      /* A firefly is a dot, but a named one is as wide as its name.
         Clamping the dot inside the scene still runs the label off the
         edge — and it is the orphans, pushed to the margins by the line
         above, that carry some of the longest titles. */
      item.half = item.named ? Math.min(w * 0.22, item.short.length * fs * 0.32) : item.r;
    });

    /* Named fireflies need room for their name, not just their glow.
       Separation is set from the room each one actually has, so the
       swarm fills the scene at thirteen and stays legible at ninety. */
    var lim = { x0: x0, y0: y0, x1: x1, y1: y1 };
    relax(items, Math.sqrt(w * h / n) * 0.60, 140, function (it) {
      it.ox = clamp(it.ox, x0 + it.half, x1 - it.half);
      it.oy = clamp(it.oy, y0, y1);
      keepClear(it, avoid, 'o', lim);
    }, 'o');

    return lim;
  }

  /* The copy and the readout sit on top of the swarm, and a firefly
     behind a panel is a note the page is hiding. Push anything that
     lands under one out by its nearest edge — settled inside the relax
     loop, so avoidance and separation resolve together rather than
     fighting each other. */
  function keepClear(it, avoid, field, lim) {
    if (!avoid || !avoid.length) return;
    var fx = field + 'x', fy = field + 'y';
    for (var i = 0; i < avoid.length; i++) {
      var a = avoid[i];
      var pad = it.half || it.r;
      var x0 = a.x0 - pad, x1 = a.x1 + pad, y0 = a.y0 - it.r, y1 = a.y1 + it.r;
      if (it[fx] <= x0 || it[fx] >= x1 || it[fy] <= y0 || it[fy] >= y1) continue;

      /* The nearest edge is often the one with no room behind it — the
         copy panel sits against the left of the scene, so pushing a
         firefly out of its left side puts the firefly off-screen, and
         the bounds clamp then slides it straight back under the panel.
         Consider only the edges it can actually reach. No allocation:
         this runs per node per frame. */
      var bd = Infinity, bx = 0, by = 0, d;
      if (!lim || x0 >= lim.x0 + pad) { d = it[fx] - x0; if (d < bd) { bd = d; bx = x0; by = 0; } }
      if (!lim || x1 <= lim.x1 - pad) { d = x1 - it[fx]; if (d < bd) { bd = d; bx = x1; by = 0; } }
      if (!lim || y0 >= lim.y0 + it.r) { d = it[fy] - y0; if (d < bd) { bd = d; bx = 0; by = y0; } }
      if (!lim || y1 <= lim.y1 - it.r) { d = y1 - it[fy]; if (d < bd) { bd = d; bx = 0; by = y1; } }

      if (bd === Infinity) continue;    /* boxed in: leave it where it is */
      if (by) it[fy] = by; else it[fx] = bx;
    }
  }

  /* Shared separation pass. `field` picks which pair of coordinates to
     push apart, so SEALED and OPEN use one implementation. */
  function relax(items, want0, passes, fit, field) {
    var fx = (field || 'h') + 'x', fy = (field || 'h') + 'y';
    for (var pass = 0; pass < passes; pass++) {
      for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
          var a = items[i], b = items[j];
          var dx = b[fx] - a[fx], dy = b[fy] - a[fy];
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var want = (a.r + b.r) * 1.4 + want0;
          if (d < want) {
            var push = (want - d) / d * 0.5;
            a[fx] -= dx * push; a[fy] -= dy * push;
            b[fx] += dx * push; b[fy] += dy * push;
          }
        }
      }
      for (i = 0; i < items.length; i++) fit(items[i]);
    }
  }

  function clampSealed(it) {
    it.hy = clamp(it.hy, FLY_TOP + it.r + 4, FLY_BOT - it.r - 4);
    var w = halfWidth(it.hy) - it.r - 3;
    var off = it.hx - CX;
    if (Math.abs(off) > w) it.hx = CX + (off < 0 ? -w : w);
  }

  // ------------------------------------------------------------ the drawing

  function scene(m) {
    var s = m.stats;

    /* One glow gradient per cluster hue — a blur filter on ninety nodes
       is the one thing here that would cost real frames. */
    var hues = {};
    m.items.forEach(function (it) { hues[it.hue] = 1; });
    var defs = Object.keys(hues).map(function (hue, i) {
      return '<radialGradient id="jar-glow-' + i + '">' +
        '<stop offset="0" stop-color="' + hue + '" stop-opacity=".70"/>' +
        '<stop offset=".34" stop-color="' + hue + '" stop-opacity=".22"/>' +
        '<stop offset="1" stop-color="' + hue + '" stop-opacity="0"/>' +
        '</radialGradient>';
    }).join('');

    return '' +
      '<svg class="jar-svg" role="img" ' +
      'aria-label="A mason jar standing on a shelf at night. ' +
      esc(s.notes) + ' fireflies drift inside it, one for each note in the vault.">' +

      '<defs>' + defs +
        /* three stops: bright where the curve turns away at each edge,
           nearly clear straight through the belly */
        '<linearGradient id="jar-glass" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#e4f3fb" stop-opacity=".40"/>' +
          '<stop offset=".07" stop-color="#cfe9f4" stop-opacity=".13"/>' +
          '<stop offset=".45" stop-color="#8fb6cc" stop-opacity=".03"/>' +
          '<stop offset=".66" stop-color="#8fb6cc" stop-opacity=".04"/>' +
          '<stop offset=".93" stop-color="#cfe9f4" stop-opacity=".17"/>' +
          '<stop offset="1" stop-color="#e4f3fb" stop-opacity=".42"/>' +
        '</linearGradient>' +
        /* the swarm's own light, pooling low in the jar */
        '<radialGradient id="jar-wash" cx=".5" cy=".70" r=".66">' +
          '<stop offset="0" stop-color="#ffd694" stop-opacity=".26"/>' +
          '<stop offset=".5" stop-color="#ffb347" stop-opacity=".085"/>' +
          '<stop offset="1" stop-color="#ffb347" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="jar-spec" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>' +
          '<stop offset=".42" stop-color="#ffffff" stop-opacity=".62"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</linearGradient>' +
        /* the screw band: brass, lit from the top left, so it reads as
           metal rather than as a block of the island's timber */
        '<linearGradient id="jar-lid" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#d8b478"/>' +
          '<stop offset=".16" stop-color="#a87f48"/>' +
          '<stop offset=".46" stop-color="#6d4f2c"/>' +
          '<stop offset=".78" stop-color="#8a6438"/>' +
          '<stop offset="1" stop-color="#3d2917"/>' +
        '</linearGradient>' +
        '<linearGradient id="jar-disc" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#e6dfc4" stop-opacity=".9"/>' +
          '<stop offset=".42" stop-color="#9a916f" stop-opacity=".85"/>' +
          '<stop offset=".68" stop-color="#cfc6a4" stop-opacity=".9"/>' +
          '<stop offset="1" stop-color="#6f684d" stop-opacity=".95"/>' +
        '</linearGradient>' +
        '<linearGradient id="jar-plank" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#6b4a2c"/>' +
          '<stop offset="1" stop-color="#3d2917"/>' +
        '</linearGradient>' +
        '<radialGradient id="jar-pool" cx=".5" cy=".5" r=".5">' +
          '<stop offset="0" stop-color="#ffc46b" stop-opacity=".26"/>' +
          '<stop offset="1" stop-color="#ffc46b" stop-opacity="0"/>' +
        '</radialGradient>' +
        /* what the glass becomes once you are inside it */
        '<radialGradient id="jar-vig" cx=".5" cy=".5" r=".72">' +
          '<stop offset=".52" stop-color="#04060f" stop-opacity="0"/>' +
          '<stop offset=".82" stop-color="#04060f" stop-opacity=".42"/>' +
          '<stop offset="1" stop-color="#04060f" stop-opacity=".82"/>' +
        '</radialGradient>' +
        '<clipPath id="jar-inside"><path d="' + BODY + '"/></clipPath>' +
      '</defs>' +

      '<g class="jar-world">' +

        '<g class="jar-motes" aria-hidden="true"></g>' +

        /* ---- the shelf it stands on ----
           Drawn far outside the jar's own box on purpose, so it runs off
           both edges of the page instead of stopping in mid-air — the
           difference between a jar in a room and a jar in a box. */
        '<g class="jar-plank" aria-hidden="true">' +
          '<ellipse class="pool" cx="' + CX + '" cy="' + (PLANK_Y + 12) + '" rx="330" ry="40" fill="url(#jar-pool)"/>' +
          '<path d="M -1400 ' + PLANK_Y + ' H 1860 V ' + (PLANK_Y + 15) + ' H -1400 Z" fill="#6b4a2c"/>' +
          '<path d="M -1400 ' + (PLANK_Y + 15) + ' H 1860 V ' + (PLANK_Y + 58) + ' H -1400 Z" fill="url(#jar-plank)"/>' +
          '<path d="M -1400 ' + PLANK_Y + ' H 1860" stroke="#b98a52" stroke-opacity=".75" stroke-width="1.7"/>' +
          '<path d="M -1400 ' + (PLANK_Y + 15) + ' H 1860" stroke="#241708" stroke-opacity=".7" stroke-width="1.5"/>' +
          '<path d="M -180 ' + (PLANK_Y + 30) + ' H 206" stroke="#2a1c10" stroke-opacity=".5" stroke-width="1.3"/>' +
          '<path d="M 262 ' + (PLANK_Y + 44) + ' H 640" stroke="#2a1c10" stroke-opacity=".42" stroke-width="1.3"/>' +
          '<ellipse class="contact" cx="' + CX + '" cy="' + (PLANK_Y + 3) + '" rx="132" ry="9" fill="#070a12" opacity=".66"/>' +
        '</g>' +

        /* ---- what you see through the glass ---- */
        '<g class="jar-inner">' +
          '<path class="jar-void" d="' + BODY + '" fill="#070b1a"/>' +
          '<rect class="jar-wash" x="74" y="118" width="312" height="560" fill="url(#jar-wash)"/>' +
        '</g>' +

        /* The swarm is clipped to the glass while sealed and cut loose
           the instant the lid lifts. Nothing moves at that moment —
           every firefly is still inside — so the switch is invisible. */
        '<g class="jar-swarmclip" clip-path="url(#jar-inside)">' +
          '<g class="jar-swarm"></g>' +
        '</g>' +

        /* ---- the glass itself: three stops and two marks ---- */
        '<g class="jar-glassgrp" aria-hidden="true">' +
          /* a dark liner under the bright edge, so the silhouette holds
             against a background that is nearly the same value */
          '<path d="' + BODY + '" fill="none" stroke="#04060f" stroke-opacity=".85" stroke-width="4.5"/>' +
          '<path d="' + BODY + '" fill="url(#jar-glass)" stroke="rgba(226,244,253,.72)" stroke-width="1.9"/>' +
          /* mark 1 — one specular sweep down the shoulder */
          '<path class="jar-spec" d="M 101 274 C 94 322 95 366 104 410" ' +
            'stroke="url(#jar-spec)" stroke-width="14" fill="none" stroke-linecap="round"/>' +
          /* mark 2 — one rim light where the base curve catches the shelf */
          '<path class="jar-rim" d="M 88 618 C 92 646 112 658 144 659" ' +
            'stroke="rgba(226,244,253,.62)" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<path class="jar-rim2" d="M 372 620 C 369 645 352 657 322 659" ' +
            'stroke="rgba(226,244,253,.22)" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
          '<path d="M 86 256 C 152 244 308 244 374 256" stroke="rgba(216,238,249,.18)" stroke-width="1.4" fill="none"/>' +
          '<path d="M 83 274 C 150 263 310 263 377 274" stroke="rgba(216,238,249,.12)" stroke-width="1.2" fill="none"/>' +
        '</g>' +

        /* ---- the label, etched into the glass ---- */
        '<g class="jar-label">' +
          '<rect x="126" y="486" width="208" height="118" rx="9" ' +
            'fill="rgba(6,10,22,.60)" stroke="rgba(243,232,202,.24)" stroke-width="1.2"/>' +
          '<rect x="131" y="491" width="198" height="108" rx="6" ' +
            'fill="none" stroke="rgba(243,232,202,.11)" stroke-width="1"/>' +
          '<text class="lb-head" x="' + CX + '" y="514" text-anchor="middle">THE VAULT</text>' +
          '<path d="M 150 524 L 310 524" stroke="rgba(243,232,202,.26)" stroke-width="1"/>' +
          '<text class="lb-row" x="' + CX + '" y="545" text-anchor="middle">' +
            s.notes + ' notes · ' + s.links + ' links</text>' +
          '<text class="lb-row" x="' + CX + '" y="566" text-anchor="middle">' +
            s.density + ' links per note</text>' +
          '<text class="lb-row dim" x="' + CX + '" y="589" text-anchor="middle">' +
            s.orphans + ' orphans · ' + s.missing + ' unresolved</text>' +
        '</g>' +

        /* ---- the lid: the only affordance in the sealed state ----
           It is the control, so it is the button — an overlaid HTML
           button would be wiped the moment mount() rewrites the host. */
        '<g class="jar-lidgrp" role="button" tabindex="0" ' +
          'aria-label="Lift the lid and let the vault out" aria-pressed="false">' +
          '<title>Lift the lid</title>' +
          '<rect class="jar-lidhit" x="112" y="34" width="236" height="98" fill="transparent"/>' +
          '<g class="jar-lid">' +
            '<rect x="124" y="58" width="212" height="64" rx="8" fill="url(#jar-lid)"/>' +
            knurl() +
            '<path d="M 124 76 L 336 76" stroke="rgba(0,0,0,.36)" stroke-width="1.5"/>' +
            '<path d="M 124 106 L 336 106" stroke="rgba(0,0,0,.28)" stroke-width="1.3"/>' +
            '<rect x="130" y="42" width="200" height="24" rx="9" fill="#b1accd"/>' +
            '<rect x="130" y="42" width="200" height="24" rx="9" fill="url(#jar-disc)"/>' +
            '<path d="M 140 50 C 190 44 268 44 320 50" stroke="rgba(255,255,255,.5)" ' +
              'stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
          '</g>' +
        '</g>' +
      '</g>' +

      /* Scene-space, outside the jar's transform: once you are out of
         the glass you are looking through it, so the glass becomes the
         edge of the picture. */
      '<rect class="jar-vignette" x="0" y="0" width="100%" height="100%" ' +
        'fill="url(#jar-vig)" pointer-events="none" aria-hidden="true"/>' +
      '</svg>';
  }

  /* The milled edge of a screw band. Cheap, and it is the detail that
     stops the lid reading as a brown rectangle. */
  function knurl() {
    var out = '';
    for (var x = 130; x <= 330; x += 6) {
      out += '<path d="M ' + x + ' 80 L ' + x + ' 116" stroke="rgba(0,0,0,.24)" stroke-width="1.6"/>' +
             '<path d="' + ('M ' + (x + 2.4) + ' 80 L ' + (x + 2.4) + ' 116') +
             '" stroke="rgba(255,232,186,.10)" stroke-width="1.2"/>';
    }
    return out;
  }

  // -------------------------------------------------------------- mounting

  function mount(host, opts) {
    opts = opts || {};
    var notes = (opts.data && opts.data.notes) || opts.data || [];
    var cap = opts.cap == null ? CAP : opts.cap;

    var m = layoutSealed(build(notes, cap));
    host.innerHTML = scene(m);

    var svg = host.querySelector('.jar-svg');
    var world = svg.querySelector('.jar-world');
    var swarm = svg.querySelector('.jar-swarm');
    var swarmClip = svg.querySelector('.jar-swarmclip');
    var motes = svg.querySelector('.jar-motes');
    var lid = svg.querySelector('.jar-lidgrp');

    var still = global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var gradOf = {};
    Array.prototype.forEach.call(svg.querySelectorAll('radialGradient[id^="jar-glow-"]'), function (g) {
      gradOf[g.querySelector('stop').getAttribute('stop-color')] = g.getAttribute('id');
    });

    // ---------------------------------------------------------- the swarm

    m.items.forEach(function (it, n) {
      /* Rule 1: the script writes transform on .ff, the CSS animation
         lives on .ff-a. Put both on one element and the node snaps to
         the origin the instant its animation delay elapses. */
      var g = el('g', { class: 'ff', transform: 'translate(' + it.hx + ',' + it.hy + ')' }, swarm);
      var a = el('g', { class: 'ff-a' + (it.orphan ? ' is-orphan' : '') }, g);
      a.style.animationDuration = it.flicker.toFixed(2) + 's';
      a.style.animationDelay = (-(n * 0.37) % it.flicker).toFixed(2) + 's';
      if (still) { a.style.animation = 'none'; a.style.opacity = it.bright.toFixed(2); }

      el('circle', {
        class: 'ff-glow', r: (it.r * 5.2).toFixed(1),
        fill: 'url(#' + gradOf[it.hue] + ')'
      }, a);
      el('circle', {
        class: 'ff-core', r: it.r.toFixed(2), fill: it.hue,
        opacity: it.bright.toFixed(2)
      }, a);

      /* The name, for OPEN. Written now and revealed by CSS, so the
         morph never touches the DOM. Every candidate gets its text;
         place() decides how many of them the scene can hold. */
      if (it.rank < LABEL_MAX) {
        var label = el('text', {
          class: 'ff-name', x: 0, y: (it.r + 15).toFixed(1),
          'text-anchor': 'middle', fill: it.hue
        }, g);
        label.textContent = it.short;
        it.label = label;
      }
      it.node = g;
      it.cx = it.hx; it.cy = it.hy;
    });

    /* dust in the room, outside the glass — not notes, and never counted */
    var R = rng(0x9F31);
    for (var d = 0; d < 16; d++) {
      var mote = el('circle', {
        class: 'mote',
        cx: (12 + R() * (VIEW.w - 24)).toFixed(1),
        cy: (90 + R() * (PLANK_Y - 140)).toFixed(1),
        r: (0.7 + R() * 1.1).toFixed(2)
      }, motes);
      mote.style.animationDuration = (11 + R() * 12).toFixed(1) + 's';
      mote.style.animationDelay = (-R() * 14).toFixed(1) + 's';
      if (still) mote.style.animation = 'none';
    }

    // ------------------------------------------------------------ placing

    var P = null;

    /* viewBox is the scene in CSS pixels, so nothing distorts at any
       aspect; the jar gets a transform instead of its own viewBox. */
    function place() {
      var box = host.getBoundingClientRect();
      var W = Math.max(320, Math.round(box.width));
      var H = Math.max(320, Math.round(box.height));
      var narrow = W < 900;

      var k = Math.min(H * 0.97 / VIEW.h, W * (narrow ? 0.74 : 0.46) / VIEW.w);
      var cx;
      if (narrow) {
        cx = W / 2;
      } else {
        /* centre the jar in whatever is left to the right of the copy,
           so the glass never crosses the headline — the Observatory's
           phase-A finding, taken as given rather than re-learned */
        var copy = document.querySelector('.jar-copy');
        var left = copy ? (copy.getBoundingClientRect().right - box.left + 28) : W * 0.40;
        left = clamp(left, 0, W * 0.6);
        cx = left + (W - left) / 2;
      }
      var tx = cx - (VIEW.w / 2) * k;
      var ty = (H - VIEW.h * k) / 2;

      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      world.setAttribute('transform', 'translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) +
        ') scale(' + k.toFixed(5) + ')');
      /* labels are drawn in jar units but have to read at scene scale */
      svg.style.setProperty('--ff-name-size', (11.5 / k).toFixed(2) + 'px');

      P = { k: k, tx: tx, ty: ty, W: W, H: H, narrow: narrow };
      /* the visible scene, expressed in the jar's own units */
      P.rect = { x0: -tx / k, y0: -ty / k, x1: (W - tx) / k, y1: (H - ty) / k };

      /* The panels the swarm must not hide behind.
         Kept as the union of every shape they have taken at this scene
         size, because the copy shrinks when the jar opens: measuring
         it mid-transition hands back a smaller box, the layout re-runs
         against that, and a firefly is parked exactly where the panel
         is about to be again. The union is stable whichever state we
         happen to measure in. */
      var sizeKey = W + 'x' + H;
      if (sizeKey !== avoidKey) { avoidKey = sizeKey; avoidPx = {}; }
      ['.jar-copy', '.jar-meta'].forEach(function (sel) {
        var e = document.querySelector(sel);
        if (!e) return;
        var r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var now = {
          l: r.left - box.left, t: r.top - box.top,
          r: r.right - box.left, b: r.bottom - box.top
        };
        var was = avoidPx[sel];
        avoidPx[sel] = was ? {
          l: Math.min(was.l, now.l), t: Math.min(was.t, now.t),
          r: Math.max(was.r, now.r), b: Math.max(was.b, now.b)
        } : now;
      });
      P.avoid = Object.keys(avoidPx).map(function (sel) {
        var a = avoidPx[sel];
        return {
          x0: (a.l - tx) / k, y0: (a.t - ty) / k,
          x1: (a.r - tx) / k, y1: (a.b - ty) / k
        };
      });

      /* How many names this scene can actually hold. Twenty-four reads
         cleanly on a desktop and turns into overlapping mush on a
         375px frame, so it is set from the room available and the
         readout says how many were withheld. */
      var maxNames = Math.max(6, Math.min(LABEL_MAX, Math.round(W * H / 24000)));
      m.items.forEach(function (it) {
        var show = it.rank < maxNames;
        if (show !== it.named) it.named = show;
        if (it.label) it.label.style.display = show ? '' : 'none';
      });
      P.named = Math.min(maxNames, m.items.length);

      /* the bounds OPEN actually laid out inside, so drift clamps to
         the same box the morph aimed at rather than a wider one */
      P.lim = layoutOpen(m, P.rect, 11.5 / k, P.avoid);
      if (typeof opts.onLayout === 'function') opts.onLayout(P.named, m.items.length);
      return P;
    }

    /* union of the panel boxes seen at the current scene size */
    var avoidKey = '', avoidPx = {};
    place();

    /* one scratch object for the drift clamp, reused every frame —
       ninety allocations a frame is ninety too many */
    var drifter = { ox: 0, oy: 0, half: 0, r: 0 };

    // ----------------------------------------------------- drift and morph

    var state = 'sealed';        /* 'sealed' | 'open' */
    var mode = 'drift';          /* 'drift'  | 'morph' */
    var raf = 0, t0 = 0, mt0 = 0;

    function baseOf(it) {
      return state === 'open' ? { x: it.ox, y: it.oy } : { x: it.hx, y: it.hy };
    }

    function fit(it, x, y) {
      if (state === 'open') {
        /* drift has to respect the panels too, or a firefly slides
           back under one a second after the morph put it clear */
        drifter.half = it.half; drifter.r = it.r;
        drifter.ox = clamp(x, P.lim.x0 + it.half, P.lim.x1 - it.half);
        drifter.oy = clamp(y, P.lim.y0, P.lim.y1);
        keepClear(drifter, P.avoid, 'o', P.lim);
        return { x: drifter.ox, y: drifter.oy };
      }
      /* soft collision with the glass: it grazes and slides, it does
         not stop dead and it never leaves */
      var cy = clamp(y, FLY_TOP + it.r + 3, FLY_BOT - it.r - 3);
      var w = halfWidth(cy) - it.r - 3, off = x - CX;
      return { x: Math.abs(off) > w ? CX + (off < 0 ? -w : w) : x, y: cy };
    }

    function write(it) {
      it.node.setAttribute('transform',
        'translate(' + it.cx.toFixed(2) + ',' + it.cy.toFixed(2) + ')');
    }

    function frame(now) {
      var i, it;
      if (mode === 'morph') {
        var done = true;
        for (i = 0; i < m.items.length; i++) {
          it = m.items[i];
          var p = (now - mt0 - it.delay) / MORPH_MS;
          if (p < 1) done = false;
          p = clamp(p, 0, 1);
          var e = ease(p), u = 1 - e;
          /* quadratic Bézier through the jar's mouth: a firefly leaving
             a jar goes out of the opening, not through the glass */
          it.cx = u * u * it.fx + 2 * u * e * it.qx + e * e * it.tx2;
          it.cy = u * u * it.fy + 2 * u * e * it.qy + e * e * it.ty2;
          write(it);
        }
        if (done) { mode = 'drift'; t0 = now; if (state === 'sealed') reclip(true); }
      } else {
        if (!t0) t0 = now;
        var t = (now - t0) / 1000;
        for (i = 0; i < m.items.length; i++) {
          it = m.items[i];
          var b = baseOf(it);
          var q = fit(it,
            b.x + Math.sin(t * it.sx + it.px) * it.ax,
            b.y + Math.cos(t * it.sy + it.py) * it.ay);
          it.cx = q.x; it.cy = q.y;
          write(it);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function reclip(on) {
      swarmClip.setAttribute('clip-path', on ? 'url(#jar-inside)' : 'none');
    }

    function go(next) {
      if (next === state) return;
      state = next;
      var open = state === 'open';
      svg.classList.toggle('is-open', open);
      host.classList.toggle('is-open', open);
      if (host.parentElement) host.parentElement.classList.toggle('is-open', open);
      lid.setAttribute('aria-pressed', open ? 'true' : 'false');
      lid.setAttribute('aria-label', open ? 'Put the lid back on' : 'Lift the lid and let the vault out');
      lid.querySelector('title').textContent = open ? 'Seal the jar' : 'Lift the lid';

      /* Cut the swarm loose before it travels, restore the clip only
         once everything is home again. Nothing has moved yet either
         way, so neither switch is visible. */
      if (open) reclip(false);

      if (still) {
        /* reduced motion: an instant placement, not a walk */
        m.items.forEach(function (it) {
          var b = baseOf(it);
          it.cx = b.x; it.cy = b.y; write(it);
        });
        if (!open) reclip(true);
      } else {
        m.items.forEach(function (it, i) {
          var to = baseOf(it);
          it.fx = it.cx; it.fy = it.cy;
          it.tx2 = to.x; it.ty2 = to.y;
          /* the arc bulges up through the neck on the way out, and
             funnels back down through it on the way in */
          it.qx = MOUTH.x + (to.x - MOUTH.x) * 0.18;
          it.qy = MOUTH.y - 26 - (i % 5) * 9;
          it.delay = (i % 20) * STAGGER_MS;
        });
        mt0 = performance.now();
        mode = 'morph';
      }
      if (typeof opts.onState === 'function') opts.onState(state);
    }

    if (still) {
      m.items.forEach(write);
    } else {
      raf = requestAnimationFrame(frame);
    }

    // -------------------------------------------------------------- the lid

    function toggle() {
      go(state === 'sealed' ? 'open' : 'sealed');
      if (typeof opts.onOpen === 'function' && state === 'open') opts.onOpen();
    }
    lid.addEventListener('click', toggle);
    lid.addEventListener('keydown', function (e) {
      /* An SVG <g role="button"> gets neither of these for free. */
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
    });

    // ------------------------------------------------------------- resizing

    var ro = null, rt = 0;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        place();
        if (state === 'open' && mode === 'drift') {
          /* re-home without a walk: the scene changed shape, the swarm
             did not decide to move */
          m.items.forEach(function (it) { it.cx = it.ox; it.cy = it.oy; write(it); });
        }
      }, 90);
    }
    if (global.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(host); }
    global.addEventListener('resize', onResize);

    return {
      stats: m.stats,
      groups: m.clusters,
      groupStats: m.groupStats,
      total: m.total,
      capped: m.capped,
      labelled: function () { return P.named; },
      recencyReal: m.recencyReal,
      items: m.items,
      near: m.near,
      state: function () { return state; },
      open: function () { go('open'); },
      seal: function () { go('sealed'); },
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        global.removeEventListener('resize', onResize);
        host.innerHTML = '';
      }
    };
  }

  global.PNJar = { mount: mount, VIEW: VIEW, BODY: BODY, HUES: HUES, halfWidth: halfWidth };
}(window));
