/* ============================================================
   PNFlight — the fireflies leave the jar and fly to their stars.

   Pierce, 2026-09-10: "lets enhanse it so the fireflys go to the
   stars and it makes you open the jars."

   WHY THIS IS A SEPARATE LAYER. Before this, a jar's fireflies
   were `<circle class="fly">` elements inside that jar's own
   `viewBox="0 0 76 112"` SVG, down in the sand. A star is an
   absolutely-positioned button inside `.sky`, a different box
   roughly 600px higher up the page. Nothing drawn inside the jar
   can reach a star — this is the same wall R21 hit and wrote down
   in ONE_GREAT_JAR §8b: "a jar drawn in its own box cannot hold a
   swarm whose job is to fill the viewport."

   So the flight happens in a third box that contains both: one
   absolutely-positioned layer over `.scene`, with every firefly
   placed in scene pixels. Endpoints are read with
   getBoundingClientRect() at launch time rather than cached, which
   means the layout can reflow (the field log takes 420px and the
   percentage-positioned sky re-flows into what is left) without
   the flight paths going stale.

   WHY offset-path AND NOT requestAnimationFrame. The browser
   interpolates along the curve on the compositor; we set two
   custom properties and get out of the way. 25 fireflies is the
   whole vault, so this never needs a budget the way R21's 90-node
   swarm did.

   The sky stays lit whether or not a jar is open (Pierce's call,
   2026-09-10 — the flight is the reward, not the price of
   admission). So an arriving firefly does not turn a dark star on;
   it makes a lit one flare. Nothing here changes what the sky
   *means*, only what you watch it do.
   ============================================================ */
(function (global) {
  'use strict';

  /* One deterministic number per firefly, so a given note's flight
     has the same personality every time — the same reason the star
     layout is hashed rather than random (atlas-ui.js §the star map). */
  function hash01(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    /* murmur3 finalizer — without it the low bits of short, similar
       ids barely move, which is what turned R20's dust into diagonal
       rows instead of a starfield */
    h ^= h >>> 16; h = (h * 2246822507) >>> 0;
    h ^= h >>> 13; h = (h * 3266489909) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function reduced() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (err) { return false; }
  }

  function mount(scene) {
    if (!scene) return null;

    var layer = scene.querySelector('.flight');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'flight';
      layer.setAttribute('aria-hidden', 'true');
      scene.appendChild(layer);
    }

    /* Everything in the air right now, so a second press can call it
       home before launching the next jar's swarm. */
    var inFlight = [];

    function clear() {
      inFlight.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      inFlight = [];
    }

    /* scene-relative centre of any element */
    function centre(el) {
      var r = el.getBoundingClientRect();
      var s = scene.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    }

    /* The mouth, not the middle. A firefly that launches from the
       centre of the jar starts its life inside the glass and appears
       to pass through it; the lid is at roughly a fifth of the jar's
       height, which is where the lifted lid actually opens. */
    function mouth(jarEl) {
      var svg = jarEl.querySelector('svg') || jarEl;
      var r = svg.getBoundingClientRect();
      var s = scene.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.2 };
    }

    /* A firefly does not travel in a straight line and it does not
       travel in a symmetric arc either. It leaves the jar going
       mostly UP — the control point sits high and only a third of
       the way across — so the swarm blooms out of the mouth before
       it fans toward its own corner of the sky. */
    function curve(from, to, seed) {
      var j1 = hash01(seed + 'a'), j2 = hash01(seed + 'b');
      var dx = to.x - from.x, dy = to.y - from.y;
      var cx = from.x + dx * 0.34 + (j1 - 0.5) * 190;
      var cy = from.y + dy * 0.52 - 60 - j2 * 120;
      return 'M' + from.x.toFixed(1) + ' ' + from.y.toFixed(1) +
        ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
        ' ' + to.x.toFixed(1) + ' ' + to.y.toFixed(1);
    }

    function fly(from, to, seed, color, delay, onArrive) {
      var el = document.createElement('i');
      el.className = 'ff';
      el.innerHTML = '<b></b>';
      var dur = 1050 + hash01(seed + 'd') * 620;
      el.style.offsetPath = 'path("' + curve(from, to, seed) + '")';
      el.style.setProperty('--ff-dur', dur.toFixed(0) + 'ms');
      el.style.setProperty('--ff-delay', delay.toFixed(0) + 'ms');
      el.style.setProperty('--ff-color', color || '#ffe9a8');
      layer.appendChild(el);
      inFlight.push(el);

      var done = false;
      function finish() {
        if (done) return;
        done = true;
        if (el.parentNode) el.parentNode.removeChild(el);
        var at = inFlight.indexOf(el);
        if (at > -1) inFlight.splice(at, 1);
        if (onArrive) onArrive();
      }
      el.addEventListener('animationend', finish);
      /* animationend does not fire on a tab that was backgrounded
         mid-flight, and a firefly parked forever in the sky is worse
         than one that arrives late */
      setTimeout(finish, dur + delay + 400);
      return el;
    }

    /* ---- release: jar → stars ---- */
    function release(jarEl, targets, color, onArrive) {
      clear();
      if (!jarEl || !targets || !targets.length) return;
      if (reduced()) { targets.forEach(function (t) { if (onArrive) onArrive(t); }); return; }

      var from = mouth(jarEl);
      targets.forEach(function (t, i) {
        if (!t.el) return;
        fly(from, centre(t.el), t.id || ('t' + i), color, i * 95, function () {
          if (onArrive) onArrive(t);
        });
      });
    }

    /* ---- recall: stars → jar ---- */
    /* The reverse trip is not decoration. Without it a sealed jar is
       a jar you emptied, and the shelf quietly loses its fireflies
       every time somebody browses. */
    function recall(jarEl, targets, color) {
      clear();
      if (!jarEl || !targets || !targets.length) return;
      if (reduced()) return;

      var to = mouth(jarEl);
      targets.forEach(function (t, i) {
        if (!t.el) return;
        fly(centre(t.el), to, (t.id || ('t' + i)) + 'r', color, i * 70, null);
      });
    }

    return { release: release, recall: recall, clear: clear, reduced: reduced };
  }

  global.PNFlight = { mount: mount };
})(window);
