/* ============================================================
   PNAtlasUI — the workspace around PNAtlasData.

   Three views over one set of notes: a reader (note + metadata +
   backlinks), the real link graph (PNGraphify, the same engine the
   notes vault uses — this is not a decorative drawing), and a
   timeline of when each lesson was learned.

   Nothing here is private: the atlas is a curated, public data file
   (assets/js/atlas-data.js), not the encrypted vault. No PIN, no
   localStorage, no note content that isn't already in the repo.
   ============================================================ */
(function (global) {
  'use strict';

  var data = global.PNAtlasData;
  if (!data) return;

  var byId = {}, byTitle = {};
  data.notes.forEach(function (n) { byId[n.id] = n; byTitle[key(n.title)] = n; });

  var domainOf = {};
  data.domains.forEach(function (d) { domainOf[d.id] = d; });
  var sourceOf = {};
  data.sources.forEach(function (s) { sourceOf[s.id] = s; });

  var state = {
    view: 'reader',
    noteId: data.notes[0].id,
    query: '',
    domain: 'all',
    source: 'all',
    tag: ''
  };

  function key(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $(sel) { return document.querySelector(sel); }

  /* ---- link model -----------------------------------------------------
     Outgoing links come from [[wikilinks]] in the body; backlinks are the
     same relation read the other way. A link to a title that doesn't
     exist would be a broken atlas, so it is counted and shown, not
     silently dropped. */
  function outgoing(note) {
    var out = [], seen = {}, m, re = /\[\[([^\[\]]+)\]\]/g;
    while ((m = re.exec(note.body || ''))) {
      var title = m[1].split('|')[0].split('#')[0].trim();
      var k = key(title);
      if (!k || seen[k]) continue;
      seen[k] = true;
      out.push({ title: title, note: byTitle[k] || null });
    }
    return out;
  }

  function backlinks(note) {
    return data.notes.filter(function (other) {
      if (other.id === note.id) return false;
      return outgoing(other).some(function (l) { return l.note && l.note.id === note.id; });
    });
  }

  /* Links are counted as unique undirected PAIRS, the same way
     PNGraphify counts them — two notes that link to each other are one
     connection, not two, and the graph's stat strip would otherwise
     disagree with the status bar on the same page. */
  function stats() {
    var pairs = {}, broken = 0, orphans = 0;
    data.notes.forEach(function (n) {
      var out = outgoing(n);
      out.forEach(function (l) {
        if (!l.note) { broken += 1; return; }
        pairs[n.id < l.note.id ? n.id + '|' + l.note.id : l.note.id + '|' + n.id] = true;
      });
      if (!out.length && !backlinks(n).length) orphans += 1;
    });
    var links = Object.keys(pairs).length;
    return {
      notes: data.notes.length,
      links: links,
      broken: broken,
      orphans: orphans,
      perNote: data.notes.length ? (links / data.notes.length).toFixed(1) : '0'
    };
  }

  /* ---- filtering ---- */
  function matches(note) {
    if (state.domain !== 'all' && note.domain !== state.domain) return false;
    if (state.source !== 'all' && note.source !== state.source) return false;
    if (state.tag && (note.tags || []).indexOf(state.tag) < 0) return false;
    if (!state.query) return true;
    var q = key(state.query);
    return key(note.title).indexOf(q) >= 0 ||
      key(note.body).indexOf(q) >= 0 ||
      (note.tags || []).some(function (t) { return key(t).indexOf(q) >= 0; });
  }

  function visible() { return data.notes.filter(matches); }

  /* ---- sidebar: domains → notes, plus the two filter axes ---- */
  function renderSidebar() {
    var shown = visible();
    var groups = data.domains.map(function (d) {
      var items = shown.filter(function (n) { return n.domain === d.id; });
      if (!items.length) return '';
      return '<section class="ex-group">' +
        '<h3 class="ex-head"><span class="ex-swatch" style="background:' + d.color + '"></span>' +
          esc(d.label) + '<span class="ex-count">' + items.length + '</span></h3>' +
        '<ul class="ex-list">' + items.map(function (n) {
          return '<li><button type="button" class="ex-item' + (n.id === state.noteId ? ' on' : '') +
            '" data-note="' + esc(n.id) + '">' + esc(n.title) + '</button></li>';
        }).join('') + '</ul>' +
      '</section>';
    }).join('');

    $('#explorer').innerHTML = groups ||
      '<p class="ex-empty">Nothing matches that. <button type="button" class="linkish" data-clear>Clear the filters</button></p>';

    var sourceChips = [{ id: 'all', label: 'Every source' }].concat(data.sources).map(function (s) {
      var count = s.id === 'all' ? data.notes.length
        : data.notes.filter(function (n) { return n.source === s.id; }).length;
      return '<button type="button" class="chip" data-source="' + esc(s.id) + '" aria-pressed="' +
        (state.source === s.id) + '">' + esc(s.label) + '<i>' + count + '</i></button>';
    }).join('');
    $('#sources').innerHTML = sourceChips;

    var tags = {};
    data.notes.forEach(function (n) { (n.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
    $('#tags').innerHTML = Object.keys(tags).sort().map(function (t) {
      return '<button type="button" class="tag" data-tag="' + esc(t) + '" aria-pressed="' +
        (state.tag === t) + '">#' + esc(t) + '<i>' + tags[t] + '</i></button>';
    }).join('');
  }

  /* ---- reader ---- */
  function bodyHTML(note) {
    /* escape first, then turn [[links]] into buttons — never the other
       way around, or a note title could inject markup */
    return esc(note.body).replace(/\[\[([^\[\]]+)\]\]/g, function (_, raw) {
      var title = raw.split('|')[0].split('#')[0].trim();
      var target = byTitle[key(title)];
      if (!target) return '<span class="wl broken" title="No note with this title">' + esc(raw) + '</span>';
      return '<button type="button" class="wl" data-note="' + esc(target.id) + '">' + esc(raw) + '</button>';
    });
  }

  function renderReader() {
    var note = byId[state.noteId] || data.notes[0];
    var d = domainOf[note.domain] || { label: note.domain, color: '#8b95a5' };
    var s = sourceOf[note.source] || { label: note.source, when: '' };
    var out = outgoing(note);
    var back = backlinks(note);

    $('#reader').innerHTML =
      '<article class="note" style="--dc:' + d.color + '">' +
        '<p class="note-crumb">' + esc(d.label) + ' <span aria-hidden="true">/</span> ' + esc(s.label) + '</p>' +
        '<h2 class="note-title">' + esc(note.title) + '</h2>' +
        '<dl class="frontmatter">' +
          '<div><dt>domain</dt><dd>' + esc(d.label) + '</dd></div>' +
          '<div><dt>learned</dt><dd>' + esc(prettyDate(note.learned)) + '</dd></div>' +
          '<div><dt>source</dt><dd>' + esc(s.label) + '</dd></div>' +
          '<div><dt>tags</dt><dd>' + (note.tags || []).map(function (t) {
            return '<button type="button" class="tag mini" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
          }).join(' ') + '</dd></div>' +
        '</dl>' +
        ((note.evidence || []).length
          ? '<ul class="evidence">' + note.evidence.map(function (e) {
              return '<li>' + esc(e) + '</li>';
            }).join('') + '</ul>'
          : '') +
        '<div class="note-body"><p>' + bodyHTML(note) + '</p></div>' +
      '</article>';

    $('#inspector').innerHTML =
      panel('Links out', out.length, out.map(function (l) {
        return l.note
          ? '<button type="button" class="side-link" data-note="' + esc(l.note.id) + '">' + esc(l.note.title) + '</button>'
          : '<span class="side-link broken">' + esc(l.title) + '</span>';
      })) +
      panel('Linked from', back.length, back.map(function (n) {
        return '<button type="button" class="side-link" data-note="' + esc(n.id) + '">' + esc(n.title) + '</button>';
      })) +
      panel('Same source', 0, data.notes.filter(function (n) {
        return n.source === note.source && n.id !== note.id;
      }).slice(0, 6).map(function (n) {
        return '<button type="button" class="side-link" data-note="' + esc(n.id) + '">' + esc(n.title) + '</button>';
      }));
  }

  function panel(title, count, items) {
    return '<section class="ins-panel">' +
      '<h3>' + esc(title) + '<span>' + items.length + '</span></h3>' +
      (items.length ? '<div class="ins-items">' + items.join('') + '</div>'
        : '<p class="ins-empty">none</p>') +
    '</section>';
  }

  function prettyDate(v) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(v || ''));
    if (!m) return String(v || '—');
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[Number(m[2]) - 1] + ' ' + m[1];
  }

  /* ---- timeline: the same notes, read as a chronology ---- */
  function renderTimeline() {
    var shown = visible().slice().sort(function (a, b) {
      return String(b.learned).localeCompare(String(a.learned)) || a.title.localeCompare(b.title);
    });
    $('#timeline').innerHTML = shown.length ? shown.map(function (n) {
      var d = domainOf[n.domain] || { label: n.domain, color: '#8b95a5' };
      var s = sourceOf[n.source] || { label: n.source };
      return '<li class="tl-row" style="--dc:' + d.color + '">' +
        '<span class="tl-when">' + esc(prettyDate(n.learned)) + '</span>' +
        '<span class="tl-dot" aria-hidden="true"></span>' +
        '<button type="button" class="tl-note" data-note="' + esc(n.id) + '">' +
          '<b>' + esc(n.title) + '</b>' +
          '<span class="tl-meta">' + esc(s.label) + ' · ' + esc(d.label) + '</span>' +
        '</button>' +
      '</li>';
    }).join('') : '<li class="ex-empty">Nothing matches that filter.</li>';
  }

  /* ---- graph: the real link graph, drawn by the vault's own engine ---- */
  var graphMounted = false;
  function mountGraph() {
    if (graphMounted || !global.PNGraphify) return;
    graphMounted = true;
    global.PNGraphify.mount($('#graph'), {
      title: 'Atlas link graph',
      getNotes: function () {
        return visible().map(function (n) {
          return { id: n.id, title: n.title, body: n.body, tags: n.tags || [] };
        });
      },
      onOpen: function (noteId) { select(noteId); setView('reader'); }
    });
    /* 33 tags against 25 notes: leaving tag nodes on by default buries
       the link structure the graph is here to show. The engine's own
       toggle is left in place, so they are one click away. */
    var tagToggle = $('#graph .pg-t[data-t="tags"]');
    if (tagToggle && tagToggle.classList.contains('on')) tagToggle.click();
  }

  /* ---- view switching ---- */
  function setView(view) {
    state.view = view;
    ['reader', 'graph', 'timeline'].forEach(function (v) {
      var pane = $('#pane-' + v);
      var tab = $('#view-' + v);
      var on = v === view;
      pane.hidden = !on;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    $('#inspector').hidden = view !== 'reader';
    $('.workspace').classList.toggle('ins-off', view !== 'reader');
    if (view === 'graph') mountGraph();
    if (view === 'timeline') renderTimeline();
  }

  function select(noteId) {
    if (!byId[noteId]) return;
    state.noteId = noteId;
    renderSidebar();
    renderReader();
    try { history.replaceState(null, '', '#' + noteId); } catch (err) { location.hash = noteId; }
  }

  function renderStatus() {
    var s = stats();
    $('#status').innerHTML =
      '<span><b>' + s.notes + '</b> notes</span>' +
      '<span><b>' + s.links + '</b> links</span>' +
      '<span><b>' + s.perNote + '</b> links/note</span>' +
      '<span><b>' + s.orphans + '</b> orphans</span>' +
      '<span><b>' + s.broken + '</b> broken</span>' +
      '<span class="status-when">updated ' + esc(data.updated) + '</span>';
  }

  function renderAll() {
    renderSidebar();
    renderReader();
    if (state.view === 'timeline') renderTimeline();
    renderStatus();
  }

  /* ---- wiring ---- */
  function init() {
    var domainChips = [{ id: 'all', label: 'All domains', color: '#8b95a5' }].concat(data.domains);
    $('#domains').innerHTML = domainChips.map(function (d) {
      var count = d.id === 'all' ? data.notes.length
        : data.notes.filter(function (n) { return n.domain === d.id; }).length;
      return '<button type="button" class="chip dom" data-domain="' + esc(d.id) + '" aria-pressed="' +
        (state.domain === d.id) + '" style="--dc:' + d.color + '">' +
        '<span class="ex-swatch" style="background:' + d.color + '"></span>' + esc(d.label) + '<i>' + count + '</i></button>';
    }).join('');

    /* one delegated listener: every note button on the page, in any pane */
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-note],[data-domain],[data-source],[data-tag],[data-clear]');
      if (!t) return;
      if (t.dataset.note) { select(t.dataset.note); if (state.view !== 'reader') setView('reader'); return; }
      if (t.dataset.domain) { state.domain = t.dataset.domain; }
      if (t.dataset.source) { state.source = t.dataset.source; }
      if (t.dataset.tag) { state.tag = state.tag === t.dataset.tag ? '' : t.dataset.tag; }
      if (t.hasAttribute('data-clear')) {
        state.domain = 'all'; state.source = 'all'; state.tag = ''; state.query = '';
        $('#search').value = '';
      }
      Array.prototype.forEach.call(document.querySelectorAll('[data-domain]'), function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.domain === state.domain));
      });
      renderAll();
      if (state.view === 'timeline') renderTimeline();
    });

    var search = $('#search');
    search.addEventListener('input', function () {
      state.query = search.value;
      renderSidebar();
      if (state.view === 'timeline') renderTimeline();
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { search.value = ''; state.query = ''; renderSidebar(); }
      if (e.key === 'Enter') {
        var first = visible()[0];
        if (first) { select(first.id); setView('reader'); }
      }
    });

    /* ⌘K / Ctrl-K from anywhere, the way the real app does it */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.focus();
        search.select();
      }
    });

    ['reader', 'graph', 'timeline'].forEach(function (v, i, all) {
      var tab = $('#view-' + v);
      tab.addEventListener('click', function () { setView(v); });
      tab.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var next = all[(i + step + all.length) % all.length];
        setView(next);
        $('#view-' + next).focus();
      });
    });

    var hash = (location.hash || '').replace(/^#/, '');
    if (byId[hash]) state.noteId = hash;

    renderAll();
    setView('reader');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
