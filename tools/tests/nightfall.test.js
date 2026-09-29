'use strict';

/* The home hero's evening (assets/js/nightfall.js) is a pure function of
   time — frame(t, layout) — so what the page shows at any moment can be
   held to account without a browser. This pins the claims the module
   makes in its own header: the evening runs in order and ends at the
   hand-off; every firefly leaves from the jar's mouth and lands exactly
   on its spot; the stars stay above the horizon; nothing is painted over
   the photo before the jar is pressed; and a click that should just
   follow the link does exactly that. */

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

global.window = global;
require(path.join(__dirname, '..', '..', 'assets', 'js', 'atlas-flight.js'));
require(path.join(__dirname, '..', '..', 'assets', 'js', 'nightfall.js'));
const N = global.PNNightfall;

const mouth = { x: 980, y: 820 };
const sky = { x: 820, y: 90, w: 400, h: 600 };
const view = { w: 1280, h: 900 };
const lay = () => N.layout(mouth, sky, { view });
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('the timeline runs in order and ends at the hand-off', () => {
  const T = N.T;
  assert.ok(T.sunset[0] === 0, 'the evening starts at the click');
  assert.ok(T.sunset[0] < T.night[0] && T.night[0] < T.stars[0], 'light, then night, then stars');
  assert.ok(T.stars[0] < T.swarm[0], 'the stars are out before the fireflies');
  assert.ok(T.swarm[1] + T.flight <= T.navigate, 'every firefly has landed before the page leaves');
  assert.ok(T.veil[1] <= T.navigate, 'the page is fully navy when it hands over');
  assert.ok(T.navigate < T.safety, 'the safety net only fires if something stalls');
  assert.equal(N.frame(T.navigate - 1, lay()).done, false);
  assert.equal(N.frame(T.navigate, lay()).done, true);
});

test('at rest nothing is painted over the photo', () => {
  const f = N.frame(0, lay());
  assert.equal(f.glow, 0);
  assert.equal(f.dusk, 0);
  assert.equal(f.night, 0);
  assert.equal(f.veil, 0);
  assert.ok(f.stars.every((o) => o === 0), 'no star is lit');
  assert.ok(f.flies.every((p) => p.o === 0), 'no firefly is out');
  assert.equal(f.jarDots, 1, "the jar's own fireflies are all still in it");
});

test('the evening light swells, then drains away completely', () => {
  const L = lay();
  const mid = N.frame((N.T.sunset[0] + N.T.sunset[1]) / 2, L).glow;
  assert.ok(near(mid, 1), 'golden peak at the middle of the sunset');
  assert.equal(N.frame(N.T.sunset[1], L).glow, 0, 'and none left after it');
});

test('night is complete, and the page navy, by the hand-off', () => {
  const f = N.frame(N.T.navigate, lay());
  assert.equal(f.night, 1);
  assert.equal(f.veil, 1);
  assert.equal(f.jarDots, 0, 'every firefly has left the jar');
});

test('every firefly leaves from the jar mouth and lands exactly on its spot', () => {
  const L = lay();
  assert.equal(L.flies.length, N.FIREFLIES);
  for (const f of L.flies) {
    const start = global.PNFlight.pointAt(f.from, f.to, f.seed, 0);
    const end = global.PNFlight.pointAt(f.from, f.to, f.seed, 1);
    assert.ok(near(start.x, mouth.x) && near(start.y, mouth.y), `${f.seed} starts at the mouth`);
    assert.ok(near(end.x, f.to.x) && near(end.y, f.to.y), `${f.seed} lands on its spot`);
    /* and the frame agrees with the flight at the moment of landing */
    const p = N.frame(f.launch + N.T.flight, L).flies[L.flies.indexOf(f)];
    assert.ok(near(p.x, f.to.x, 1e-3) && near(p.y, f.to.y, 1e-3), `${f.seed} is on its spot at touchdown`);
  }
});

test('fireflies are hidden in the jar until they launch, and launch in order', () => {
  const L = lay();
  for (let i = 1; i < L.flies.length; i++) {
    assert.ok(L.flies[i].launch > L.flies[i - 1].launch, 'staggered, one after another');
  }
  const first = L.flies[0];
  assert.equal(N.frame(first.launch - 1, L).flies[0].o, 0);
});

test('most fireflies settle in the sky, the rest beside the photo, all on screen', () => {
  const L = lay();
  const inSky = L.flies.filter((f) =>
    f.to.x >= sky.x && f.to.x <= sky.x + sky.w && f.to.y >= sky.y && f.to.y <= sky.y + sky.h * 0.57);
  assert.ok(inSky.length >= L.flies.length * 0.6, `${inSky.length} of ${L.flies.length} in the sky`);
  for (const f of L.flies) {
    assert.ok(f.to.x >= 0 && f.to.x <= view.w && f.to.y >= 0 && f.to.y <= view.h, `${f.seed} stays on screen`);
  }
});

test('the stars stay above the horizon, and each lights inside the star window', () => {
  const L = lay();
  assert.equal(L.stars.length, N.STARS);
  for (const s of L.stars) {
    assert.ok(s.y < 0.57, 'above the horizon');
    assert.ok(s.x > 0 && s.x < 1);
    assert.ok(s.at >= N.T.stars[0] && s.at + 350 <= N.T.stars[1], 'lights, and is fully lit, inside its window');
  }
  const lit = N.frame(N.T.stars[1], L).stars;
  L.stars.forEach((s, i) => assert.ok(near(lit[i], s.peak), 'at full brightness when the window closes'));
});

test('the same evening plays every time', () => {
  assert.deepEqual(lay(), lay());
  assert.deepEqual(N.frame(2100, lay()), N.frame(2100, lay()));
});

test('the click decision keeps the link a link', () => {
  const plain = { button: 0 };
  const env = { running: false, reducedMotion: false, ready: true };
  assert.equal(N.decide(plain, env), 'animate');
  for (const mod of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    assert.equal(N.decide({ button: 0, [mod]: true }, env), 'native', `${mod}-click opens normally`);
  }
  assert.equal(N.decide({ button: 1 }, env), 'native', 'middle click opens normally');
  assert.equal(N.decide(plain, { ...env, reducedMotion: true }), 'native', 'reduced motion goes straight there');
  assert.equal(N.decide(plain, { ...env, ready: false }), 'native', 'photo not loaded: just go');
  assert.equal(N.decide({ button: 0, defaultPrevented: true }, env), 'native');
  assert.equal(N.decide(plain, { ...env, running: true }), 'ignore', 'a second click does not stack a second evening');
});
