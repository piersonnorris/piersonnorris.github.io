'use strict';

/* Indicator maths behind the Charts tab (PNPrices.ema / rsi / macd).
   These are the numbers the price chart draws its overlays and V2
   sub-panels from, so they get fixtures with hand-checkable answers
   rather than a smoke test. */

const assert = require('node:assert/strict');

global.window = {};
require('../../assets/js/prices.js');

const { ema, rsi, macd } = window.PNPrices;

function near(actual, expected, tolerance, label) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ~${expected}, got ${actual}`
  );
}

function main() {
  // ---------------------------------------------------------------- EMA
  {
    const flat = new Array(30).fill(50);
    const out = ema(flat, 10);
    assert.equal(out.slice(0, 9).every((v) => v === null), true, 'EMA warm-up slots are null');
    assert.equal(out[9], 50, 'EMA seeds with the SMA of the first period');
    assert.equal(out[29], 50, 'a flat series keeps a flat EMA');

    /* Alignment matters more than the value: an overlay that is off by
       one plots yesterday's average against today's candle. */
    assert.equal(ema([1, 2, 3], 5).every((v) => v === null), true, 'too little history yields all nulls');
    assert.equal(ema(flat, 10).length, flat.length, 'EMA stays input-aligned');

    /* Rising series: k = 2/11, seed 5.5 over 1..10, then 11 arrives. */
    const rising = Array.from({ length: 12 }, (_, i) => i + 1);
    const r = ema(rising, 10);
    assert.equal(r[9], 5.5, 'SMA seed over 1..10');
    near(r[10], 5.5 + (11 - 5.5) * (2 / 11), 1e-9, 'first smoothed EMA step');
  }

  // ---------------------------------------------------------------- RSI
  {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i); // straight up
    const up = rsi(closes, 14);
    assert.equal(up.slice(0, 14).every((v) => v === null), true, 'RSI needs period+1 closes');
    assert.equal(up[14], 100, 'a series with no down days pins RSI at 100');

    const down = rsi(Array.from({ length: 40 }, (_, i) => 100 - i), 14);
    assert.equal(down[14], 0, 'a series with no up days pins RSI at 0');

    /* Perfect zig-zag of equal size. The seed window holds 7 gains and
       7 losses, so the first reading is exactly 50 — but Wilder
       smoothing then gives the most recent delta the extra 1/period
       weight, so later readings oscillate just either side of 50 rather
       than converging on it. Asserting the straddle (down-day below,
       up-day above) is what would catch a gain/loss swap; asserting a
       flat 50 would only have caught my own wrong expectation. */
    const zig = [];
    for (let i = 0; i < 40; i++) zig.push(i % 2 === 0 ? 100 : 102);
    const zigRsi = rsi(zig, 14);
    near(zigRsi[14], 50, 1e-9, 'balanced seed window reads exactly 50');
    assert.ok(zigRsi[30] < 50 && zigRsi[30] > 45, `down-day sits just below 50, got ${zigRsi[30]}`);
    assert.ok(zigRsi[31] > 50 && zigRsi[31] < 55, `up-day sits just above 50, got ${zigRsi[31]}`);

    assert.equal(rsi([1, 2, 3], 14).every((v) => v === null), true, 'too little history yields all nulls');
    assert.equal(rsi(closes, 14).length, closes.length, 'RSI stays input-aligned');

    /* Every finite reading must sit inside the oscillator's own scale,
       or the sub-panel would draw outside its box. */
    const mixed = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 3) * 8 + i * 0.15);
    rsi(mixed, 14).forEach((v, i) => {
      if (v === null) return;
      assert.ok(v >= 0 && v <= 100, `RSI out of range at ${i}: ${v}`);
    });
  }

  // --------------------------------------------------------------- MACD
  {
    const closes = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5) * 6 + i * 0.2);
    const m = macd(closes, 12, 26, 9);

    assert.equal(m.macd.length, closes.length, 'MACD line stays input-aligned');
    assert.equal(m.signal.length, closes.length, 'signal stays input-aligned');
    assert.equal(m.hist.length, closes.length, 'histogram stays input-aligned');

    /* The difference cannot exist before the slow EMA does. */
    assert.equal(m.macd.slice(0, 25).every((v) => v === null), true, 'MACD line waits for the slow EMA');
    assert.ok(Number.isFinite(m.macd[25]), 'MACD line starts at slow - 1');

    /* The signal is an EMA of the dense MACD run, so it starts
       signalPeriod - 1 slots after the MACD line, not at index 0. */
    const firstSignal = m.signal.findIndex((v) => Number.isFinite(v));
    assert.equal(firstSignal, 25 + 9 - 1, 'signal starts 8 slots after the MACD line');
    assert.equal(m.hist.slice(0, firstSignal).every((v) => v === null), true, 'no histogram before a signal exists');

    /* hist is macd - signal wherever both exist. */
    for (let i = 0; i < closes.length; i++) {
      if (!Number.isFinite(m.hist[i])) continue;
      near(m.hist[i], m.macd[i] - m.signal[i], 1e-9, `histogram identity at ${i}`);
    }

    /* A steadily rising series must give a positive MACD (fast EMA
       above slow); a falling one negative. Sign errors here would flip
       every histogram bar. */
    const rising = macd(Array.from({ length: 80 }, (_, i) => 100 + i), 12, 26, 9);
    assert.ok(rising.macd[79] > 0, 'MACD is positive on a rising series');
    const falling = macd(Array.from({ length: 80 }, (_, i) => 200 - i), 12, 26, 9);
    assert.ok(falling.macd[79] < 0, 'MACD is negative on a falling series');

    /* Flat series: fast and slow EMAs coincide, so everything is zero. */
    const flat = macd(new Array(80).fill(42), 12, 26, 9);
    near(flat.macd[79], 0, 1e-9, 'flat series has no MACD divergence');
    near(flat.hist[79], 0, 1e-9, 'flat series has no histogram');

    /* Not enough history for a signal: the MACD line may exist, the
       signal must not be faked. */
    const short = macd(Array.from({ length: 30 }, (_, i) => 100 + i), 12, 26, 9);
    assert.equal(short.signal.every((v) => v === null), true, 'no signal without enough MACD points');
    assert.equal(short.hist.every((v) => v === null), true, 'no histogram without a signal');

    assert.equal(macd([1, 2, 3], 12, 26, 9).macd.every((v) => v === null), true, 'too little history yields all nulls');
  }

  markup();
  hoard();
  console.log('Chart indicator tests: OK');
}

/* The Charts panel is built by string concatenation with two optional
   wrappers (the underwater theme's treasure block and hoard panel), and
   an unbalanced <div> there silently breaks the whole tab's layout with
   nothing to catch it. So: pull the real assignment expression out of
   the template, evaluate it with stubs for both themes, and walk the
   div depth. This reads the shipped source, not a copy of it. */
function markup() {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');

  const head = "$('stockchart').innerHTML =";
  const tail = "(underwater ? bubblesMarkup() : '')";
  const start = src.indexOf(head + '\n');
  assert.ok(start >= 0, 'renderStockChart markup assignment not found — did the template move?');
  const end = src.indexOf(tail + ';', start);
  assert.ok(end >= 0, 'markup assignment end not found — did the theme wrapper change?');
  const expr = src.slice(start + head.length, end + tail.length);

  const grab = (name) => {
    const i = src.indexOf('function ' + name + '(');
    assert.ok(i >= 0, `${name}() not found in the template`);
    return src.slice(i, src.indexOf('\n    }', i) + 6);
  };

  const build = new Function(`
    ${grab('treasureChestSvg')}
    ${grab('bubblesMarkup')}
    var esc = function (s) { return String(s); };
    var money = function (n) { return '$' + Number(n).toFixed(2); };
    var activeChartSymbol = 'VDE', activeChartRange = '3M';
    var CHART_RANGES = ['1M','3M','6M','1Y'];
    var EMA_PERIODS = [10,20,50,200];
    var EMA_COLORS = {10:'#1',20:'#2',50:'#3',200:'#4'};
    var loadEmaState = function () { return {10:true,20:false,50:false,200:false}; };
    var holding = { shares: 12.5, value: 900, price: 72 };
    var prefs, underwater, loadChartPrefs;
    return function (theme) {
      prefs = { type:'candle', rsi:true, macd:true, sort:'alpha', range:'3M', theme:theme };
      loadChartPrefs = function () { return prefs; };
      underwater = theme === 'underwater';
      return (${expr});
    };
  `)();

  for (const theme of ['deep', 'underwater']) {
    const html = build(theme);
    let depth = 0, min = 0;
    for (const m of html.matchAll(/<div\b|<\/div>/g)) {
      depth += m[0] === '</div>' ? -1 : 1;
      if (depth < min) min = depth;
    }
    assert.equal(depth, 0, `${theme}: every <div> must close (net ${depth})`);
    assert.equal(min, 0, `${theme}: closes a <div> it never opened`);

    /* The render pipeline writes into these by id afterwards, so losing
       one means a silently blank chart rather than an error. */
    for (const id of ['stocksidelist', 'c-stock', 'marketkpis', 'stockchartstatus']) {
      assert.ok(html.includes('id="' + id + '"'), `${theme}: missing #${id}`);
    }

    const themed = theme === 'underwater';
    assert.equal(html.includes('id="hoardpanel"'), themed, 'hoard panel belongs to the underwater theme only');
    assert.equal(html.includes('treasure-chest'), themed, 'chest belongs to the underwater theme only');
    assert.equal(html.includes('uw-bubbles'), themed, 'bubbles belong to the underwater theme only');
  }
}

/* renderHoard() runs BEFORE PNCharts.market() in the render path, so a
   throw in it takes the whole chart down with it — which is exactly what
   happened live: isFinite(null) is true (Number(null) === 0), so a symbol
   with no purchase lots logged sent null into .toFixed(). Most holdings
   have no lots logged, so this was the common case, not the edge one.
   This runs the real function out of the template against a stub DOM. */
function hoard() {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');

  const i = src.indexOf('function renderHoard(');
  assert.ok(i >= 0, 'renderHoard() not found in the template');
  const body = src.slice(i, src.indexOf('\n    }', i) + 6);

  const build = (rows, journals, unlocked) => new Function(`
    var host = { innerHTML: '' };
    var $ = function (id) { return id === 'hoardpanel' ? host : null; };
    var esc = function (s) { return String(s); };
    var money = function (n) { return '$' + Number(n).toFixed(2); };
    var hoardGoldSvg = function () { return '<svg></svg>'; };
    var valued = ${JSON.stringify(rows)};
    var journalMap = ${JSON.stringify(journals)};
    var journalFor = function (r) { return journalMap[r.platform] || null; };
    var stockNotes = { vault: { isUnlocked: function () { return ${!!unlocked}; } } };
    ${body}
    return function (symbol, stats) { renderHoard(symbol, stats); return host.innerHTML; };
  `)();

  const stats = { latest: 121.27, high: 124.94, low: 105.71, average: 114.4, sessions: 64, source: 'demo' };
  const rows = [{ kind: 'Equity', symbol: 'VDE', platform: 'Sofi', amount: 1.5, value: 198.4 }];

  /* The case that actually broke: vault unlocked, zero lots logged. */
  const none = build(rows, {}, true)('VDE', stats);
  assert.ok(none.includes('none logged'), 'says no buys are logged');
  assert.ok(!/NaN|null|undefined|\$0\.00/.test(none), `no-lots hoard leaked a bad value: ${none.slice(0, 400)}`);
  assert.ok(none.includes('—'), 'unknown figures render as an em dash, not a fabricated zero');

  /* Vault locked — same path, nothing logged, must not throw either. */
  const locked = build(rows, {}, false)('VDE', stats);
  assert.ok(locked.includes('vault locked'), 'says the vault is locked');
  assert.ok(!/NaN|undefined/.test(locked), 'locked hoard leaked a bad value');

  /* With real lots, the arithmetic still has to be right. */
  const withLots = build(rows, { Sofi: { purchases: [{ shares: 1, price: 100 }] } }, true)('VDE', stats);
  assert.ok(withLots.includes('$100.00'), 'average buy shows');
  assert.ok(withLots.includes('+$21.27'), `P/L of 121.27 - 100 should show: ${withLots.slice(0, 400)}`);
  assert.ok(withLots.includes('+21.3%'), 'P/L percentage shows');
  /* 1 lot against 1.5 shares held — say so rather than implying full cover. */
  assert.ok(withLots.includes('partial'), 'flags that tracked buys only partly cover the position');
}

main();
