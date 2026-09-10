/* ============================================================
   PNVaultGroups — the vault's actual communities.

   Label propagation over the [[wikilink]] graph: every note starts
   in its own group, then repeatedly adopts the most common group
   among its neighbours until nothing changes. Chosen over modularity
   methods because it is short, has no tuning knob to fake, and runs
   in milliseconds at vault scale.

     PNVaultGroups.groups(notes, opts) → {clusters, labels, of, stats}

   Pure. No DOM, no layout, no Math.random — the iteration order is
   seeded, because Object.keys order would cluster the same vault
   differently on every load and turn this into a random-colour
   generator. Same input, same output, twice.

   Edges come from PNGraphify.build(), not a second copy of the
   wikilink scan, so the groups and the graph they are drawn over
   agree by construction.

   ---- labels are derived, never invented ----

   A cluster's name comes from the vault or the cluster does not get
   one, in this order:

     1. folder  — ≥60% of the cluster lives in one folder → 'docs/'
     2. tag     — ≥60% carry one tag                      → '#systems'
     3. hub     — the most-linked note in the cluster      → 'around ROADMAP'
     4. nothing — 'unnamed group · 6 notes'

   Rule 4 is the load-bearing one. The tempting version of this
   feature reads the notes and writes a clever theme for each blob;
   that would be the page inventing a claim about how someone thinks
   that no data supports, on a page whose whole premise is that the
   structure is real.
   ============================================================ */
(function (global) {
  'use strict';

  var MAJORITY = 0.6;      /* share of a cluster one folder/tag needs to name it */
  var MAX_ITER = 40;       /* propagation rounds before we call it settled */
  var SEED = 0x5EED;       /* fixed: the shuffle must be the same every load */

  /* mulberry32 — small, fast, and imul-based so it does not silently
     lose precision the way h * 16777619 did in observatory.js. */
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function key(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  /* 'docs/BLUEPRINT.md' → 'docs'. Notes published by obsidian-sync
     carry .folder already; ones read from elsewhere may only have a path. */
  function folderOf(n) {
    if (n.folder) return String(n.folder);
    var p = String(n.path || '');
    var cut = p.lastIndexOf('/');
    return cut < 0 ? '' : p.slice(0, cut);
  }

  /* 'ROADMAP — piersonnorris.com' → 'ROADMAP'. Long titles are the norm
     in a real vault and 'around ROADMAP — piersonnorris.com' does not
     fit on a hull. */
  function shortTitle(s) {
    return String(s || 'Untitled').split(/\s+[—–-]\s+|:\s/)[0].trim() || String(s || 'Untitled');
  }

  /* Whichever tally is highest, with its share of `total`. Ties break on
     the value itself so the answer never depends on insertion order. */
  function top(count, total) {
    var best = null, bestN = 0, keys = Object.keys(count).sort(), i;
    for (i = 0; i < keys.length; i++) {
      if (count[keys[i]] > bestN) { best = keys[i]; bestN = count[keys[i]]; }
    }
    return { value: best, share: total ? bestN / total : 0 };
  }

  /* The most common value in a list, with its share. */
  function plurality(values) {
    var count = {}, i;
    for (i = 0; i < values.length; i++) {
      if (values[i]) count[values[i]] = (count[values[i]] || 0) + 1;
    }
    return top(count, values.length);
  }

  /* One vote per note per distinct tag it carries — a note tagged six
     ways must not outvote five notes tagged one way, and reading only
     each note's first tag would miss the tag the cluster actually
     shares. */
  function topTag(mine) {
    var count = {};
    mine.forEach(function (note) {
      var seen = {};
      (note.tags || []).forEach(function (t) {
        var k = String(t);
        if (!key(k) || seen[k]) return;
        seen[k] = 1;
        count[k] = (count[k] || 0) + 1;
      });
    });
    return top(count, mine.length);
  }

  /* opts: {seed:int, majority:0..1}
     Returns cluster membership as indices into `notes` as it was passed
     in — not into some filtered copy — so callers can map straight back. */
  function groups(notes, opts) {
    opts = opts || {};
    var majority = opts.majority == null ? MAJORITY : opts.majority;
    var G = global.PNGraphify;
    if (!G || typeof G.build !== 'function') {
      throw new Error('PNVaultGroups needs PNGraphify — load assets/js/notes-graph.js first');
    }

    var all = notes || [];
    /* build() drops noteType blobs (calendar/board storage, not writing).
       Filter the same way so our indices line up with its node order, and
       keep a map back to the caller's indices. */
    var keep = [], source = [];
    all.forEach(function (n, i) {
      if (n && !n.noteType) { keep.push(i); source.push(n); }
    });

    var model = G.build(source, { tags: false, missing: false });
    var nodes = model.nodes;                       /* all kind 'note' here */
    var n = nodes.length;

    var at = {};
    nodes.forEach(function (node, i) { at[node.id] = i; });

    var adj = [];
    for (var i = 0; i < n; i++) adj.push([]);
    model.links.forEach(function (l) {
      var a = at[l.source], b = at[l.target];
      if (a == null || b == null) return;
      adj[a].push(b);
      adj[b].push(a);
    });

    // -------------------------------------------------- label propagation

    var label = [];
    for (i = 0; i < n; i++) label.push(i);

    /* Deterministic visiting order: node order is already stable (it is
       the vault's own note order), then one seeded shuffle per round. */
    var rand = rng(opts.seed == null ? SEED : opts.seed);
    var order = [];
    for (i = 0; i < n; i++) order.push(i);

    for (var round = 0; round < MAX_ITER; round++) {
      for (i = order.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }

      var moved = false;
      for (var k = 0; k < order.length; k++) {
        var v = order[k];
        if (!adj[v].length) continue;              /* orphans keep their own */
        var tally = {};
        for (var e = 0; e < adj[v].length; e++) {
          var lb = label[adj[v][e]];
          tally[lb] = (tally[lb] || 0) + 1;
        }
        /* Most common neighbouring label; ties go to the lowest label id
           rather than to whichever key the engine happened to list first. */
        var pick = label[v], pickN = tally[label[v]] || 0;
        var lbs = Object.keys(tally).map(Number).sort(function (a, b) { return a - b; });
        for (e = 0; e < lbs.length; e++) {
          if (tally[lbs[e]] > pickN) { pick = lbs[e]; pickN = tally[lbs[e]]; }
        }
        if (pick !== label[v]) { label[v] = pick; moved = true; }
      }
      if (!moved) break;
    }

    // -------------------------------------------------- collect + name

    var bucket = {};
    for (i = 0; i < n; i++) {
      (bucket[label[i]] || (bucket[label[i]] = [])).push(i);
    }

    var raw = Object.keys(bucket).map(function (id) { return bucket[id]; })
      /* Singletons are not clusters. A hull around one dot is noise, and
         an orphan is already told apart by being dark and alone. */
      .filter(function (members) { return members.length > 1; })
      /* Biggest first, ties on first appearance in the vault, so cluster 0
         is the same cluster — and therefore the same hue — every load. */
      .sort(function (a, b) {
        return b.length - a.length || Math.min.apply(null, a) - Math.min.apply(null, b);
      });

    var of = [];
    for (i = 0; i < all.length; i++) of.push(-1);

    var labels = {};
    var clusters = raw.map(function (members, ci) {
      members.forEach(function (m) { of[keep[m]] = ci; });

      var mine = members.map(function (m) { return source[m]; });

      /* Rule 3's hub is picked before we know whether we need it — it is
         also what the hull labels point at, and what a cluster is "around". */
      var hub = members.slice().sort(function (a, b) {
        return (nodes[b].links - nodes[a].links) || (a - b);
      })[0];

      var byFolder = plurality(mine.map(folderOf));
      var byTag = topTag(mine);

      var text, kind;
      if (byFolder.value && byFolder.share >= majority) {
        text = byFolder.value + '/'; kind = 'folder';
      } else if (byTag.value && byTag.share >= majority) {
        text = '#' + byTag.value; kind = 'tag';
      } else if (nodes[hub].links > 0) {
        text = 'around ' + shortTitle(nodes[hub].label); kind = 'hub';
      } else {
        text = 'unnamed group · ' + members.length + ' notes'; kind = 'unnamed';
      }

      labels[ci] = text;
      return {
        id: ci,
        size: members.length,
        members: members.map(function (m) { return keep[m]; }),
        hub: keep[hub],
        hubTitle: shortTitle(nodes[hub].label),
        label: text,
        labelKind: kind
      };
    });

    var clustered = clusters.reduce(function (a, c) { return a + c.size; }, 0);
    var orphans = nodes.filter(function (node) { return node.links === 0; }).length;

    return {
      clusters: clusters,
      labels: labels,
      of: of,
      stats: {
        count: clusters.length,
        notes: n,
        clustered: clustered,
        singletons: n - clustered,
        orphans: orphans,
        /* A folder that names every cluster has not told you anything
           about the grouping — worth surfacing rather than drawing six
           hulls that all say the same word. */
        labelsDistinct: Object.keys(clusters.reduce(function (a, c) {
          a[c.label] = 1; return a;
        }, {})).length
      }
    };
  }

  global.PNVaultGroups = { groups: groups, shortTitle: shortTitle };
}(typeof window !== 'undefined' ? window : this));
