/* ============================================================
   PNPrices — turn share/coin counts into dollar values.

   The Asset Tracking sheet stores *counts*, not valuations
   (ASSET_TRACKER_SPEC.md §3.3), so nothing can be summed until a
   price is attached to each row. This module does that.

   Providers are pluggable on purpose:
     'twelvedata' — default. One batched /price call covers both
                    equities (NVDA) and crypto (SOL/USD).
     'finnhub'    — equities only, one call per symbol.
     'manual'     — prices typed in by hand / carried in the sheet.
     'mcp'        — RESERVED. When the Robinhood MCP connector is
                    wired up, a build step can bake a {symbol: price}
                    map into the encrypted payload as `quotes`, and
                    this module will use it with no network calls at
                    all. See resolve() below — it already prefers a
                    baked-in map when one is present.

   The API key lives in this browser's localStorage and never enters
   the repo. It is a read-only market-data key, not an account
   credential — this module can only read quotes.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY_STORE = 'pn.prices.cfg';
  var CACHE_STORE = 'pn.prices.cache';
  var HISTORY_CACHE_STORE = 'pn.prices.history.cache';
  var CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  // ---------------------------------------------------------- config

  function loadCfg() {
    try {
      return JSON.parse(localStorage.getItem(KEY_STORE) || '{}') || {};
    } catch (e) { return {}; }
  }

  function saveCfg(cfg) {
    try { localStorage.setItem(KEY_STORE, JSON.stringify(cfg)); return true; }
    catch (e) { return false; }
  }

  function clearCfg() {
    try { localStorage.removeItem(KEY_STORE); localStorage.removeItem(CACHE_STORE); localStorage.removeItem(HISTORY_CACHE_STORE); }
    catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------- classify

  /* Work out what a sheet row actually is, and which symbol (if any)
     needs a quote. Labels are free text, so this is deliberately
     forgiving and never throws. */
  function classify(h) {
    var label = String(h.label || '').trim();
    var unit = String(h.unit || '').trim().toLowerCase();
    var lower = label.toLowerCase();

    if (unit === 'usd') {
      var kind = 'Cash';
      if (/option|call|put/.test(lower)) kind = 'Options';
      else if (/crypto/.test(lower)) kind = 'Crypto';
      else if (/robo|auto-invest/.test(lower)) kind = 'Managed';
      else if (/total value|total/.test(lower)) kind = 'Other';
      else if (/cash/.test(lower)) kind = 'Cash';
      else kind = 'Other';
      return { kind: kind, symbol: null, priced: true };
    }

    /* Strip parenthetical qualifiers: "SOL (crypto)" → "SOL" */
    var sym = label.replace(/\([^)]*\)/g, '').trim().toUpperCase();
    sym = sym.replace(/[^A-Z0-9.\-]/g, '');

    if (unit === 'units') {
      return { kind: 'Crypto', symbol: sym ? sym + '/USD' : null, priced: false };
    }
    if (unit === 'shares') {
      return { kind: 'Equity', symbol: sym || null, priced: false };
    }
    return { kind: 'Other', symbol: null, priced: false };
  }

  /* Every distinct symbol that would need a live quote. */
  function symbolsNeeded(holdings) {
    var seen = {};
    (holdings || []).forEach(function (h) {
      var c = classify(h);
      if (c.symbol) seen[c.symbol] = true;
    });
    return Object.keys(seen);
  }

  // ---------------------------------------------------------- cache

  function loadCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_STORE) || '{}') || {};
      if (!c.at || (Date.now() - c.at) > CACHE_TTL_MS) return null;
      return c;
    } catch (e) { return null; }
  }

  function saveCache(quotes) {
    try {
      localStorage.setItem(CACHE_STORE, JSON.stringify({ at: Date.now(), quotes: quotes }));
    } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------- providers

  async function fetchTwelveData(symbols, apikey) {
    if (!symbols.length) return {};
    var url = 'https://api.twelvedata.com/price?symbol=' +
      encodeURIComponent(symbols.join(',')) + '&apikey=' + encodeURIComponent(apikey);
    var res = await fetch(url);
    if (!res.ok) throw new Error('Twelve Data returned ' + res.status);
    var json = await res.json();

    if (json && json.status === 'error') {
      throw new Error(json.message || 'Twelve Data rejected the request');
    }

    var out = {};
    if (symbols.length === 1) {
      if (json && json.price) out[symbols[0]] = parseFloat(json.price);
    } else {
      Object.keys(json || {}).forEach(function (sym) {
        var entry = json[sym];
        if (entry && entry.price) out[sym] = parseFloat(entry.price);
      });
    }
    return out;
  }

  async function fetchFinnhub(symbols, apikey) {
    var out = {};
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      if (sym.indexOf('/') !== -1) continue;   // finnhub free tier: equities only
      var url = 'https://finnhub.io/api/v1/quote?symbol=' +
        encodeURIComponent(sym) + '&token=' + encodeURIComponent(apikey);
      try {
        var res = await fetch(url);
        if (!res.ok) continue;
        var json = await res.json();
        if (json && isFinite(json.c) && json.c > 0) out[sym] = json.c;
      } catch (e) { /* skip this symbol */ }
    }
    return out;
  }

  function historyDays(range) {
    return ({ '1M': 35, '3M': 100, '6M': 190, '1Y': 370 })[range] || 100;
  }

  function historyPoints(range) {
    return ({ '1M': 22, '3M': 66, '6M': 132, '1Y': 252 })[range] || 66;
  }

  function historyCacheKey(provider, symbol, range) {
    return [provider || 'unknown', symbol, range || '3M'].join('|');
  }

  function loadHistoryCache(key) {
    try {
      var all = JSON.parse(localStorage.getItem(HISTORY_CACHE_STORE) || '{}') || {};
      var hit = all[key];
      if (!hit || !hit.at || Date.now() - hit.at > CACHE_TTL_MS || !Array.isArray(hit.series)) return null;
      return hit.series;
    } catch (e) { return null; }
  }

  function saveHistoryCache(key, series) {
    try {
      var all = JSON.parse(localStorage.getItem(HISTORY_CACHE_STORE) || '{}') || {};
      all[key] = { at: Date.now(), series: series };
      Object.keys(all).forEach(function (cacheKey) {
        if (!all[cacheKey].at || Date.now() - all[cacheKey].at > 24 * 60 * 60 * 1000) delete all[cacheKey];
      });
      localStorage.setItem(HISTORY_CACHE_STORE, JSON.stringify(all));
    } catch (e) { /* ignore */ }
  }

  async function fetchTwelveDataHistory(symbol, apikey, range) {
    var outputsize = historyPoints(range);
    var url = 'https://api.twelvedata.com/time_series?symbol=' + encodeURIComponent(symbol) +
      '&interval=1day&outputsize=' + outputsize + '&apikey=' + encodeURIComponent(apikey);
    var res = await fetch(url);
    if (!res.ok) throw new Error('Twelve Data returned ' + res.status);
    var json = await res.json();
    if (json && json.status === 'error') throw new Error(json.message || 'Twelve Data rejected the request');
    return (json.values || []).map(function (row) {
      return {
        label: String(row.datetime || '').slice(5), date: String(row.datetime || ''),
        value: parseFloat(row.close), open: parseFloat(row.open), high: parseFloat(row.high),
        low: parseFloat(row.low), close: parseFloat(row.close), volume: parseFloat(row.volume)
      };
    }).filter(function (row) { return isFinite(row.value); }).reverse();
  }

  async function fetchFinnhubHistory(symbol, apikey, range) {
    if (symbol.indexOf('/') !== -1) throw new Error('Finnhub history does not cover crypto symbols');
    var to = Math.floor(Date.now() / 1000), from = to - (historyDays(range) * 24 * 60 * 60);
    var url = 'https://finnhub.io/api/v1/stock/candle?symbol=' + encodeURIComponent(symbol) +
      '&resolution=D&from=' + from + '&to=' + to + '&token=' + encodeURIComponent(apikey);
    var res = await fetch(url);
    if (!res.ok) throw new Error('Finnhub returned ' + res.status);
    var json = await res.json();
    if (!json || json.s !== 'ok') throw new Error('No daily history returned for ' + symbol);
    return (json.t || []).map(function (t, i) {
      var date = new Date(t * 1000).toISOString().slice(0, 10);
      return {
        label: date.slice(5), date: date, value: parseFloat(json.c[i]),
        open: parseFloat(json.o[i]), high: parseFloat(json.h[i]), low: parseFloat(json.l[i]),
        close: parseFloat(json.c[i]), volume: parseFloat(json.v[i])
      };
    }).filter(function (row) { return isFinite(row.value); });
  }

  function history(symbol, opts) {
    opts = opts || {};
    var cfg = opts.cfg || loadCfg();
    var range = opts.range || '3M';
    if (!cfg.apikey || cfg.provider === 'manual') {
      return Promise.reject(new Error('Choose a live price provider and add its API key first'));
    }
    var cacheKey = historyCacheKey(cfg.provider, symbol, range);
    var cached = !opts.force && loadHistoryCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    var request = cfg.provider === 'finnhub'
      ? fetchFinnhubHistory(symbol, cfg.apikey, range)
      : fetchTwelveDataHistory(symbol, cfg.apikey, range);
    return request.then(function (series) { saveHistoryCache(cacheKey, series); return series; });
  }

  /* Resolve quotes for a set of holdings.

     Order of preference:
       1. `baked` — a {symbol: price} map already inside the encrypted
          payload (this is the seam the Robinhood MCP will fill).
       2. a fresh cache (15 min).
       3. a live provider call.
       4. manual prices the user typed in. */
  async function resolve(holdings, opts) {
    opts = opts || {};
    var cfg = opts.cfg || loadCfg();
    var need = symbolsNeeded(holdings);
    var quotes = {};
    var source = 'none';

    if (opts.baked && Object.keys(opts.baked).length) {
      Object.keys(opts.baked).forEach(function (k) { quotes[k] = opts.baked[k]; });
      source = 'baked';
    }

    var manual = cfg.manual || {};
    Object.keys(manual).forEach(function (k) {
      if (isFinite(manual[k])) quotes[k] = manual[k];
    });
    if (source === 'none' && Object.keys(manual).length) source = 'manual';

    var missing = need.filter(function (s) { return !isFinite(quotes[s]); });

    if (missing.length && !opts.force) {
      var cached = loadCache();
      if (cached && cached.quotes) {
        missing.forEach(function (s) {
          if (isFinite(cached.quotes[s])) quotes[s] = cached.quotes[s];
        });
        missing = need.filter(function (s) { return !isFinite(quotes[s]); });
        if (source === 'none') source = 'cache';
      }
    }

    if (missing.length && cfg.provider && cfg.apikey) {
      var live = cfg.provider === 'finnhub'
        ? await fetchFinnhub(missing, cfg.apikey)
        : await fetchTwelveData(missing, cfg.apikey);
      Object.keys(live).forEach(function (k) { quotes[k] = live[k]; });
      source = cfg.provider;
      saveCache(quotes);
    }

    return {
      quotes: quotes,
      source: source,
      missing: need.filter(function (s) { return !isFinite(quotes[s]); }),
      needed: need
    };
  }

  // ---------------------------------------------------------- valuation

  /* Attach .value / .kind / .symbol to each holding. Rows we cannot
     price keep value === null so the UI can say so honestly rather
     than silently treating them as zero. */
  function valuate(holdings, quotes) {
    quotes = quotes || {};
    return (holdings || []).map(function (h) {
      var c = classify(h);
      var value = null;
      if (c.priced) {
        value = Number(h.amount) || 0;
      } else if (c.symbol && isFinite(quotes[c.symbol])) {
        value = (Number(h.amount) || 0) * quotes[c.symbol];
      }
      return {
        platform: h.platform,
        label: h.label,
        amount: Number(h.amount) || 0,
        unit: h.unit,
        notes: h.notes || '',
        kind: c.kind,
        symbol: c.symbol,
        price: c.symbol && isFinite(quotes[c.symbol]) ? quotes[c.symbol] : null,
        value: value
      };
    });
  }

  function sumBy(rows, field) {
    var out = {};
    (rows || []).forEach(function (r) {
      if (!isFinite(r.value)) return;
      var k = r[field] || 'Other';
      out[k] = (out[k] || 0) + r.value;
    });
    return Object.keys(out).map(function (k) {
      return { label: k, value: out[k] };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  function total(rows) {
    return (rows || []).reduce(function (s, r) {
      return isFinite(r.value) ? s + r.value : s;
    }, 0);
  }

  function unpricedCount(rows) {
    return (rows || []).filter(function (r) { return !isFinite(r.value); }).length;
  }

  global.PNPrices = {
    loadCfg: loadCfg,
    saveCfg: saveCfg,
    clearCfg: clearCfg,
    classify: classify,
    symbolsNeeded: symbolsNeeded,
    resolve: resolve,
    history: history,
    valuate: valuate,
    sumBy: sumBy,
    total: total,
    unpricedCount: unpricedCount
  };
})(window);
