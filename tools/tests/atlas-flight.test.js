'use strict';

/* PNFlight — the fireflies that fly from an /atlas/ jar to its stars.

   Pierce, 2026-09-14: "the fireflys going there should be slow and take
   1.5 seconds no going strait there but fling around then going there."
   That sentence is four claims a test can hold: the trip takes 1.5
   seconds, it does not go straight, it flings around first, and then it
   goes there — onto the star, exactly.

   The last one is the claim that was broken. Until 2026-09-14 every
   firefly was aimed at where its star stood at launch, which is its old
   place in the cluster, while the star slid out to its spread position:
   measured on Operations, all six landed on empty sky 117-726px from
   their stars. The right target was being computed in atlas-ui.js and
   passed in, and nothing read it. So the second half of this file drives
   the real module through a fake page and a hand-cranked clock and checks
   where each firefly is on its last frame — including when its star moves
   while it is still in the air. */

const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

global.window = global;
require(path.join(ROOT, 'assets/js/atlas-data.js'));
require(path.join(ROOT, 'assets/js/atlas-flight.js'));

const { pointAt, mount, DURATION, STAGGER } = global.PNFlight;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`\n  FAIL  ${name}\n        ${err.message}\n`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------ the path itself

/* Real trip shapes, in the flight layer's pixels, from /atlas/ at 1366px
   wide: the Operations jar's mouth and the six places its stars spread to,
   a star at each edge of the sky, one nearly straight above the jar, a
   short low hop, and a phone's tall narrow climb. Every note in the atlas
   is flown over every one of them, out and home again — 575 flights. */
const MOUTH = { x: 362, y: 805 };
const STARS = [[496, 535], [707, 361], [1242, 518], [312, 350], [869, 598], [830, 519],
  [150, 120], [1250, 380], [420, 500], [700, 690], [60, 640]].map(([x, y]) => ({ x, y }));

const TRIPS = [];
STARS.forEach((star) => {
  TRIPS.push({ out: true, from: MOUTH, to: star });
  TRIPS.push({ out: false, from: star, to: MOUTH });
});
TRIPS.push({ out: true, from: { x: 100, y: 1000 }, to: { x: 330, y: 150 } });

const IDS = global.PNAtlasData.notes.map((n) => n.id);
const STEPS = 600;

const FLIGHTS = [];
TRIPS.forEach((trip) => IDS.forEach((id) => {
  /* recall seeds carry an "r", the way PNFlight.recall() makes them */
  const seed = trip.out ? id : id + 'r';
  const pts = [];
  for (let i = 0; i <= STEPS; i++) pts.push(pointAt(trip.from, trip.to, seed, i / STEPS));
  FLIGHTS.push({ trip, seed, pts });
}));

const name = (f) => `${f.trip.out ? 'out' : 'home'} ${f.seed} (${f.trip.from.x},${f.trip.from.y})->(${f.trip.to.x},${f.trip.to.y})`;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('a trip takes 1.5 seconds, however far it goes', () => {
  assert.equal(DURATION, 1500);
  assert.ok(STAGGER > 0 && STAGGER < 200, 'fireflies leave the jar a beat apart, not one per second');
});

test('every flight leaves from its start and ends exactly on its target', () => {
  FLIGHTS.forEach((f) => {
    assert.deepEqual(f.pts[0], f.trip.from, name(f) + ' does not start at its start');
    assert.deepEqual(f.pts[STEPS], f.trip.to, name(f) + ' does not end on its target');
  });
});

test('no firefly goes straight there', () => {
  FLIGHTS.forEach((f) => {
    const { from, to } = f.trip;
    const chord = dist(from, to);
    const off = Math.max(...f.pts.map((p) =>
      Math.abs((p.x - from.x) * (to.y - from.y) - (p.y - from.y) * (to.x - from.x)) / chord));
    assert.ok(off >= 25, name(f) + ' strays only ' + off.toFixed(1) + 'px from a straight line');
  });
});

/* A loop is a path that crosses itself. Heading-angle totals were tried
   first and they flatter an S-bend, which wiggles through plenty of angle
   without ever looping — the first tuning passed that test with 16 of
   these flights drawing exactly that. */
function crossesItself(pts) {
  const side = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = i + 2; j < pts.length - 1; j++) {
      const a = pts[i], b = pts[i + 1], c = pts[j], d = pts[j + 1];
      if ((side(c, d, a) > 0) !== (side(c, d, b) > 0) &&
          (side(a, b, c) > 0) !== (side(a, b, d) > 0)) return true;
    }
  }
  return false;
}

test('it flings around first: every flight loops before it heads for its star', () => {
  FLIGHTS.forEach((f) => {
    const early = [];
    for (let i = 0; i <= 240; i++) early.push(pointAt(f.trip.from, f.trip.to, f.seed, 0.02 + 0.82 * i / 240));
    assert.ok(crossesItself(early), name(f) + ' never loops — it only bends');
  });

  /* and the loops come first: at half time the swarm has mostly not left */
  const shares = FLIGHTS.filter((f) => f.trip.out)
    .map((f) => 1 - dist(f.pts[STEPS / 2], f.trip.to) / dist(f.trip.from, f.trip.to))
    .sort((a, b) => a - b);
  const median = shares[shares.length >> 1];
  const most = shares[shares.length - 1];
  assert.ok(median < 1 / 3, 'at half time the typical firefly is already ' + (median * 100).toFixed(0) + '% of the way there');
  assert.ok(most < 0.55, 'at half time one firefly is already ' + (most * 100).toFixed(0) + '% of the way there');
});

test('then it goes there: over the last stretch it only ever closes on its star', () => {
  FLIGHTS.forEach((f) => {
    let last = Infinity;
    for (let i = Math.ceil(STEPS * 0.85); i <= STEPS; i++) {
      const d = dist(f.pts[i], f.trip.to);
      assert.ok(d <= last + 1e-9, name(f) + ' backs away from its star at u=' + (i / STEPS).toFixed(3));
      last = d;
    }
  });
});

test('on the way out, no loop dives back down into the jar', () => {
  FLIGHTS.filter((f) => f.trip.out).forEach((f) => {
    const lowest = Math.max(...f.pts.map((p) => p.y));
    assert.ok(lowest <= f.trip.from.y + 2,
      name(f) + ' drops ' + (lowest - f.trip.from.y).toFixed(1) + 'px below the mouth');
  });
});

test('a note flies the same way every time, and not the way its neighbour does', () => {
  const trip = TRIPS[0];
  IDS.forEach((id) => {
    assert.deepEqual(pointAt(trip.from, trip.to, id, 0.37), pointAt(trip.from, trip.to, id, 0.37));
  });
  const spots = new Set(IDS.map((id) => {
    const p = pointAt(trip.from, trip.to, id, 0.37);
    return p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }));
  assert.equal(spots.size, IDS.length, 'two notes share a flight path');
});

// ------------------------------------------- the module, on a pretend page

/* Just enough page for PNFlight: boxes with fixed rectangles, a clock that
   only moves when told to, frames that only run when told to, and timers
   that fire when the clock passes them. */
function rect(x, y, w, h) { return { left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }; }

function node(box) {
  const el = {
    children: [], parentNode: null, className: '', innerHTML: '', box: box || rect(0, 0, 0, 0), find: null,
    style: { setProperty(k, v) { this[k] = v; } },
    setAttribute() {},
    appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
    removeChild(child) { el.children.splice(el.children.indexOf(child), 1); child.parentNode = null; return child; },
    querySelector(sel) { return el.find ? el.find(sel) : null; },
    getBoundingClientRect() { return el.box; }
  };
  return el;
}

let clock = 0;
let frames = new Map();
let frameId = 0;
let timers = [];
let timerId = 0;

const real = { setTimeout: global.setTimeout, clearTimeout: global.clearTimeout };
global.document = { createElement: () => node() };
global.requestAnimationFrame = (cb) => { frames.set(++frameId, cb); return frameId; };
global.cancelAnimationFrame = (id) => { frames.delete(id); };
global.setTimeout = (fn, ms) => { timers.push({ id: ++timerId, at: clock + ms, fn }); return timerId; };
global.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };
Object.defineProperty(global, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
let reduce = false;
global.matchMedia = () => ({ matches: reduce });

function fireTimers() {
  timers.filter((t) => t.at <= clock).forEach((t) => {
    timers = timers.filter((x) => x !== t);
    t.fn();
  });
}

/* the clock moves a frame at a time, the way a browser's would */
function play(ms) {
  const end = clock + ms;
  while (clock < end) {
    clock = Math.min(end, clock + 16);
    const due = [...frames.values()];
    frames.clear();
    due.forEach((cb) => cb(clock));
    fireTimers();
  }
}

/* a tab in the background: time passes, timers fire, no frame ever runs */
function sleep(ms) {
  clock += ms;
  fireTimers();
}

function page() {
  clock = 1000; frames = new Map(); timers = []; reduce = false;
  const shore = node(rect(0, 0, 1366, 1400));
  shore.find = (sel) => shore.children.find((c) => '.' + c.className === sel) || null;
  const svg = node(rect(315, 777, 94, 138));      /* mouth at (362, 804.6) */
  const jar = node(rect(300, 777, 124, 180));
  jar.find = (sel) => (sel === 'svg' ? svg : null);
  const flight = mount(shore);
  const layer = shore.children[0];
  return { flight, layer, jar };
}

/* a star element whose own box is deliberately nowhere near its target,
   so a firefly that reads the element instead of the target cannot pass */
function star(id, target) {
  return { id, el: node(rect(100, 100, 38, 38)), pt: typeof target === 'function' ? target : () => target };
}

const at = (x, y) => `translate(${(x - 3.5).toFixed(1)}px,${(y - 3.5).toFixed(1)}px)`;

test('a released firefly lands exactly on its star, 1.5 seconds after it leaves', () => {
  const { flight, layer, jar } = page();
  const landed = [];
  flight.release(jar, [star('one-path', { x: 496, y: 535 })], '#5FAE5A', (t) => landed.push([t.id, clock]));
  const ff = layer.children[0];
  assert.ok(ff, 'no firefly left the jar');

  play(DURATION - 100);
  assert.deepEqual(landed, [], 'it landed before 1.5 seconds were up');

  play(200);
  assert.equal(landed.length, 1, 'it did not land exactly once');
  assert.ok(landed[0][1] >= 1000 + DURATION && landed[0][1] < 1000 + DURATION + 17,
    'it landed at ' + (landed[0][1] - 1000) + 'ms, not on the first frame after 1500');
  assert.equal(ff.style.transform, at(496, 535), 'its last frame was not on the star');
  assert.equal(layer.children.length, 0, 'it stayed in the sky after landing');
});

test('a firefly follows its star when the star moves mid-flight', () => {
  const { flight, layer, jar } = page();
  let target = { x: 496, y: 535 };
  const landed = [];
  flight.release(jar, [star('one-path', () => target)], '#5FAE5A', () => landed.push(clock));
  const ff = layer.children[0];

  play(700);
  target = { x: 900, y: 250 };   /* the field log slides in, and the sky reflows */
  play(1000);

  assert.equal(landed.length, 1);
  assert.equal(ff.style.transform, at(900, 250), 'it landed where the star used to be');
});

test('fireflies leave the jar a stagger apart, and every trip still takes 1.5 seconds', () => {
  const { flight, jar } = page();
  const landed = {};
  const targets = [star('a', { x: 496, y: 535 }), star('b', { x: 707, y: 361 }), star('c', { x: 1242, y: 518 })];
  flight.release(jar, targets, '#5FAE5A', (t) => { landed[t.id] = clock; });
  play(DURATION + 3 * STAGGER + 100);
  ['a', 'b', 'c'].forEach((id, i) => {
    const due = 1000 + i * STAGGER + DURATION;
    assert.ok(landed[id] >= due && landed[id] < due + 17, id + ' landed at ' + landed[id] + ', expected ' + due);
  });
});

test('a cleared flight never arrives — not on a later frame, and not from its fallback timer', () => {
  const { flight, layer, jar } = page();
  const landed = [];
  flight.release(jar, [star('a', { x: 496, y: 535 }), star('b', { x: 707, y: 361 })], '#5FAE5A', (t) => landed.push(t.id));
  play(500);
  flight.clear();
  play(DURATION * 2);
  assert.deepEqual(landed, [], 'a star in a sealed jar still flared');
  assert.equal(layer.children.length, 0);
});

test('opening a second jar mid-flight lands only the second jar\'s fireflies', () => {
  const { flight, jar } = page();
  const landed = [];
  flight.release(jar, [star('first', { x: 496, y: 535 })], '#5FAE5A', (t) => landed.push(t.id));
  play(600);
  flight.release(jar, [star('second', { x: 707, y: 361 })], '#E8A33D', (t) => landed.push(t.id));
  play(DURATION * 2);
  assert.deepEqual(landed, ['second']);
});

test('a firefly still arrives in a background tab, where no frame ever runs', () => {
  const { flight, jar } = page();
  const landed = [];
  flight.release(jar, [star('a', { x: 496, y: 535 })], '#5FAE5A', (t) => landed.push(t.id));
  sleep(DURATION + 500);
  assert.deepEqual(landed, ['a']);
});

test('prefers-reduced-motion: nothing flies, and every star is lit at once', () => {
  const { flight, layer, jar } = page();
  reduce = true;
  const landed = [];
  flight.release(jar, [star('a', { x: 496, y: 535 }), star('b', { x: 707, y: 361 })], '#5FAE5A', (t) => landed.push(t.id));
  assert.deepEqual(landed, ['a', 'b'], 'the stars waited for fireflies that were never sent');
  assert.equal(layer.children.length, 0, 'a firefly flew anyway');
});

test('sealing the jar flies each firefly from its star back into the mouth', () => {
  const { flight, layer, jar } = page();
  const home = { id: 'one-path', el: node(rect(477, 516, 38, 38)) };   /* centre (496, 535) */
  flight.recall(jar, [home], '#5FAE5A');
  const ff = layer.children[0];
  assert.ok(ff, 'nothing flew home');
  play(DURATION + 20);
  assert.equal(ff.style.transform, at(362, 804.6), 'it did not end in the jar\'s mouth');
  assert.equal(layer.children.length, 0);
});

global.setTimeout = real.setTimeout;
global.clearTimeout = real.clearTimeout;

console.log(`atlas-flight: ${passed} passed${process.exitCode ? ' (with failures above)' : ''}`);
