/* ============================================================
   PNAtlasUI — the atlas as a night sky over the island.

   One star per note, one jar per domain, one telescope. The
   constellation lines are the real link graph: every line is an
   actual [[wikilink]] written in a note's body, resolved with the
   same code-span-aware rule PNGraphify uses on /notes/ and
   /vault/, so a line is never invented and the counts on this
   page cannot disagree with the counts on those.

   The layout is deterministic — seeded off each note's id — so
   the constellation is the same shape on every load. It is
   recomputed only when the sky's aspect ratio changes enough to
   matter (a phone is not a laptop), never on every resize tick.

   Nothing here is private: the atlas is a curated, public data
   file (assets/js/atlas-data.js), not the encrypted vault. No
   PIN, no localStorage, no content that isn't already in the repo.
   ============================================================ */
(function (global) {
  'use strict';

  var data = global.PNAtlasData;
  if (!data) return;

  var byId = {}, byTitle = {};
  data.notes.forEach(function (n) { byId[n.id] = n; byTitle[key(n.title)] = n; });

  var domainOf = {};
  data.domains.forEach(function (d) { domainOf[d.id] = d; });
  var sourceOf = {};
  data.sources.forEach(function (s) { sourceOf[s.id] = s; });

  /* Where each domain's cluster sits in the sky, in percentages of the
     sky box. Hand-placed rather than computed: six clusters want to be
     spread the way stars actually are — uneven, off-centre, and clear of
     the moon in the top right. */
  var ANCHORS = {
    ops:     { x: 16, y: 32 },
    sales:   { x: 40, y: 17 },
    finance: { x: 68, y: 27 },
    ai:      { x: 25, y: 68 },
    web:     { x: 55, y: 64 },
    study:   { x: 85, y: 55 }
  };
  var MOON = { x: 90, y: 16, r: 62 };   /* r in px — a no-fly zone for stars */

  var state = {
    noteId: null,      /* the star whose field log is open */
    hoverId: null,     /* the star being pointed at, if any */
    tracePair: null,   /* "a|b" while a link line itself is hovered */
    query: '',
    domain: 'all',
    scope: false
  };

  var pos = {};        /* note id -> {x,y} in percent of the sky box */
  var pairs = [];      /* unique undirected [a,b] link pairs */
  var degree = {};     /* note id -> how many distinct notes it connects to */
  var lastAspect = 0;
  var lastFocus = null;

  var sky, starWrap, lineSvg, logcard, logpaper, searchEl, peek;
  var flight = null;   /* PNFlight — jar-to-star fireflies, atlas-flight.js */

  /* The open jar's own layout, or null for "everyone is home". Stars are
     placed in percentages and .star transitions left/top, so swapping the
     lookup under place() IS the morph — there is no animation code here. */
  var spread = null;

  /* One question, asked in one place: where is this star right now. */
  function at(id) { return (spread && spread[id]) || pos[id]; }

  function key(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $(sel) { return document.querySelector(sel); }

  /* ---- link model ------------------------------------------------------
     Code is not writing. A note that explains [[wikilink]] syntax inside
     backticks is documenting the syntax, not linking — the same rule
     PNGraphify applies, kept here so both engines count one page the
     same way. */
  function wikiTargets(body) {
    var text = String(body || '')
      .replace(/```[\s\S]*?(?:```|$)/g, ' ')
      .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
      .replace(/`[^`\n]*`/g, ' ');
    var out = [], seen = {}, m, re = /\[\[([^\[\]]+)\]\]/g;
    while ((m = re.exec(text))) {
      var title = m[1].split('|')[0].split('#')[0].trim();
      var k = key(title);
      if (!k || seen[k]) continue;
      seen[k] = true;
      out.push({ title: title, note: byTitle[k] || null });
    }
    return out;
  }

  function outgoing(note) { return wikiTargets(note.body); }

  function backlinks(note) {
    return data.notes.filter(function (other) {
      if (other.id === note.id) return false;
      return outgoing(other).some(function (l) { return l.note && l.note.id === note.id; });
    });
  }

  /* Links are unique undirected PAIRS: two notes that link to each other
     are one line in the sky, not two. */
  function buildGraph() {
    var seen = {}, broken = 0, neighbours = {};
    data.notes.forEach(function (n) { neighbours[n.id] = {}; });

    data.notes.forEach(function (n) {
      outgoing(n).forEach(function (l) {
        if (!l.note) { broken += 1; return; }
        if (l.note.id === n.id) return;
        var k = n.id < l.note.id ? n.id + '|' + l.note.id : l.note.id + '|' + n.id;
        if (seen[k]) return;
        seen[k] = true;
        pairs.push([n.id, l.note.id]);
        neighbours[n.id][l.note.id] = true;
        neighbours[l.note.id][n.id] = true;
      });
    });

    var orphans = 0;
    data.notes.forEach(function (n) {
      degree[n.id] = Object.keys(neighbours[n.id]).length;
      if (!degree[n.id]) orphans += 1;
    });

    return {
      notes: data.notes.length,
      links: pairs.length,
      broken: broken,
      orphans: orphans,
      /* average DEGREE, not links-over-notes: the question "how many lines
         touch a star" counts each undirected line at both of its ends. */
      perNote: data.notes.length ? (2 * pairs.length / data.notes.length).toFixed(1) : '0'
    };
  }

  function neighboursOf(id) {
    var out = {};
    pairs.forEach(function (p) {
      if (p[0] === id) out[p[1]] = true;
      else if (p[1] === id) out[p[0]] = true;
    });
    return out;
  }

  /* ---- the star map ----------------------------------------------------
     A stable hash of the note id seeds every random-looking choice, so the
     sky is the same shape on every visit. Clusters are laid out on a
     golden-angle spiral around their domain anchor, then relaxed apart
     until no two stars sit closer than a comfortable tap target. */
  function hash01(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    /* FNV alone barely moves its high bits when only the last character
       changes, so "dust0".."dust9" came out as a neat diagonal row of
       specks. The murmur3 finalizer scatters them properly. */
    h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return (h >>> 8) / 16777216;
  }

  function layout() {
    var W = sky.clientWidth || 1100;
    var H = sky.clientHeight || 500;
    var aspect = W / H;                       /* 1% of x is `aspect`% of y in pixels */
    lastAspect = aspect;

    var perDomain = {};
    data.notes.forEach(function (n) {
      var a = ANCHORS[n.domain] || { x: 50, y: 45 };
      var i = perDomain[n.domain] = (perDomain[n.domain] == null ? 0 : perDomain[n.domain] + 1);
      var j = hash01(n.id);
      var ang = i * 2.39996 + j * 1.6;
      var rad = 3.4 * Math.sqrt(i + 0.85) * (0.82 + j * 0.45);   /* in %-of-height units */
      pos[n.id] = {
        x: a.x + Math.cos(ang) * rad * (1.9 / aspect),           /* wider than tall — skies read that way */
        y: a.y + Math.sin(ang) * rad
      };
    });

    /* separation, in %-of-height units so the maths is in real pixels */
    var minSep = Math.max(6, (W < 620 ? 40 : 48) / H * 100);
    var moonSep = MOON.r / H * 100;
    var ids = data.notes.map(function (n) { return n.id; });

    for (var pass = 0; pass < 150; pass++) {
      for (var a = 0; a < ids.length; a++) {
        for (var b = a + 1; b < ids.length; b++) {
          var p = pos[ids[a]], q = pos[ids[b]];
          var dx = (q.x - p.x) * aspect, dy = q.y - p.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d >= minSep) continue;
          var push = (minSep - d) / 2 * 1.04;
          var ux = dx / d, uy = dy / d;
          p.x -= ux * push / aspect; p.y -= uy * push;
          q.x += ux * push / aspect; q.y += uy * push;
        }
      }
      /* a weak spring home, so a cluster stays a cluster */
      ids.forEach(function (id) {
        var n = byId[id];
        var anc = ANCHORS[n.domain] || { x: 50, y: 45 };
        var p = pos[id];
        p.x += (anc.x - p.x) * 0.010;
        p.y += (anc.y - p.y) * 0.010;

        /* nothing sits on the moon */
        var mx = (p.x - MOON.x) * aspect, my = p.y - MOON.y;
        var md = Math.sqrt(mx * mx + my * my) || 0.001;
        if (md < moonSep) {
          p.x += (mx / md) * (moonSep - md) / aspect;
          p.y += (my / md) * (moonSep - md);
        }

        p.x = Math.min(93, Math.max(6, p.x));
        p.y = Math.min(90, Math.max(9, p.y));
      });
    }
  }

  /* ---- the open jar's layout -------------------------------------------
     Pierce, 2026-09-11: "make the jars have the stars spread out."

     The home layout packs each domain into a tight cluster around its own
     sky anchor, which is the right picture for the whole constellation and
     the wrong one for reading a single domain: six stars inside ~200px, six
     name labels, and atlas.css already says so in as many words — "five
     labels all hanging below it would overlap". Alternating the labels above
     and below bought two; it does not buy six.

     So an open jar gets its own layout across the WHOLE sky. Same seeded
     hash, same relaxation idea, one important difference: separation is
     measured as an ellipse the size of a LABEL, not a circle the size of a
     tap target. A star is 38px wide and its name is up to 162px, so the
     thing that actually collides is the text, and pushing on a circular
     radius solves the wrong problem.

     Only ever 2-6 stars are in here (the biggest domain has 6), so the
     relaxation has room to converge and this stays cheap. */
  function layoutSpread(domainId) {
    var ids = data.notes.filter(function (n) { return n.domain === domainId; })
      .map(function (n) { return n.id; });
    if (!ids.length) return null;

    var W = sky.clientWidth || 1100;
    var H = sky.clientHeight || 500;

    /* MEASURE THE LABELS, do not model them. The first attempt at this
       pushed stars apart on an ellipse the size of one assumed 172px
       label, and it did not work: nine overlapping pairs on `ops` alone.
       Two reasons, both invisible to a model. These titles run from "One
       path per lead" to "No form, no distribution without it", so the
       pills vary from ~70px to the 162px cap — a single assumed width is
       wrong for nearly all of them. And atlas.css alternates the label
       above and below the star (`.star:nth-child(2n)`), so two stars at
       the same height may have labels 40px apart or perfectly aligned.

       A label's SIZE does not depend on where its star is, so one read
       per star is enough and the relaxation stays pure arithmetic after
       that. Rectangles, not circles: two pills collide only when they
       overlap on BOTH axes, and the cheap way out is whichever axis needs
       the smaller shove. Pushing along a radius solves the wrong problem
       — it moves labels that were never going to touch. */
    var GAP = 10;
    var boxes = {};
    ids.forEach(function (id) {
      var star = starWrap.querySelector('[data-note="' + cssEsc(id) + '"]');
      var name = star && star.querySelector('.star-name');
      var w = name ? name.getBoundingClientRect().width : 120;
      var h = name ? name.getBoundingClientRect().height : 20;
      /* how far the pill's centre sits from the star's, and on which side:
         read it off the element rather than re-deriving the CSS sum */
      var off = 0;
      if (star && name) {
        var sr = star.getBoundingClientRect(), nr = name.getBoundingClientRect();
        off = (nr.top + nr.height / 2) - (sr.top + sr.height / 2);
      }
      boxes[id] = { w: w || 120, h: h || 20, off: off };
    });

    /* work in pixels — every constraint below is a real pixel measurement,
       and converting each one into percentages first only invites the
       aspect-ratio mistakes the home layout has to make on purpose */
    var out = {};
    var R = ids.length < 3 ? 0.18 : 0.30;
    ids.forEach(function (id, i) {
      var j = hash01(id + '~spread');
      var ang = i * 2.39996 + j * 0.8;
      var rad = Math.sqrt((i + 0.75) / ids.length) * (0.84 + j * 0.34);
      out[id] = {
        x: W * 0.5 + Math.cos(ang) * rad * R * W * 1.25,
        y: H * 0.47 + Math.sin(ang) * rad * R * H * 1.55
      };
    });

    var moonX = MOON.x / 100 * W, moonY = MOON.y / 100 * H;
    var moonR = MOON.r + 18;

    for (var pass = 0; pass < 260; pass++) {
      for (var a = 0; a < ids.length; a++) {
        for (var b = a + 1; b < ids.length; b++) {
          var p = out[ids[a]], q = out[ids[b]];
          var ba = boxes[ids[a]], bb = boxes[ids[b]];
          var needX = (ba.w + bb.w) / 2 + GAP;
          var needY = (ba.h + bb.h) / 2 + GAP;
          var dx = q.x - p.x;
          var dy = (q.y + bb.off) - (p.y + ba.off);   /* pill centre to pill centre */
          var ox = needX - Math.abs(dx);
          var oy = needY - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;           /* clear on one axis is clear */
          if (ox / needX < oy / needY) {
            var sx = (dx < 0 ? -1 : 1) * ox / 2 * 1.04;
            p.x -= sx; q.x += sx;
          } else {
            var sy = (dy < 0 ? -1 : 1) * oy / 2 * 1.04;
            p.y -= sy; q.y += sy;
          }
        }
      }
      ids.forEach(function (id) {
        var p = out[id], bx = boxes[id];
        /* the moon is a no-fly zone here too */
        var mx = p.x - moonX, my = p.y - moonY;
        var md = Math.sqrt(mx * mx + my * my) || 0.001;
        if (md < moonR) { p.x += (mx / md) * (moonR - md); p.y += (my / md) * (moonR - md); }
        /* keep the whole pill on screen, not just the star */
        p.x = Math.min(W - bx.w / 2 - 8, Math.max(bx.w / 2 + 8, p.x));
        p.y = Math.min(H - Math.abs(bx.off) - bx.h - 6, Math.max(Math.abs(bx.off) + bx.h + 6, p.y));
      });
    }

    var pct = {};
    ids.forEach(function (id) { pct[id] = { x: out[id].x / W * 100, y: out[id].y / H * 100 }; });
    return pct;
  }

  /* Spread while a jar is open and the telescope is STOWED. With the
     telescope out every star is on screen (see matches()), and one domain
     fanned across the sky on top of the other nineteen would be a worse
     picture than the one it replaced — the telescope's job is the true
     shape, so everyone goes home for it. */
  function applySpread() {
    var want = (!state.scope && state.domain !== 'all') ? state.domain : null;
    spread = want ? layoutSpread(want) : null;
    place();
  }

  /* Stars are placed in percentages (they reflow for free); the lines have
     to be placed in pixels. A stretched viewBox would need
     vector-effect:non-scaling-stroke to keep strokes even, and that makes
     the browser compute stroke-dasharray in screen space — which breaks
     the pathLength="1" draw-on and renders every line dashed. A 1:1 pixel
     viewBox keeps both the even stroke and the animation. */
  function place() {
    var W = sky.clientWidth || 1100;
    var H = sky.clientHeight || 500;
    lineSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    Array.prototype.forEach.call(starWrap.children, function (el) {
      var p = at(el.dataset.note);
      if (!p) return;
      el.style.left = p.x.toFixed(2) + '%';
      el.style.top = p.y.toFixed(2) + '%';
    });
    Array.prototype.forEach.call(lineSvg.children, function (el) {
      var a = at(el.dataset.a), b = at(el.dataset.b);
      if (!a || !b) return;
      el.setAttribute('x1', (a.x / 100 * W).toFixed(1));
      el.setAttribute('y1', (a.y / 100 * H).toFixed(1));
      el.setAttribute('x2', (b.x / 100 * W).toFixed(1));
      el.setAttribute('y2', (b.y / 100 * H).toFixed(1));
    });
  }

  /* ---- filtering ---- */
  function matches(note) {
    /* Pierce, 2026-09-11: "the telascope should show all stars." The
       telescope draws the links between lessons, and links cross domains —
       so filtering to one jar made it least useful at exactly the moment
       someone had chosen a subject: most of the 30 lines had one end dimmed
       to 9%. Out telescope, out filter. A typed query still narrows, because
       that is someone asking for something specific rather than browsing. */
    if (state.scope) return queryMatches(note);
    if (state.domain !== 'all' && note.domain !== state.domain) return false;
    return queryMatches(note);
  }

  function queryMatches(note) {
    if (!state.query) return true;
    var q = key(state.query);
    return key(note.title).indexOf(q) >= 0 ||
      key(note.body).indexOf(q) >= 0 ||
      (note.tags || []).some(function (t) { return key(t).indexOf(q) >= 0; });
  }

  function visible() { return data.notes.filter(matches); }

  /* ---- the sky ---- */
  function buildDust() {
    var host = $('#dust');
    var out = '';
    for (var i = 0; i < 96; i++) {
      var j = hash01('dust' + i), k = hash01('d2' + i), m = hash01('d3' + i);
      out += '<i style="left:' + (j * 100).toFixed(2) + '%;top:' + (k * 100).toFixed(2) + '%;' +
        '--s:' + (m < 0.62 ? 1 : 2) + 'px;' +
        '--o:' + (0.16 + m * 0.52).toFixed(2) + ';--dur:' + (3 + k * 5).toFixed(1) + 's;' +
        '--dl:' + (j * 6).toFixed(1) + 's"></i>';
    }
    host.innerHTML = out;
  }

  function buildStars() {
    starWrap.innerHTML = data.notes.map(function (n) {
      var d = domainOf[n.domain] || { label: n.domain, color: '#cbd6ea' };
      var deg = degree[n.id] || 0;
      var sz = 8 + Math.min(deg, 6) * 1.7;
      var j = hash01('t' + n.id);
      return '<button type="button" class="star" data-note="' + esc(n.id) + '" data-star="1"' +
        ' style="--sc:' + esc(d.color) + ';--sz:' + sz.toFixed(1) + 'px;' +
        '--dur:' + (3.2 + j * 3.4).toFixed(1) + 's;--dl:' + (j * 5).toFixed(1) + 's"' +
        ' aria-pressed="false"' +
        ' title="' + esc(n.title) + ' — ' + esc(d.label) + ', ' + deg + ' link' + (deg === 1 ? '' : 's') + '">' +
        '<span class="ping" aria-hidden="true"></span>' +
        '<span class="star-glow" aria-hidden="true"></span>' +
        '<span class="star-name">' + esc(n.title) + '</span>' +
      '</button>';
    }).join('');
  }

  /* Two <line>s per link: a fat transparent one to hover, and the visible
     one. Both carry the same endpoints, so place() positions them together
     and paintSky() can stay a single pass over lineSvg.children. */
  function buildLines() {
    var NS = 'http://www.w3.org/2000/svg';
    lineSvg.innerHTML = '';
    pairs.forEach(function (p, i) {
      var hit = document.createElementNS(NS, 'line');
      hit.setAttribute('class', 'lnhit');
      hit.dataset.a = p[0];
      hit.dataset.b = p[1];
      lineSvg.appendChild(hit);

      var el = document.createElementNS(NS, 'line');
      el.setAttribute('class', 'ln');
      el.setAttribute('pathLength', '1');
      el.dataset.a = p[0];
      el.dataset.b = p[1];
      el.style.setProperty('--i', String(i));
      lineSvg.appendChild(el);
    });
  }

  /* ---- jars: one per domain, fireflies for notes ---- */
  function jarSVG(count) {
    var motes = Math.min(count, 7), s = '';
    for (var i = 0; i < motes; i++) {
      var j = hash01('m' + i + count), k = hash01('n' + i + count);
      var cx = 22 + j * 32, cy = 48 + k * 42;
      s += '<circle class="fly" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.4" ' +
        'style="--fdur:' + (3 + j * 3).toFixed(1) + 's;--fdl:' + (k * 3).toFixed(1) + 's"/>';
    }
    return '' +
      '<svg viewBox="0 0 76 112" aria-hidden="true">' +
        '<ellipse class="halo" cx="38" cy="64" rx="30" ry="38"/>' +
        '<path class="glass" d="M24 22 H52 V28 C52 30 61 32 61 41 V88 C61 96 55 101 47 101 H29 ' +
          'C21 101 15 96 15 88 V41 C15 32 24 30 24 28 Z"/>' +
        '<rect class="shine" x="21.5" y="46" width="4" height="38" rx="2" transform="rotate(4 23 65)"/>' +
        s +
        '<g class="lidgrp">' +
          '<rect class="lid" x="18" y="7" width="40" height="9" rx="3"/>' +
          '<rect class="lidtop" x="14" y="13" width="48" height="9" rx="3.5"/>' +
          '<path class="band" d="M15 25 H61"/>' +
        '</g>' +
        /* The three "escape" motes that used to puff out of the lid are
           gone (2026-09-10). They were drawn inside this 76x112 viewBox,
           so they could only ever escape as far as the jar's own edge —
           a gesture at a journey rather than the journey. PNFlight now
           launches one real firefly per note from this lid to that
           note's star, across the whole scene. See atlas-flight.js. */
        '<path class="mound" d="M0 94 C16 87 60 87 76 94 L76 112 L0 112 Z"/>' +
      '</svg>';
  }

  function buildJars() {
    $('#jars').innerHTML = data.domains.map(function (d) {
      var count = data.notes.filter(function (n) { return n.domain === d.id; }).length;
      return '<button type="button" class="jar" data-domain="' + esc(d.id) + '"' +
        ' style="--jc:' + esc(d.color) + '" aria-pressed="false"' +
        ' aria-label="' + esc(d.label) + ' — ' + count + ' notes. Light only this jar\u2019s stars.">' +
        jarSVG(count) +
        '<span class="jartag">' + esc(d.label) + '<i>' + count + '</i></span>' +
      '</button>';
    }).join('');
  }

  /* ---- the field log ---- */
  function bodyHTML(note) {
    /* escape first, then turn [[links]] into buttons — never the other way
       around, or a note title could inject markup */
    return esc(note.body).replace(/\[\[([^\[\]]+)\]\]/g, function (_, raw) {
      var title = raw.split('|')[0].split('#')[0].trim();
      var target = byTitle[key(title)];
      if (!target) return '<span class="wl broken" title="No note with this title">' + esc(raw) + '</span>';
      return '<button type="button" class="wl" data-note="' + esc(target.id) + '">' + esc(raw) + '</button>';
    });
  }

  function ropeList(items) {
    return items.length
      ? '<div class="ropelinks">' + items.join('') + '</div>'
      : '<p class="logempty">none</p>';
  }

  function renderLog(note) {
    var d = domainOf[note.domain] || { label: note.domain, color: '#cbd6ea' };
    var s = sourceOf[note.source] || { label: note.source, when: '' };
    var out = outgoing(note);
    var back = backlinks(note);

    function starLink(n) {
      var dc = (domainOf[n.domain] || {}).color || '#5f4726';
      return '<button type="button" class="ropelink" data-note="' + esc(n.id) + '"' +
        ' style="--lc:' + esc(dc) + '">' + esc(n.title) + '</button>';
    }

    logpaper.innerHTML =
      '<p class="logcrumb">' + esc(d.label) + ' <span aria-hidden="true">&middot;</span> ' + esc(s.label) + '</p>' +
      '<h2 class="logtitle" id="log-title" style="--dc:' + esc(d.color) + '">' + esc(note.title) + '</h2>' +
      '<p class="logwhen">learned ' + esc(prettyDate(note.learned)) +
        (s.when ? ' &middot; ' + esc(s.when) : '') + '</p>' +
      ((note.evidence || []).length
        ? '<ul class="logev">' + note.evidence.map(function (e) {
            return '<li>' + esc(e) + '</li>';
          }).join('') + '</ul>'
        : '') +
      '<div class="logtext"><p>' + bodyHTML(note) + '</p></div>' +
      '<section class="loglinks"><h3>Lines out <span>' + out.length + '</span></h3>' +
        ropeList(out.map(function (l) {
          return l.note ? starLink(l.note)
            : '<span class="ropelink broken">' + esc(l.title) + '</span>';
        })) + '</section>' +
      '<section class="loglinks"><h3>Lines in <span>' + back.length + '</span></h3>' +
        ropeList(back.map(starLink)) + '</section>';
    logpaper.scrollTop = 0;
  }

  function openLog() {
    if (!logcard.hidden) return;
    logcard.hidden = false;
    document.body.classList.add('logopen');
    /* Flush the display change, then slide — synchronously. On a
       requestAnimationFrame this is at the mercy of frame throttling, and a
       frame that never comes would leave the shore shrunk with no panel in
       the gap. Reading offsetHeight forces the reflow instead. */
    void logcard.offsetHeight;
    logcard.classList.add('open');
  }

  function closeLog(refocus) {
    if (logcard.hidden) return;
    logcard.classList.remove('open');
    document.body.classList.remove('logopen');
    state.noteId = null;
    paintSky();
    renderFieldNotes();
    var done = function () {
      /* reopened while this close was still sliding — leave it alone */
      if (logcard.classList.contains('open')) return;
      logcard.hidden = true;
      logcard.removeEventListener('transitionend', done);
      place();
    };
    logcard.addEventListener('transitionend', done);
    setTimeout(done, 420);
    try { history.replaceState(null, '', location.pathname); } catch (err) { /* file:// */ }
    if (refocus && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function prettyDate(v) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(v || ''));
    if (!m) return String(v || '—');
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[Number(m[2]) - 1] + ' ' + m[1];
  }

  /* ---- painting state onto the sky ---- */
  /* One pass paints every state the sky can be in. Hovering a star is
     treated as a focus exactly like selecting one — it lights the same
     lines and the same neighbours — so there is one rule for "what is the
     sky pointing at", not two that can disagree. */
  function paintSky() {
    var shown = {};
    visible().forEach(function (n) { shown[n.id] = true; });

    var focusId = state.hoverId || state.noteId;
    var kin = focusId ? neighboursOf(focusId) : {};
    var trace = state.tracePair ? state.tracePair.split('|') : null;

    Array.prototype.forEach.call(starWrap.children, function (el) {
      var id = el.dataset.note;
      var on = id === state.noteId;
      var hot = id === state.hoverId;
      var dim = !shown[id];
      var traced = !!trace && (trace[0] === id || trace[1] === id);
      el.classList.toggle('dim', dim);
      el.classList.toggle('on', on);
      el.classList.toggle('hot', hot && !dim);
      el.classList.toggle('kin', !on && !hot && !dim && (!!kin[id] || traced));
      /* a traced pair names itself, whatever else the sky is doing */
      el.classList.toggle('shown', traced && !dim);
      el.setAttribute('aria-pressed', String(on));
      el.tabIndex = dim ? -1 : 0;
    });

    Array.prototype.forEach.call(lineSvg.children, function (el) {
      var a = el.dataset.a, b = el.dataset.b;
      var live = shown[a] && shown[b];
      var incident = focusId && (a === focusId || b === focusId);
      var isTrace = !!trace && ((trace[0] === a && trace[1] === b) || (trace[0] === b && trace[1] === a));
      var lit = (!!incident || isTrace) && live;
      el.classList.toggle('lit', lit);
      el.classList.toggle('faded', !lit && (!live || !!focusId || !!trace));
    });

    var count = Object.keys(shown).length;
    sky.classList.toggle('scoping', state.scope);
    sky.classList.toggle('peeking', !!state.hoverId || !!state.tracePair);
    /* 25 names at once is not a legend, it is a wall of text — so an open
       jar names its stars only while it is the only thing on screen. */
    sky.classList.toggle('named',
      (!state.scope && state.domain !== 'all') || (!!state.query && count <= 8));
  }

  /* ---- pointing at a star, without opening it ---- */
  /* The same note can be hovered twice running by two different things — a
     title in the field notes, then its star in the sky. The id has not
     changed, but the card has to appear, so "is there a card up" is asked
     separately from "did the note change". */
  function setHover(id, starEl) {
    var changed = id !== state.hoverId;
    state.hoverId = id;

    if (id && starEl) {
      if (peek.hidden || changed) showPeek(byId[id], starEl);
      else movePeek(starEl);
    } else {
      hidePeek();
    }

    if (changed) paintSky();
  }

  function setTrace(pairKey) {
    if (pairKey === state.tracePair) return;
    state.tracePair = pairKey;
    paintSky();
  }

  var peekTimer = null;
  function showPeek(note, starEl) {
    if (!note) return;
    clearTimeout(peekTimer);
    var d = domainOf[note.domain] || { label: note.domain, color: '#cbd6ea' };
    var s = sourceOf[note.source] || { label: note.source, when: '' };
    var deg = degree[note.id] || 0;
    peek.style.setProperty('--pc', d.color);
    peek.innerHTML =
      '<p class="pk-crumb">' + esc(d.label) + '</p>' +
      '<p class="pk-title">' + esc(note.title) + '</p>' +
      '<p class="pk-meta"><b>' + esc(s.label) + '</b><br>' +
        esc(prettyDate(note.learned)) + ' &middot; ' +
        deg + ' link' + (deg === 1 ? '' : 's') + '</p>' +
      '<p class="pk-hint">press to open the field log</p>';
    peek.hidden = false;
    movePeek(starEl);
    peek.classList.add('show');
    sky.classList.add('carded');
  }

  /* Goes to whichever side of the star has more empty sky, rather than
     always right-then-flip — a card thrown onto the crowded side covers the
     neighbours it just lit up. Clamped so an edge star still gets a whole
     card, and nudged off the star's own label. */
  function movePeek(starEl) {
    if (peek.hidden || !starEl) return;
    var sb = sky.getBoundingClientRect();
    var st = starEl.getBoundingClientRect();
    var pw = peek.offsetWidth, ph = peek.offsetHeight;
    var cx = st.left - sb.left + st.width / 2;
    var cy = st.top - sb.top + st.height / 2;
    var gap = 26;

    var left = cx > sb.width / 2 ? cx - gap - pw : cx + gap;
    if (left < 10 || left + pw > sb.width - 10) {
      left = cx > sb.width / 2 ? cx + gap : cx - gap - pw;
    }
    left = Math.max(10, Math.min(left, sb.width - pw - 10));
    var top = Math.max(10, Math.min(cy - ph / 2, sb.height - ph - 10));

    peek.style.left = Math.round(left) + 'px';
    peek.style.top = Math.round(top) + 'px';
  }

  function hidePeek() {
    sky.classList.remove('carded');
    if (peek.hidden) return;
    peek.classList.remove('show');
    clearTimeout(peekTimer);
    peekTimer = setTimeout(function () { peek.hidden = true; }, 200);
  }

  /* ---- the deck ---- */
  function renderFieldNotes() {
    var shown = visible();
    var html = data.domains.map(function (d) {
      var items = shown.filter(function (n) { return n.domain === d.id; });
      if (!items.length) return '';
      return '<section class="fngroup">' +
        '<h3 class="fnhead"><span class="dot" style="background:' + esc(d.color) + ';color:' + esc(d.color) + '"></span>' +
          esc(d.label) + '<span class="n">' + items.length + '</span></h3>' +
        '<div class="fnlist">' + items.map(function (n) {
          return '<button type="button" class="fnitem' + (n.id === state.noteId ? ' on' : '') +
            '" data-note="' + esc(n.id) + '" style="--dc:' + esc(d.color) + '">' + esc(n.title) + '</button>';
        }).join('') + '</div>' +
      '</section>';
    }).join('');

    $('#fieldnotes').innerHTML = html ||
      '<p class="fnempty">No star matches that. <button type="button" class="clearall" data-clear>Clear</button></p>';
  }

  function renderTimeline() {
    var shown = visible().slice().sort(function (a, b) {
      return String(b.learned).localeCompare(String(a.learned)) || a.title.localeCompare(b.title);
    });
    $('#timeline').innerHTML = shown.length ? shown.map(function (n) {
      var d = domainOf[n.domain] || { label: n.domain, color: '#cbd6ea' };
      var s = sourceOf[n.source] || { label: n.source };
      return '<li class="logrow" style="--dc:' + esc(d.color) + '">' +
        '<span class="logdate">' + esc(prettyDate(n.learned)) + '</span>' +
        '<span class="logdot" aria-hidden="true"></span>' +
        '<button type="button" class="logbtn" data-note="' + esc(n.id) + '">' +
          '<b>' + esc(n.title) + '</b>' +
          '<span>' + esc(s.label) + ' &middot; ' + esc(d.label) + '</span>' +
        '</button>' +
      '</li>';
    }).join('') : '<li class="fnempty">Nothing in the log matches that.</li>';
  }

  var STATS = null;
  function renderStatus() {
    var count = visible().length;
    var filtered = state.domain !== 'all' || !!state.query;
    var where = state.domain === 'all' ? '' : ' &middot; ' + esc((domainOf[state.domain] || {}).label || '');
    $('#status').innerHTML =
      '<span><b>' + STATS.notes + '</b> stars</span>' +
      '<span><b>' + STATS.links + '</b> lines</span>' +
      '<span><b>' + STATS.perNote + '</b> lines per star</span>' +
      '<span><b>' + STATS.orphans + '</b> adrift</span>' +
      '<span><b>' + STATS.broken + '</b> unresolved</span>' +
      '<span class="showing">' + (filtered
        ? 'showing ' + count + ' of ' + STATS.notes + where
        : 'charted ' + esc(data.updated)) + '</span>';
  }

  function renderDeck() {
    renderFieldNotes();
    renderTimeline();
    renderStatus();
    $('#clearall').hidden = !(state.domain !== 'all' || state.query);
  }

  /* ---- selection ---- */
  function select(noteId, fromStar) {
    var note = byId[noteId];
    if (!note) return;
    state.noteId = noteId;
    /* a star hidden by the current filter has just been asked for by name —
       drop the filter rather than pointing at something invisible */
    if (!matches(note)) {
      state.domain = 'all';
      state.query = '';
      searchEl.value = '';
    }
    renderLog(note);
    openLog();
    paintSky();
    renderDeck();
    var el = starWrap.querySelector('[data-note="' + cssEsc(noteId) + '"]');
    if (el && !fromStar) lastFocus = el;
    if (el) ping(el);
    try { history.replaceState(null, '', '#' + noteId); } catch (err) { location.hash = noteId; }
  }

  /* the ring a pressed star throws off — restarted by hand, since the class
     is often already there from the last press */
  function ping(el) {
    el.classList.remove('pinged');
    void el.offsetWidth;
    el.classList.add('pinged');
  }

  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* ---- wiring ---- */
  function init() {
    sky = $('#sky');
    starWrap = $('#stars');
    lineSvg = $('#lines');
    logcard = $('#logcard');
    logpaper = $('#logbody');
    searchEl = $('#search');
    peek = $('#peek');
    if (!sky) return;

    /* one layer over the whole scene, because the trip crosses two
       boxes — see atlas-flight.js for why it cannot live in the jar */
    flight = global.PNFlight ? global.PNFlight.mount(document.querySelector('.shore')) : null;

    STATS = buildGraph();
    buildDust();
    buildStars();
    buildLines();
    buildJars();
    layout();
    place();
    paintSky();
    renderDeck();

    /* ---- pointing ----------------------------------------------------
       One delegated listener covers every way of pointing at a note: a
       star in the sky, a rope link in the field log, a title in the field
       notes or the ship's log. All of them light the same star. Only a
       real mouse over a real star also gets the peek card — a touch there
       is a press, and a card would just be in the way. */
    document.addEventListener('pointerover', function (e) {
      var el = e.target;
      if (el.classList && el.classList.contains('lnhit')) {
        setHover(null, null);
        setTrace(el.dataset.a + '|' + el.dataset.b);
        return;
      }
      setTrace(null);
      var t = el.closest ? el.closest('[data-note]') : null;
      var id = t && byId[t.dataset.note] ? t.dataset.note : null;
      setHover(id, id && t.dataset.star && e.pointerType === 'mouse' ? t : null);
    });
    /* the pointer leaving the window fires no pointerover on anything */
    document.addEventListener('pointerleave', function () {
      setHover(null, null);
      setTrace(null);
    });

    /* keyboard focus deserves the same card the mouse gets */
    starWrap.addEventListener('focusin', function (e) {
      var t = e.target.closest('.star');
      if (t) setHover(t.dataset.note, t);
    });
    starWrap.addEventListener('focusout', function (e) {
      if (!starWrap.contains(e.relatedTarget)) setHover(null, null);
    });

    /* clicking the sky itself puts the sky down */
    sky.addEventListener('click', function (e) {
      if (e.target.closest('.star') || (e.target.classList && e.target.classList.contains('lnhit'))) return;
      if (!logcard.hidden) closeLog(false);
    });

    /* one delegated listener for every note button on the page — stars,
       rope links, wikilinks, the field notes, the ship's log */
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-note],[data-domain],[data-clear]');
      if (!t) return;
      if (t.dataset.note) {
        if (t.dataset.star) lastFocus = t;
        select(t.dataset.note, !!t.dataset.star);
        return;
      }
      var wasDomain = state.domain;
      if (t.dataset.domain) {
        state.domain = state.domain === t.dataset.domain ? 'all' : t.dataset.domain;
      } else {
        state.domain = 'all';
        state.query = '';
        searchEl.value = '';
      }
      syncJars();
      /* spread first: the fireflies are aimed at where the stars are going
         to be, not where they are leaving from */
      applySpread();
      paintSky();
      renderDeck();
      flyDomain(wasDomain, state.domain);
    });

    /* ---- the flight ----
       Opening a jar sends one firefly per note in that domain up to
       its own star; sealing it sends them back down. Switching
       straight from one jar to another does both, and the clear()
       inside release() means the outgoing swarm never overlaps the
       incoming one — two jars' worth of fireflies crossing mid-air
       reads as noise rather than as two jars. */
    /* The star is MOVING while the firefly flies to it — .star transitions
       left/top over .62s and the flight takes 1.05-1.67s. Reading a live
       getBoundingClientRect() at launch would aim every firefly at a
       halfway house nobody ends up at, so the target is computed from the
       layout it is heading for instead. */
    function starPoint(id) {
      var p = at(id);
      if (!p) return null;
      var s = sky.getBoundingClientRect();
      var host = document.querySelector('.shore').getBoundingClientRect();
      return {
        x: s.left - host.left + (p.x / 100) * s.width,
        y: s.top - host.top + (p.y / 100) * s.height
      };
    }

    function starsOf(domainId) {
      if (!domainId || domainId === 'all') return [];
      return data.notes.filter(function (n) { return n.domain === domainId; })
        .map(function (n) {
          return {
            id: n.id,
            el: starWrap.querySelector('[data-note="' + cssEsc(n.id) + '"]'),
            pt: starPoint(n.id)
          };
        })
        .filter(function (t) { return !!t.el; });
    }

    function jarFor(domainId) {
      return document.querySelector('.jar[data-domain="' + cssEsc(domainId) + '"]');
    }

    function colorOf(domainId) {
      return (domainOf[domainId] || {}).color || '#ffe9a8';
    }

    function flyDomain(was, now) {
      if (!flight || was === now) return;
      if (was && was !== 'all') {
        var oldJar = jarFor(was);
        if (oldJar) flight.recall(oldJar, starsOf(was), colorOf(was));
      }
      if (now && now !== 'all') {
        var jar = jarFor(now);
        if (jar) flight.release(jar, starsOf(now), colorOf(now), kindle);
      }
    }

    /* Restarted by hand, exactly like .star.pinged: re-adding a class
       an element already carries does not replay its animation. */
    function kindle(target) {
      var el = target && target.el;
      if (!el) return;
      el.classList.remove('kindled');
      void el.offsetWidth;
      el.classList.add('kindled');
      setTimeout(function () { el.classList.remove('kindled'); }, 800);
    }

    function syncJars() {
      Array.prototype.forEach.call(document.querySelectorAll('.jar'), function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.domain === state.domain));
      });
    }

    /* the telescope */
    var scope = $('#scope');
    scope.addEventListener('click', function () {
      state.scope = !state.scope;
      scope.setAttribute('aria-pressed', String(state.scope));
      $('#scopelabel').textContent = state.scope
        ? 'Stow the telescope' : 'Look through the telescope';
      /* raising or stowing it changes both who is on screen and where they
         stand, so the deck has to be redrawn with them */
      applySpread();
      paintSky();
      renderDeck();
    });

    /* search */
    searchEl.addEventListener('input', function () {
      state.query = searchEl.value;
      paintSky();
      renderDeck();
    });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchEl.value = ''; state.query = ''; paintSky(); renderDeck();
      }
      if (e.key === 'Enter') {
        var first = visible()[0];
        if (first) select(first.id);
      }
    });

    $('#logclose').addEventListener('click', function () { closeLog(true); });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchEl.focus();
        searchEl.select();
        return;
      }
      if (e.key !== 'Escape') return;
      if (!logcard.hidden) { closeLog(true); return; }
      if (state.domain !== 'all' || state.query) {
        state.domain = 'all'; state.query = ''; searchEl.value = '';
        syncJars(); paintSky(); renderDeck();
      }
    });

    /* arrow keys walk the sky: from the focused star to the nearest one in
       that direction, so the constellation is navigable without a mouse */
    starWrap.addEventListener('keydown', function (e) {
      var dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      var dir = dirs[e.key];
      var from = e.target.closest('.star');
      if (!dir || !from) return;
      e.preventDefault();
      var here = pos[from.dataset.note];
      var best = null, bestScore = Infinity;
      Array.prototype.forEach.call(starWrap.children, function (el) {
        if (el === from || el.classList.contains('dim')) return;
        var p = pos[el.dataset.note];
        var dx = (p.x - here.x) * 2, dy = p.y - here.y;
        var along = dx * dir[0] + dy * dir[1];
        if (along <= 0.5) return;
        var across = Math.abs(dx * dir[1] - dy * dir[0]);
        var score = along + across * 2.2;
        if (score < bestScore) { bestScore = score; best = el; }
      });
      if (best) best.focus();
    });

    /* The lines live in a pixel viewBox, so they have to follow the sky
       through every frame of the field log's slide — a ResizeObserver does
       that; a resize listener would not fire at all. */
    if (global.ResizeObserver) new ResizeObserver(place).observe(sky);

    /* The constellation itself is only re-laid-out when the sky's
       proportions actually change — a scrollbar appearing, or the log
       panel taking 420px, must not reshuffle a sky someone is reading. */
    var resizeTimer = null;
    global.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var aspect = (sky.clientWidth || 1) / (sky.clientHeight || 1);
        if (Math.abs(aspect - lastAspect) / lastAspect > 0.18) layout();
        /* the spread is sized in label-widths, and a label is a fixed pixel
           size — so it has to be recomputed against the new sky, not just
           re-placed with stale percentages */
        if (spread) applySpread(); else place();
      }, 180);
    });

    /* a #note-id link followed from inside the page is a same-document
       navigation — no reload, so init() never runs again */
    global.addEventListener('hashchange', function () {
      var id = (location.hash || '').replace(/^#/, '');
      if (byId[id] && id !== state.noteId) select(id);
    });

    var hash = (location.hash || '').replace(/^#/, '');
    if (byId[hash]) select(hash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
