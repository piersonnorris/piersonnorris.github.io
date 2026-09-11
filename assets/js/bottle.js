/* ============================================================
   PNBottle — the ship-in-a-bottle entrance to the Obsidian vault.
   ROADMAP §5 "Ship-in-a-bottle Easter egg" (overlaps R10).

   Click the bottle, the cork pops, the ship sails out, and a
   porthole opens onto the vault's front door.

   What this deliberately does NOT do: read, decrypt, or display a
   single note. It cannot — the vault is encrypted with the
   visitor's PIN and this module never asks for one. The most it
   learns is whether a vault EXISTS in this browser (the same
   localStorage key-presence check the home console already does,
   which reveals no note content), and the porthole drawing is a
   generated sketch, labelled as one in the copy.

   Usage:  PNBottle.mount(document.getElementById('x'), { size: 140 })
   ============================================================ */
(function (global) {
  'use strict';

  var seq = 0;

  /* A small, fixed constellation. Not a graph OF anything — the real
     one lives on /notes/ (PNGraphify) and needs an unlocked vault. */
  var NODES = [
    { x: 150, y: 72, r: 7, hub: true },
    { x: 92, y: 44, r: 4 },
    { x: 214, y: 50, r: 5 },
    { x: 72, y: 104, r: 4 },
    { x: 196, y: 110, r: 4.5 },
    { x: 256, y: 84, r: 3.5 },
    { x: 128, y: 120, r: 3.5 },
    { x: 40, y: 66, r: 3 },
    { x: 232, y: 26, r: 3 }
  ];
  var EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 6], [1, 7], [1, 8], [2, 5], [2, 8], [4, 5], [3, 6]];

  function el(html) {
    var box = document.createElement('div');
    box.innerHTML = html.trim();
    return box.firstChild;
  }

  /* Presence only: is there a vault blob under this key? Never parsed,
     never decrypted. null means the browser blocked storage entirely. */
  function prefersReduced() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (err) { return false; }
  }

  function vaultPresent(scope) {
    try { return !!localStorage.getItem('pn.vault.' + scope); }
    catch (err) { return null; }
  }

  /* Deterministic, so the bottle looks the same on every load and on
     both of the pages it is mounted on. Same reason /atlas/ hashes its
     star layout instead of randomising it. */
  function bottleFlies() {
    var pts = [[48, 22], [63, 34], [79, 19], [95, 30], [110, 22], [126, 33], [137, 24]];
    return '<g class="pnb-flies">' + pts.map(function (p, i) {
      return '<circle class="pnb-fly" cx="' + p[0] + '" cy="' + p[1] + '" r="' +
        (1.3 + (i % 3) * 0.35).toFixed(2) + '" style="--fd:' + (3.4 + (i % 4) * 0.7).toFixed(1) +
        's;--fdl:-' + (i * 0.63).toFixed(2) + 's"/>';
    }).join('') + '</g>';
  }

  function bottleSVG() {
    /* The glass is drawn as fills first, then ONE outline on top: the
       neck and body are separate rects, so stroking them individually
       leaves a seam line floating inside the translucent bottle. The
       outline path below walks the silhouette and simply skips the
       body's left edge where the neck opens into it. */
    var outline =
      'M52 9 H124 A22 22 0 0 1 146 31 V43 A22 22 0 0 1 124 65 H52 A22 22 0 0 1 30 43' +
      ' M30 31 A22 22 0 0 1 52 9' +
      ' M16 31 H30 M16 43 H30';
    return '' +
      '<svg viewBox="0 0 150 74" role="img" aria-hidden="true">' +
        /* cork */
        '<g class="pnb-cork">' +
          '<rect x="1" y="27" width="14" height="20" rx="4" fill="var(--pnb-cork)"/>' +
          '<rect x="1" y="27" width="14" height="20" rx="4" fill="none" stroke="rgba(0,0,0,.28)"/>' +
          '<line x1="8" y1="31" x2="8" y2="43" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>' +
        '</g>' +
        /* neck + body glass, fills only */
        '<rect x="16" y="31" width="16" height="12" rx="3" fill="var(--pnb-glass)"/>' +
        '<rect x="30" y="9" width="116" height="56" rx="22" fill="var(--pnb-glass)"/>' +
        /* contents, clipped to the body */
        '<clipPath id="pnb-clip-' + seq + '"><rect x="30" y="9" width="116" height="56" rx="22"/></clipPath>' +
        '<g clip-path="url(#pnb-clip-' + seq + ')">' +
          '<path d="M30 48 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V66 H30 Z" fill="var(--pnb-glassline)" opacity=".35"/>' +
          '<path d="M30 53 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V66 H30 Z" fill="var(--pnb-glassline)" opacity=".28"/>' +
          /* Fireflies in the glass (2026-09-10). The bottle used to be
             a ship and two waves, which is a still life — nothing on it
             moved until you clicked. These drift before anyone touches
             it, and they are the same idea as /atlas/'s jars: the vault
             is a jar of lights. Clipped to the body with everything
             else, so none of them float outside the glass. */
          bottleFlies() +
          '<g class="pnb-ship">' +
            '<path class="pnb-hull" d="M66 44 h30 l-5 8 h-20 Z"/>' +
            '<line x1="81" y1="18" x2="81" y2="44" stroke="var(--pnb-cork)" stroke-width="2"/>' +
            '<path class="pnb-sail" d="M82 20 l16 18 h-16 Z"/>' +
            '<path class="pnb-sail" d="M79 22 l-13 16 h13 Z"/>' +
          '</g>' +
        '</g>' +
        '<path d="' + outline + '" fill="none" stroke="var(--pnb-glassline)" stroke-width="1.5" stroke-linecap="round"/>' +
        /* highlight so the glass reads as glass */
        '<path d="M46 20 q14 -8 32 -7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".22"/>' +
      '</svg>';
  }

  /* ---- the porthole ----
     Pierce, 2026-09-10: "add the firefly page to the home page as a
     bottle, make it more visualy impressive."

     This used to be a flat dotted sketch that sat there breathing. It
     is now the same story /atlas/ tells: a jar on the ground opens,
     one firefly rises to each point of the constellation, and each
     point lights as its firefly arrives. Nothing about what the
     drawing MEANS has changed — it is still a generated sketch, still
     not a graph of anyone's notes, and the copy under it still says
     so. Only the telling changed.

     Motion is SMIL <animateMotion> rather than CSS offset-path, for
     one reason: the porthole is width:100% and its viewBox scales with
     it. A path in SVG user units follows that scaling for free, where
     a path in CSS pixels would need re-measuring on every resize —
     which is exactly the bookkeeping atlas-flight.js has to do because
     it crosses real page boxes. Here there is no reason to pay it.

     PERIOD is one shared cycle. Every delay below is a fraction of it,
     so the fireflies, the points they light and the lines between them
     cannot drift out of step the way three independent loops would. */
  var PERIOD = 7;                 /* seconds — one full telling */
  var TRAVEL = 1.5;               /* seconds a firefly is in the air */
  var JAR = { x: 150, y: 132 };   /* the mouth, in viewBox units */

  function portholeSVG(reduce) {
    /* Stagger: the constellation assembles hub-first, because the hub
       is the one point every line runs to — lighting it last would
       leave the drawing looking broken for most of the cycle. */
    var order = NODES.map(function (n, i) { return i; }).sort(function (a, b) {
      return (NODES[b].r || 0) - (NODES[a].r || 0);
    });
    var slot = {};
    order.forEach(function (idx, rank) { slot[idx] = rank * 0.3; });

    var edges = EDGES.map(function (pair) {
      var a = NODES[pair[0]], b = NODES[pair[1]];
      /* a line may only appear once BOTH of its ends are alight */
      var after = Math.max(slot[pair[0]], slot[pair[1]]) + TRAVEL;
      return '<line class="pnb-edge" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
        '" style="--lit:' + after.toFixed(2) + 's"/>';
    }).join('');

    var nodes = NODES.map(function (n, i) {
      var after = slot[i] + TRAVEL;
      return (n.hub ? '<circle class="pnb-halo" cx="' + n.x + '" cy="' + n.y + '" r="' + (n.r + 6) +
          '" style="--lit:' + after.toFixed(2) + 's"/>' : '') +
        '<circle class="pnb-node' + (n.hub ? ' hub' : '') + '" cx="' + n.x + '" cy="' + n.y +
        '" r="' + n.r + '" style="--lit:' + after.toFixed(2) + 's"/>';
    }).join('');

    /* One firefly per point. It leaves the jar going up and only then
       fans toward its own corner — the control point sits high and a
       third of the way across, the same shape atlas-flight.js uses, so
       the swarm blooms out of the mouth instead of spraying sideways. */
    var flies = reduce ? '' : NODES.map(function (n, i) {
      var cx = JAR.x + (n.x - JAR.x) * 0.32;
      var cy = JAR.y + (n.y - JAR.y) * 0.55 - 22;
      var path = 'M' + JAR.x + ' ' + JAR.y + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
        ' ' + n.x + ' ' + n.y;
      var hold = (TRAVEL / PERIOD).toFixed(4);
      return '<g class="pnb-ff">' +
          '<circle class="pnb-ffdot" r="2.5" style="--d:' + slot[i].toFixed(2) + 's"/>' +
          '<animateMotion dur="' + PERIOD + 's" begin="' + slot[i].toFixed(2) + 's"' +
            ' repeatCount="indefinite" calcMode="linear"' +
            ' keyPoints="0;1;1" keyTimes="0;' + hold + ';1"' +
            ' path="' + path + '"/>' +
        '</g>';
    }).join('');

    return '' +
      '<svg viewBox="0 0 300 150" role="img" aria-label="A sketch of linked notes, drawn by fireflies leaving a jar — decorative, not vault data">' +
        '<ellipse class="pnb-ground" cx="150" cy="146" rx="120" ry="7"/>' +
        edges + nodes + flies +
        /* the jar they come from — the same object as /atlas/'s shelf,
           drawn small enough to read as a source rather than a subject */
        '<g class="pnb-jar">' +
          '<ellipse class="pnb-jarglow" cx="150" cy="140" rx="17" ry="13"/>' +
          '<path class="pnb-jarglass" d="M142 130 h16 v1 c0 1 4 1.5 4 5 v8 c0 3-2 4-5 4 h-14 c-3 0-5-1-5-4 v-8 c0-3.5 4-4 4-5 Z"/>' +
          '<rect class="pnb-jarlid" x="141" y="127" width="18" height="3.4" rx="1.4"/>' +
        '</g>' +
      '</svg>';
  }

  function stateCopy(general, stocks) {
    if (general === null) {
      return { cls: 'empty', text: 'storage blocked in this browser' };
    }
    if (general || stocks) {
      var which = general && stocks ? 'both vaults are' : 'a vault is';
      return { cls: 'sealed', text: which + ' sealed on this device' };
    }
    return { cls: 'empty', text: 'no vault on this device yet' };
  }

  function mount(target, opts) {
    if (!target) return null;
    opts = opts || {};
    seq += 1;
    var id = 'pnb-' + seq;

    var wrap = el('<div class="pnb-mount"></div>');
    var button = el(
      '<button type="button" class="pnb-bottle" aria-haspopup="dialog" aria-expanded="false"' +
      ' aria-label="' + (opts.label || 'Ship in a bottle — open the vault entrance') + '">' +
      bottleSVG() + '</button>'
    );
    if (opts.size) button.style.setProperty('--pnb-size', opts.size + 'px');

    wrap.appendChild(button);
    if (opts.hint !== false) {
      wrap.appendChild(el('<span class="pnb-hint">' + (opts.hint || 'pull the cork') + '</span>'));
    }

    var state = stateCopy(vaultPresent('general'), vaultPresent('stocks'));
    var overlay = el(
      '<div class="pnb-overlay" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title" hidden>' +
        '<button type="button" class="pnb-scrim" data-close tabindex="-1" aria-hidden="true"></button>' +
        '<div class="pnb-panel">' +
          '<button type="button" class="pnb-close" data-close aria-label="Close">×</button>' +
          '<p class="pnb-eyebrow">Ship in a bottle</p>' +
          '<h2 id="' + id + '-title">' + (opts.title || 'The vault, from the outside') + '</h2>' +
          '<div class="pnb-porthole">' + portholeSVG(prefersReduced()) + '</div>' +
          '<p class="pnb-state ' + state.cls + '"><span class="pnb-lamp" aria-hidden="true"></span>' + state.text + '</p>' +
          '<p class="pnb-note">' + (opts.note ||
            'That drawing is a <b>sketch of a linked vault</b>, not your notes — nothing on this page can read them. ' +
            'The real graph, the notes, and their backlinks live behind your PIN, decrypted in your own browser and nowhere else.') +
          '</p>' +
          /* The stock desk deliberately does NOT appear here (Pierce,
             2026-09-08). The bottle is the Obsidian showcase's front
             door and nothing else's — mixing a portfolio link into it
             was the one place the two surfaces touched. */
          '<div class="pnb-actions">' +
            '<a class="pnb-btn primary" href="/vault/">Open the vault <span aria-hidden="true">→</span></a>' +
            '<a class="pnb-btn" href="/notes/">My private notes <span aria-hidden="true">→</span></a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    target.appendChild(wrap);
    document.body.appendChild(overlay);

    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { /* older browsers */ }

    function focusables() {
      return Array.prototype.slice.call(
        overlay.querySelectorAll('.pnb-panel a[href], .pnb-panel button:not([tabindex="-1"])')
      );
    }

    function open() {
      button.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      /* let the cork pop before the porthole takes over the screen */
      setTimeout(function () {
        overlay.hidden = false;
        var first = focusables()[0];
        if (first) first.focus();
      }, reduced ? 0 : 380);
    }

    function close() {
      overlay.hidden = true;
      button.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }

    button.addEventListener('click', function () {
      if (overlay.hidden) open(); else close();
    });

    Array.prototype.forEach.call(overlay.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', close);
    });

    /* Esc closes; Tab stays inside the panel while it is open. */
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    return { button: button, overlay: overlay, open: open, close: close };
  }

  global.PNBottle = { mount: mount, vaultPresent: vaultPresent };
})(window);
