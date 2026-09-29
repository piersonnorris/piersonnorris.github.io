/* ============================================================
   PNNightfall — the home hero's sunset, and the way into the jar.

   Press the Firefly Jar under the Lake Michigan photo and the
   evening plays out over it: the gold light drains from the sky,
   night comes down, the stars come on one at a time, and the
   fireflies leave the jar and rise into the dark. Then the page
   goes the same navy as /jar/ and hands over to it, where the lid
   is already lifting (jar-page.js reads the #open).

   Two halves, on purpose:

     frame(t, layout)  pure — what everything looks like t ms in.
                       No DOM, no clock. tools/tests/nightfall.test.js
                       holds it to the timeline, the flights and the
                       hand-off.
     mount(opts)       the DOM half: builds the layers, and on a
                       plain click runs frame() once per animation
                       frame, then navigates.

   The photo itself is never painted on. It has no sun in frame, so
   the "sunset" is the evening light leaving the sky — a glow that
   swells and sinks, a dusk tint, then night — not a sun drawn onto
   a real photograph.

   The link stays a link: a modified click, a middle click, reduced
   motion or a missing piece all fall through to plain navigation,
   and a safety timer navigates even if a frame stalls.

   Fireflies fly PNFlight.pointAt() (atlas-flight.js) — the same
   loop-then-settle path the Atlas's fireflies fly, so the site's
   fireflies all move one way.
   ============================================================ */
(function (global) {
  'use strict';

  /* ------------------------------------------------------ timeline (ms) */

  var T = {
    sunset:   [0, 1500],     // the light swells, then drains and sinks
    night:    [800, 2000],   // navy comes down over the photo
    stars:    [1100, 2300],  // each star lights at its own moment inside this
    swarm:    [1500, 2200],  // fireflies launch, staggered across this
    flight:   1200,          // each firefly's trip, jar mouth → its spot
    veil:     [2700, 3500],  // the page fades to /jar/'s navy
    navigate: 3500,
    safety:   4800           // navigate regardless, if frames stall
  };

  var FIREFLIES = 22;
  var STARS = 34;
  var NAVY = '#060b1c';     // /jar/'s background and theme-color

  /* ------------------------------------------------------------- helpers */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function phase(t, span) { return clamp01((t - span[0]) / (span[1] - span[0])); }
  function smooth(p) { return p * p * (3 - 2 * p); }

  /* Seeded, so the evening plays the same way every time (same LCG as
     the share cards). */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function flightPoint(from, to, seed, u) {
    var F = global.PNFlight;
    if (F && F.pointAt) return F.pointAt(from, to, seed, u);
    /* No flight engine: a straight, eased line. Still lands exactly. */
    var s = smooth(clamp01(u));
    return { x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s };
  }

  /* ------------------------------------------------------------ layout

     Where every firefly starts and ends up, and when every star lights.
     `mouth` is the jar's mouth; `sky` is the photo's box (both in
     viewport pixels). Most fireflies settle in the photo's sky, above
     the horizon; the rest spill out beside it, so the swarm reads as
     leaving the jar rather than filling a picture frame. */
  function layout(mouth, sky, opts) {
    opts = opts || {};
    var n = opts.fireflies || FIREFLIES;
    var nStars = opts.stars || STARS;
    var horizon = opts.horizon || 0.57;       // horizon as a fraction of photo height
    var view = opts.view || { w: sky.x + sky.w + 200, h: sky.y + sky.h + 200 };
    var r = rng(opts.seed || 20260929);

    var flies = [];
    for (var i = 0; i < n; i++) {
      var inside = i % 10 < 7;
      var to;
      if (inside) {
        to = {
          x: sky.x + sky.w * (0.08 + r() * 0.84),
          y: sky.y + sky.h * horizon * (0.1 + r() * 0.82)
        };
      } else {
        /* beside the photo, within the viewport, never off-screen */
        var left = r() < 0.5;
        var x = left ? sky.x - 40 - r() * 220 : sky.x + sky.w + 30 + r() * 160;
        to = {
          x: Math.max(16, Math.min(view.w - 16, x)),
          y: Math.max(16, Math.min(view.h - 16, sky.y + sky.h * (0.05 + r() * 0.7)))
        };
      }
      flies.push({
        from: { x: mouth.x, y: mouth.y },
        to: to,
        seed: 'nf' + i,
        launch: T.swarm[0] + (T.swarm[1] - T.swarm[0]) * (i / Math.max(1, n - 1)),
        size: 3 + r() * 3,
        flicker: r() * Math.PI * 2
      });
    }

    var stars = [];
    for (var k = 0; k < nStars; k++) {
      stars.push({
        x: 0.04 + r() * 0.92,                         // fraction of photo width
        y: 0.03 + r() * horizon * 0.86,               // sky only, above the horizon
        at: T.stars[0] + r() * (T.stars[1] - T.stars[0] - 350),
        peak: 0.45 + r() * 0.55,
        size: r() < 0.15 ? 2.4 : 1.2 + r() * 0.8
      });
    }

    return { flies: flies, stars: stars };
  }

  /* ------------------------------------------------------------- frame

     Everything the scene shows at t ms after the click. Pure. */
  function frame(t, lay) {
    var s = phase(t, T.sunset);
    var night = smooth(phase(t, T.night));

    var flies = lay.flies.map(function (f) {
      var u = clamp01((t - f.launch) / T.flight);
      if (t < f.launch) return { x: f.from.x, y: f.from.y, o: 0, u: 0 };
      var p = flightPoint(f.from, f.to, f.seed, u);
      /* landed fireflies hover rather than freeze — measured from the
         landing spot, so the drift starts at zero and there is no jump
         at touchdown */
      if (u >= 1) {
        var since = t - f.launch - T.flight;
        p = {
          x: p.x + (Math.sin(since / 520 + f.flicker) - Math.sin(f.flicker)) * 3,
          y: p.y + (Math.cos(since / 610 + f.flicker) - Math.cos(f.flicker)) * 2.5
        };
      }
      var lit = u < 0.12 ? u / 0.12 : 1;
      var flick = 0.78 + 0.22 * Math.sin(t / 170 + f.flicker * 3);
      return { x: p.x, y: p.y, o: lit * flick, u: u };
    });

    var launched = lay.flies.filter(function (f) { return t >= f.launch; }).length;

    return {
      t: t,
      /* the evening light: swells to a golden peak, then drains away */
      glow: 4 * s * (1 - s),
      sink: s,
      dusk: Math.sin(Math.PI * clamp01(s * 0.9 + night * 0.35)) * 0.9,
      night: night,
      stars: lay.stars.map(function (st) {
        return clamp01((t - st.at) / 350) * st.peak;
      }),
      flies: flies,
      /* the jar's own painted fireflies go out as the real ones leave */
      jarDots: 1 - launched / Math.max(1, lay.flies.length),
      lid: smooth(phase(t, [T.swarm[0] - 350, T.swarm[0] + 50])),
      veil: smooth(phase(t, T.veil)),
      done: t >= T.navigate
    };
  }

  /* -------------------------------------------------------- the decision

     What a click on the jar should do. 'animate' plays the evening;
     'native' lets the browser follow the link untouched; 'ignore'
     swallows a second click while the evening is already running. */
  function decide(evt, env) {
    if (env.running) return 'ignore';
    if (evt.defaultPrevented) return 'native';
    if (evt.button !== 0 || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) return 'native';
    if (env.reducedMotion || !env.ready) return 'native';
    return 'animate';
  }

  /* ================================================================ DOM */

  function reducedMotion() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function mount(opts) {
    var doc = global.document;
    var scene = opts.scene;             // wraps the <img>; layers go in here
    var jar = opts.jar;                 // the <a class="firefly-jar">
    if (!scene || !jar) return null;

    var img = scene.querySelector('img');
    var starsEl = scene.querySelector('.nf-stars');
    var jarSvg = jar.querySelector('svg');
    var starEls = [];
    var lay = null, raf = 0, t0 = 0, safety = 0, running = false;
    var swarm = null, veil = null, flyEls = [];

    function rects() {
      var s = scene.getBoundingClientRect();
      var j = (jarSvg || jar).getBoundingClientRect();
      return {
        sky: { x: s.left, y: s.top, w: s.width, h: s.height },
        /* the jar's mouth: centred, just under the lid */
        mouth: { x: j.left + j.width / 2, y: j.top + j.height * 0.2 },
        view: { w: global.innerWidth, h: global.innerHeight }
      };
    }

    function build() {
      var r = rects();
      lay = layout(r.mouth, r.sky, { view: r.view });
      if (starsEl && !starEls.length) {
        lay.stars.forEach(function (st) {
          var el = doc.createElement('i');
          el.style.left = (st.x * 100) + '%';
          el.style.top = (st.y * 100) + '%';
          el.style.width = el.style.height = st.size + 'px';
          starsEl.appendChild(el);
          starEls.push(el);
        });
      }
    }

    function ensureOverlay() {
      if (swarm) return;
      veil = doc.createElement('div');
      veil.className = 'nf-veil';
      veil.style.background = NAVY;
      swarm = doc.createElement('div');
      swarm.className = 'nf-swarm';
      swarm.setAttribute('aria-hidden', 'true');
      flyEls = lay.flies.map(function (f) {
        var el = doc.createElement('i');
        el.style.width = el.style.height = f.size + 'px';
        swarm.appendChild(el);
        return el;
      });
      doc.body.appendChild(veil);
      doc.body.appendChild(swarm);
    }

    function render(t) {
      var f = frame(t, lay);
      var st = scene.style;
      st.setProperty('--nf-glow', f.glow.toFixed(3));
      st.setProperty('--nf-sink', f.sink.toFixed(3));
      st.setProperty('--nf-dusk', f.dusk.toFixed(3));
      st.setProperty('--nf-night', f.night.toFixed(3));
      for (var i = 0; i < starEls.length; i++) starEls[i].style.opacity = f.stars[i].toFixed(3);
      jar.style.setProperty('--nf-jar-dots', f.jarDots.toFixed(3));
      jar.style.setProperty('--nf-lid', f.lid.toFixed(3));
      if (swarm) {
        for (var k = 0; k < flyEls.length; k++) {
          var p = f.flies[k];
          flyEls[k].style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
          flyEls[k].style.opacity = p.o.toFixed(3);
        }
        veil.style.opacity = f.veil.toFixed(3);
      }
      return f;
    }

    function go() {
      clearTimeout(safety);
      global.location.assign(jar.getAttribute('href').replace(/#.*$/, '') + '#open');
    }

    function tick(now) {
      var f = render(now - t0);
      if (f.done) { raf = 0; go(); return; }
      raf = global.requestAnimationFrame(tick);
    }

    function play() {
      running = true;
      build();
      ensureOverlay();
      jar.classList.add('is-opening');
      jar.setAttribute('aria-busy', 'true');
      safety = global.setTimeout(go, T.safety);
      raf = global.requestAnimationFrame(function (now) { t0 = now; tick(now); });
    }

    /* Back from /jar/ can restore this page from the back-forward cache,
       frozen at night under a navy veil. Put the evening back. */
    function reset() {
      if (raf) global.cancelAnimationFrame(raf);
      clearTimeout(safety);
      raf = 0; running = false;
      if (swarm) { swarm.remove(); veil.remove(); swarm = veil = null; flyEls = []; }
      jar.classList.remove('is-opening');
      jar.removeAttribute('aria-busy');
      if (lay) render(0);
    }

    jar.addEventListener('click', function (e) {
      /* Not gated on the photo having loaded: the scene's size comes from
         the <img> width/height attributes, so the geometry is right either
         way, and a fast click on a slow connection should still get its
         evening rather than silently skipping it. */
      var what = decide(e, {
        running: running,
        reducedMotion: reducedMotion(),
        ready: true
      });
      if (what === 'native') return;
      e.preventDefault();
      if (what === 'animate') play();
    });

    global.addEventListener('pageshow', function (e) { if (e.persisted) reset(); });

    /* ?nightfall-t=1800 freezes the evening at that moment, for checking
       it frame by frame. It never navigates. */
    var debugT = null;
    try { debugT = new URLSearchParams(global.location.search).get('nightfall-t'); } catch (e) { /* old browser */ }
    if (debugT !== null && isFinite(+debugT)) {
      var freeze = function () {
        build(); ensureOverlay(); jar.classList.add('is-opening');
        render(+debugT);
        doc.documentElement.setAttribute('data-nightfall-frozen', debugT);
      };
      if (img && !img.complete) img.addEventListener('load', freeze, { once: true }); else freeze();
    }

    return { play: play, reset: reset, render: function (t) { if (!lay) build(); return render(t); } };
  }

  global.PNNightfall = {
    T: T,
    FIREFLIES: FIREFLIES,
    STARS: STARS,
    NAVY: NAVY,
    layout: layout,
    frame: frame,
    decide: decide,
    mount: mount
  };
})(window);
