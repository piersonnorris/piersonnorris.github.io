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
  function vaultPresent(scope) {
    try { return !!localStorage.getItem('pn.vault.' + scope); }
    catch (err) { return null; }
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

  function portholeSVG() {
    var edges = EDGES.map(function (pair, i) {
      var a = NODES[pair[0]], b = NODES[pair[1]];
      return '<line class="pnb-edge" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
        '" style="animation-delay:-' + (i * 0.6).toFixed(1) + 's"/>';
    }).join('');
    var nodes = NODES.map(function (n, i) {
      return (n.hub ? '<circle class="pnb-halo" cx="' + n.x + '" cy="' + n.y + '" r="' + (n.r + 6) + '"/>' : '') +
        '<circle class="pnb-node' + (n.hub ? ' hub' : '') + '" cx="' + n.x + '" cy="' + n.y + '" r="' + n.r +
        '" style="animation-delay:-' + (i * 0.5).toFixed(1) + 's"/>';
    }).join('');
    return '' +
      '<svg viewBox="0 0 300 150" role="img" aria-label="A sketch of linked notes — decorative, not vault data">' +
        edges + nodes +
        '<g class="pnb-boat" transform="translate(0,0)">' +
          '<path class="pnb-hull" d="M0 140 h18 l-3 5 h-12 Z"/>' +
          '<path class="pnb-sail" d="M9.5 126 l7 12 h-7 Z"/>' +
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
          '<div class="pnb-porthole">' + portholeSVG() + '</div>' +
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
