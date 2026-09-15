/* ============================================================
   PNFlight — the fireflies leave the jar and fly to their stars.

   Pierce, 2026-09-10: "lets enhanse it so the fireflys go to the
   stars and it makes you open the jars."

   Pierce, 2026-09-14: "the fireflys going there should be slow and
   take 1.5 seconds no going strait there but fling around then going
   there."

   WHY THIS IS A SEPARATE LAYER. Before this, a jar's fireflies
   were `<circle class="fly">` elements inside that jar's own
   `viewBox="0 0 76 112"` SVG, down in the sand. A star is an
   absolutely-positioned button inside `.sky`, a different box
   roughly 600px higher up the page. Nothing drawn inside the jar
   can reach a star — this is the same wall R21 hit and wrote down
   in ONE_GREAT_JAR §8b: "a jar drawn in its own box cannot hold a
   swarm whose job is to fill the viewport."

   So the flight happens in a third box that contains both: one
   absolutely-positioned layer over `.shore`, with every firefly
   placed in that layer's pixels.

   WHY requestAnimationFrame, AND NOT offset-path ANY MORE. The first
   version baked each flight into a CSS offset-path at launch, and
   that is exactly how it came to miss. The path ended wherever the
   star was at the moment of launch — its old place in the cluster —
   while the star itself was still sliding out to its spread position.
   Measured 2026-09-14 on Operations & leadership: all six fireflies
   landed on empty sky, 117-726px from their stars. atlas-ui.js had
   already computed the right target, and nothing read it.

   A path fixed at launch cannot land on a star that moves during the
   flight, and a star moves during a flight more often than it looks:
   the spread itself, the field log sliding in and reflowing the sky,
   the telescope sending everyone home, a resize. So a target is a
   function now, asked again on every frame, and pointAt() is a pure
   function of (start, target, seed, time) that ends exactly on the
   target by construction. The biggest jar holds six notes, so this is
   six transforms a frame.

   THE SHAPE OF A FLIGHT: fling around, then go there. Every trip
   takes DURATION, whatever its length. For the first half the
   firefly swings through a loop or two in the air above the jar, the
   loops held above its own path so it never dives back into the glass
   or the sand; then the loops close and it flies to its star and
   settles onto it, with no speed left on arrival. The loops are seeded
   off the note's id, so a given note flies the same way every time.

   The sky stays lit whether or not a jar is open (Pierce's call,
   2026-09-10 — the flight is the reward, not the price of
   admission, and again 2026-09-14 — "they should be stars unless the
   jars are pressed"). So an arriving firefly does not turn a dark star
   on; it makes a lit one flare. Nothing here changes what the sky
   *means*, only what you watch it do.
   ============================================================ */
(function (global) {
  'use strict';

  var DURATION = 1500;   /* one trip, ms — Pierce, 2026-09-14 */
  var STAGGER = 80;      /* launch spacing, so they leave the mouth as a stream, not a volley */
  var SIZE = 7;          /* .ff is 7px square; every point here is its centre */

  /* One deterministic number per firefly, so a given note's flight
     has the same personality every time — the same reason the star
     layout is hashed rather than random (atlas-ui.js §the star map). */
  function hash01(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    /* murmur3 finalizer — without it the low bits of short, similar
       ids barely move, which is what turned R20's dust into diagonal
       rows instead of a starfield */
    h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

  /* Progress along the carrier curve. smootherstep has no speed at
     either end, so a firefly eases off the lid and settles onto its
     star instead of striking it; raising u first holds most of the
     distance back for the second half, which is what lets the loops
     read as loops rather than as a wobble on a fast line. Tuned by
     flying every note in atlas-data.js over real trip shapes, out and
     back — 575 flights: at this power a firefly is typically a quarter
     of the way to its star at half time, and with the loop timing in
     pointAt() every one of those flights crosses its own path before
     the approach. The first tuning left 16 of them drawing an S-bend
     instead, all short trips straight up. */
  function progress(u) {
    var p = Math.pow(u, 1.8);
    return p * p * p * (p * (p * 6 - 15) + 10);
  }

  /* Where a firefly is, u (0..1) of the way through its trip.

     Two parts. The carrier is a quadratic Bézier whose control point
     sits high above the start, so the firefly leaves going mostly UP
     before it bends toward the target — a symmetric arc reads as a
     bullet. The fling is a loop around the carrier, opened once the
     firefly is clear of the lid and closed again before the approach;
     its centre is held above the carrier, so no part of a loop dips
     below the path. At u = 0 both parts are exactly the start and at
     u = 1 exactly the target — the landing is arithmetic, not luck.

     Pure on purpose: tools/tracker/atlas-flight.test.js holds it to
     the start, the target, the loops and the settle. */
  function pointAt(from, to, seed, u) {
    u = clamp01(u);
    var key = String(seed);
    var j1 = hash01(key + 'a'), j2 = hash01(key + 'b');
    var j3 = hash01(key + 'c'), j4 = hash01(key + 'd');
    var dx = to.x - from.x, dy = to.y - from.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    var cx = from.x + dx * 0.28 + (j1 - 0.5) * 160;
    var cy = from.y + Math.min(dy, 0) * 0.45 - 90 - j2 * 90;
    var s = progress(u), v = 1 - s;
    var x = v * v * from.x + 2 * v * s * cx + s * s * to.x;
    var y = v * v * from.y + 2 * v * s * cy + s * s * to.y;

    var env = smooth(0.06, 0.22, u) * (1 - smooth(0.55, 0.84, u));
    if (env > 0) {
      var r = Math.max(30, Math.min(80, dist * 0.12)) * (0.85 + j3 * 0.3);
      var turn = j1 * Math.PI * 2 + (j4 < 0.5 ? -1 : 1) * Math.PI * 2 * (2.4 + j3) * u;
      x += env * (Math.cos(turn) * r + Math.sin(u * 23 + j2 * 9) * 6);
      y += env * (Math.sin(turn) * r * 0.8 - r * 0.9 + Math.cos(u * 19 + j4 * 9) * 6);
    }
    return { x: x, y: y };
  }

  /* lit on the way out, bright through the loops, spent on arrival —
     the star takes over the light at exactly the moment it flares */
  function glow(u) { return u < 0.14 ? u / 0.14 : u > 0.82 ? (1 - u) / 0.18 : 1; }

  function reduced() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (err) { return false; }
  }

  function now() {
    return global.performance && global.performance.now ? global.performance.now() : Date.now();
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
    var flights = [];
    var raf = 0;

    function drop(f) {
      f.done = true;
      clearTimeout(f.timer);
      if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
      var at = flights.indexOf(f);
      if (at > -1) flights.splice(at, 1);
    }

    /* A cleared firefly never arrives. Before 2026-09-14 clear() only
       removed the element, and its fallback timer went on to flare a
       star in a jar that had already been sealed. */
    function clear() {
      flights.slice().forEach(drop);
      if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
    }

    function land(f) {
      if (f.done) return;
      drop(f);
      if (f.onArrive) f.onArrive();
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

    function aim(target) {
      return typeof target === 'function' ? target() : target;
    }

    /* Read everything, then write everything: every target is a layout
       read, and interleaving those with transform writes would ask the
       browser to recompute style once per firefly instead of once. */
    function frame(stamp) {
      raf = 0;
      var i, f, u, to, live = flights.slice();
      for (i = 0; i < live.length; i++) {
        f = live[i];
        u = (stamp - f.t0) / DURATION;
        f.u = u;
        if (u < 0) continue;
        to = aim(f.to);
        f.p = to ? pointAt(f.from, to, f.seed, u) : null;
      }
      for (i = 0; i < live.length; i++) {
        f = live[i];
        if (f.done || f.u < 0) continue;
        if (!f.p) { land(f); continue; }
        f.el.style.transform = 'translate(' + (f.p.x - SIZE / 2).toFixed(1) + 'px,' +
          (f.p.y - SIZE / 2).toFixed(1) + 'px)';
        f.el.style.opacity = glow(clamp01(f.u)).toFixed(3);
        if (f.u >= 1) land(f);
      }
      if (flights.length) raf = global.requestAnimationFrame(frame);
    }

    function fly(from, to, seed, color, delay, onArrive) {
      var el = document.createElement('i');
      el.className = 'ff';
      el.innerHTML = '<b></b>';
      el.style.opacity = '0';
      el.style.setProperty('--ff-color', color || '#ffe9a8');
      layer.appendChild(el);

      var f = { el: el, from: from, to: to, seed: seed, t0: now() + delay,
        onArrive: onArrive, done: false, timer: 0, u: -1, p: null };
      /* rAF does not run in a backgrounded tab, and a firefly parked
         forever in the sky is worse than one that arrives late */
      f.timer = setTimeout(function () { land(f); }, delay + DURATION + 400);
      flights.push(f);
      if (!raf) raf = global.requestAnimationFrame(frame);
      return f;
    }

    /* ---- release: jar → stars ----
       A target's `pt` is where its star is going to be, as a function
       atlas-ui.js answers fresh on every frame; `el` is the fallback
       for a caller that has no layout of its own. */
    function release(jarEl, targets, color, onArrive) {
      clear();
      if (!jarEl || !targets || !targets.length) return;
      if (reduced()) { targets.forEach(function (t) { if (onArrive) onArrive(t); }); return; }

      var from = mouth(jarEl);
      targets.forEach(function (t, i) {
        if (!t.el && !t.pt) return;
        var to = t.pt || function () { return centre(t.el); };
        fly(from, to, t.id || ('t' + i), color, i * STAGGER, function () {
          if (onArrive) onArrive(t);
        });
      });
    }

    /* ---- recall: stars → jar ---- */
    /* The reverse trip is not decoration. Without it a sealed jar is
       a jar you emptied, and the shelf quietly loses its fireflies
       every time somebody browses. It leaves from where each star is
       now, not where it is heading: the star is already on its way
       home, and the firefly is what it leaves behind. */
    function recall(jarEl, targets, color) {
      clear();
      if (!jarEl || !targets || !targets.length) return;
      if (reduced()) return;

      var home = function () { return mouth(jarEl); };
      targets.forEach(function (t, i) {
        if (!t.el) return;
        fly(centre(t.el), home, (t.id || ('t' + i)) + 'r', color, i * STAGGER, null);
      });
    }

    return { release: release, recall: recall, clear: clear, reduced: reduced };
  }

  global.PNFlight = {
    mount: mount,
    pointAt: pointAt,
    DURATION: DURATION,
    STAGGER: STAGGER
  };
})(window);
