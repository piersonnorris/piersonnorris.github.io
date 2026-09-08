/* ============================================================
   PNVaultPage — /vault/, the public read-only vault reader.

   Reads window.PNVaultPublic (written by tools/obsidian-sync.js
   --public) and renders it as a workspace: folder tree, markdown
   reader, real link graph, backlinks inspector, timeline, ⌘K palette.

   Three deliberate differences from /notes/, which is the same idea
   behind a PIN:

   1. READ-ONLY. No editor, no delete, no export. The writing surface
      is Obsidian; this is a window onto a published snapshot of it.
   2. NOTHING IS FETCHED. The bundle arrives as a <script> tag, so the
      page works over file:// and makes no network request at all.
   3. UNRESOLVED LINKS STAY VISIBLE. On the private page a broken
      [[link]] is an invitation to write that note. Here it is just
      true, and hiding it would flatter the vault.

   Shell classes (.workspace, .wbar, .wside, .wpane, .wins, .wstatus)
   are the atlas's, loaded from atlas.css. vault.css adds only what a
   vault needs that an atlas does not: a folder tree, markdown styles
   and the command palette.
   ============================================================ */
(function (global) {
  'use strict';

  var data = global.PNVaultPublic;
  var md = global.PNMarkdown;

  function $(sel) { return document.querySelector(sel); }
  function esc(s) { return md.esc(s); }
  function key(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  /* ---------------- index ---------------- */

  var notes = (data && data.notes) || [];
  var byPath = {};
  var byTitle = {};
  notes.forEach(function (n) {
    byPath[n.path] = n;
    /* First writer wins, matching Obsidian: if two notes share a title,
       links go to the one that sorts first rather than silently to the
       last one loaded. */
    if (!byTitle[key(n.title)]) byTitle[key(n.title)] = n;
  });

  /* Every [[target]] written in a note, in order, resolved or not.
     Code spans and fences are stripped first, exactly as PNGraphify does
     it — a doc explaining `[[wikilinks]]` is not linking to a note called
     "wikilinks", and the sidebar counts and the graph's counts have to
     agree or the same page contradicts itself. */
  function linkable(body) {
    return String(body || '')
      .replace(/```[\s\S]*?(?:```|$)/g, ' ')
      .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
      .replace(/`[^`\n]*`/g, ' ');
  }

  function targets(note) {
    var out = [];
    linkable(note.body).replace(/\[\[([^\[\]|]+)(?:\|[^\[\]]+)?\]\]/g, function (_, raw) {
      var name = raw.split('#')[0].trim();
      if (!name || key(name) === key(note.title)) return '';
      out.push({ name: name, note: byTitle[key(name)] || null });
      return '';
    });
    return out;
  }

  function outgoing(note) {
    var seen = {};
    return targets(note).filter(function (t) {
      if (!t.note || seen[t.note.path]) return false;
      seen[t.note.path] = true;
      return true;
    });
  }

  function unresolved(note) {
    var seen = {};
    return targets(note).filter(function (t) {
      if (t.note || seen[key(t.name)]) return false;
      seen[key(t.name)] = true;
      return true;
    });
  }

  function backlinks(note) {
    return notes.filter(function (other) {
      return other.path !== note.path && outgoing(other).some(function (t) { return t.note.path === note.path; });
    });
  }

  /* Counted the way PNGraphify counts: unique undirected pairs, so the
     status bar and the graph's own stat strip cannot disagree. */
  function stats() {
    var pairs = {};
    var missing = 0;
    var orphans = 0;
    notes.forEach(function (n) {
      var out = outgoing(n);
      missing += unresolved(n).length;
      out.forEach(function (t) {
        pairs[[n.path, t.note.path].sort().join('')] = true;
      });
      if (!out.length && !backlinks(n).length) orphans += 1;
    });
    var links = Object.keys(pairs).length;
    return {
      notes: notes.length,
      links: links,
      density: notes.length ? (links * 2 / notes.length).toFixed(1) : '0.0',
      orphans: orphans,
      missing: missing
    };
  }

  /* ---------------- state ---------------- */

  var state = { selected: notes.length ? notes[0].path : null, query: '', view: 'reader', open: {} };
  notes.forEach(function (n) { if (n.folder) state.open[n.folder] = true; });

  function matches(note) {
    var q = key(state.query);
    if (!q) return true;
    return key(note.title).indexOf(q) >= 0 ||
      key(note.path).indexOf(q) >= 0 ||
      key(note.body).indexOf(q) >= 0 ||
      (note.tags || []).some(function (t) { return key(t).indexOf(q) >= 0; });
  }

  function visible() { return notes.filter(matches); }
  function current() { return byPath[state.selected] || null; }

  /* ---------------- the folder tree ---------------- */

  function tree() {
    var shown = visible();
    var folders = {};
    var roots = [];
    shown.forEach(function (n) {
      if (!n.folder) { roots.push(n); return; }
      (folders[n.folder] = folders[n.folder] || []).push(n);
    });

    var html = Object.keys(folders).sort().map(function (folder) {
      /* A search narrows the tree, so folders open themselves while one
         is running — a hit hidden inside a collapsed folder reads as no
         hit at all. */
      var open = state.query ? true : state.open[folder] !== false;
      return '<div class="tree-folder">' +
        '<button type="button" class="tree-head" data-folder="' + esc(folder) + '" aria-expanded="' + open + '">' +
          '<span class="tree-caret" aria-hidden="true">' + (open ? '▾' : '▸') + '</span>' +
          '<span class="tree-name">' + esc(folder) + '</span>' +
          '<span class="tree-count">' + folders[folder].length + '</span>' +
        '</button>' +
        (open ? '<ul class="tree-list">' + folders[folder].map(fileRow).join('') + '</ul>' : '') +
        '</div>';
    }).join('');

    html += roots.length ? '<ul class="tree-list tree-root">' + roots.map(fileRow).join('') + '</ul>' : '';
    $('#tree').innerHTML = html || '<p class="ex-empty">Nothing matches that search.</p>';
  }

  /* The filename is the label, not the note title — that is what Obsidian
     shows, and titles here are whole document headings ("BLUEPRINT —
     piersonnorris.com") that truncate to nothing in a 220px column. The
     title is the button's tooltip instead. */
  function fileRow(note) {
    var name = note.path.split('/').pop().replace(/\.(md|markdown)$/i, '');
    return '<li><button type="button" class="tree-file' + (note.path === state.selected ? ' on' : '') + '" ' +
      'data-path="' + esc(note.path) + '" title="' + esc(note.title) + '">' +
      '<span class="tree-doc" aria-hidden="true"></span>' +
      '<span class="tree-label">' + esc(name) + '</span>' +
      '</button></li>';
  }

  /* ---------------- the reader ---------------- */

  function resolver(from) {
    return function (title) {
      var hit = byTitle[key(String(title).split('#')[0].trim())];
      if (!hit) return { missing: true };
      if (hit.path === from.path) return { href: '#' + hit.path };
      return { href: '#' + hit.path };
    };
  }

  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toISOString().slice(0, 10);
  }

  function renderReader() {
    var note = current();
    if (!note) {
      $('#reader').innerHTML = '<p class="ex-empty">No note selected.</p>';
      return;
    }
    var words = String(note.body || '').split(/\s+/).filter(Boolean).length;
    $('#reader').innerHTML =
      '<article class="note">' +
        '<p class="note-crumb">' + esc(note.folder || 'vault root') + '</p>' +
        '<h1 class="note-title">' + esc(note.title) + '</h1>' +
        '<dl class="frontmatter">' +
          '<div><dt>path</dt><dd class="mono">' + esc(note.path) + '</dd></div>' +
          '<div><dt>updated</dt><dd>' + when(note.updated) + '</dd></div>' +
          '<div><dt>length</dt><dd>' + words + ' words</dd></div>' +
          '<div><dt>tags</dt><dd>' + ((note.tags || []).length
            ? note.tags.map(function (t) { return '<span class="tag mini">#' + esc(t) + '</span>'; }).join(' ')
            : '—') + '</dd></div>' +
        '</dl>' +
        '<div class="md">' + md.render(note.body, { resolve: resolver(note) }) + '</div>' +
      '</article>';
  }

  function renderInspector() {
    var note = current();
    var box = $('#inspector');
    if (!note) { box.innerHTML = ''; return; }

    var back = backlinks(note);
    var out = outgoing(note);
    var miss = unresolved(note);
    var heads = md.outline(note.body).filter(function (h) { return h.level <= 3; });

    function panel(title, count, body) {
      return '<section class="ins-panel"><h3>' + title + ' <span>' + count + '</span></h3>' + body + '</section>';
    }
    function links(list) {
      return list.length
        ? '<div class="ins-items">' + list.map(function (n) {
            return '<button type="button" class="side-link" data-path="' + esc(n.path) + '">' + esc(n.title) + '</button>';
          }).join('') + '</div>'
        : '<p class="ins-empty">none</p>';
    }

    box.innerHTML =
      panel('Backlinks', back.length, links(back)) +
      panel('Links out', out.length, links(out.map(function (t) { return t.note; }))) +
      panel('Unresolved', miss.length, miss.length
        ? '<div class="ins-items">' + miss.map(function (t) {
            return '<span class="side-link broken" title="No note with this title in the published snapshot">' +
              esc(t.name) + '</span>';
          }).join('') + '</div>'
        : '<p class="ins-empty">none</p>') +
      (heads.length ? panel('On this page', heads.length,
        '<div class="ins-items">' + heads.map(function (h) {
          return '<a class="side-link toc lvl' + h.level + '" href="#' + esc(h.id) + '">' + esc(h.text) + '</a>';
        }).join('') + '</div>') : '');
  }

  function renderTimeline() {
    var rows = visible().slice().sort(function (a, b) {
      return String(b.updated || '').localeCompare(String(a.updated || ''));
    });
    $('#timeline').innerHTML = rows.length ? rows.map(function (n) {
      return '<li class="tl-row">' +
        '<span class="tl-when">' + when(n.updated) + '</span>' +
        '<span class="tl-dot" aria-hidden="true"></span>' +
        '<button type="button" class="tl-note" data-path="' + esc(n.path) + '">' +
          '<b>' + esc(n.title) + '</b>' +
          '<span class="tl-meta">' + esc(n.path) + '</span>' +
        '</button></li>';
    }).join('') : '<li class="ex-empty">Nothing matches that search.</li>';
  }

  function renderStatus() {
    var s = stats();
    var waived = (data.waived || []).length
      ? '<span class="status-waived" title="A scrub rule was deliberately waived when this snapshot was published">' +
        'waived: ' + esc(data.waived.join(', ')) + '</span>'
      : '';
    $('#status').innerHTML =
      '<span><b>' + s.notes + '</b> notes</span>' +
      '<span><b>' + s.links + '</b> links</span>' +
      '<span>' + s.density + ' per note</span>' +
      '<span><b>' + s.orphans + '</b> orphans</span>' +
      '<span><b>' + s.missing + '</b> unresolved</span>' +
      waived +
      '<span class="status-when">' + esc(data.label || 'vault') + ' · synced ' + when(data.generatedAt) + '</span>';
  }

  function renderTags() {
    var counts = {};
    notes.forEach(function (n) { (n.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var names = Object.keys(counts).sort();
    $('#tags').innerHTML = names.length
      ? names.map(function (t) {
          return '<button type="button" class="tag" data-tag="' + esc(t) + '"' +
            ' aria-pressed="' + (key(state.query) === key(t)) + '">#' + esc(t) + ' <i>' + counts[t] + '</i></button>';
        }).join('')
      : '<p class="ins-empty">no tags in this snapshot</p>';
  }

  function renderAll() {
    tree();
    renderTags();
    renderReader();
    renderInspector();
    renderTimeline();
    renderStatus();
  }

  /* ---------------- graph ---------------- */

  var graphMounted = false;
  function mountGraph() {
    if (graphMounted || !global.PNGraphify) return;
    graphMounted = true;
    global.PNGraphify.mount($('#graph'), {
      title: 'Vault link graph',
      getNotes: function () {
        return visible().map(function (n) {
          return { id: n.path, title: n.title, body: n.body, tags: n.tags || [] };
        });
      },
      onOpen: function (id) { select(id); setView('reader'); }
    });
    /* Tag nodes off on mount, same call the atlas makes and for the same
       reason: they outnumber the notes and bury the link structure. The
       engine's own toggle puts them back. */
    var toggle = $('#graph .pg-t[data-t="tags"]');
    if (toggle && toggle.classList.contains('on')) toggle.click();
  }

  /* ---------------- views ---------------- */

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
    /* The inspector describes a selected note; graph and timeline have
       none, so the column is dropped rather than left standing empty. */
    var ins = view === 'reader';
    $('#inspector').hidden = !ins;
    $('.workspace').classList.toggle('ins-off', !ins);
    if (view === 'graph') mountGraph();
  }

  function select(path) {
    if (!byPath[path]) return;
    state.selected = path;
    if (global.history && history.replaceState) history.replaceState(null, '', '#' + path);
    renderAll();
    var pane = $('#pane-reader');
    if (pane && !pane.hidden) pane.scrollTop = 0;
  }

  /* ---------------- command palette ---------------- */

  var palette = { open: false, items: [], active: 0 };

  function paletteItems(q) {
    var out = [];
    notes.forEach(function (n) {
      out.push({ label: n.title, hint: n.path, path: n.path, anchor: '' });
      md.outline(n.body).forEach(function (h) {
        /* A note's title usually IS its H1, so listing both puts the same
           row in the palette twice. */
        if (h.level <= 3 && key(h.text) !== key(n.title)) {
          out.push({ label: h.text, hint: n.title, path: n.path, anchor: h.id });
        }
      });
    });
    var needle = key(q);
    if (!needle) return out.slice(0, 40);
    return out.filter(function (item) {
      return key(item.label).indexOf(needle) >= 0 || key(item.hint).indexOf(needle) >= 0;
    }).slice(0, 40);
  }

  function drawPalette() {
    $('#pal-list').innerHTML = palette.items.length
      ? palette.items.map(function (item, i) {
          return '<li><button type="button" class="pal-item' + (i === palette.active ? ' on' : '') + '" data-i="' + i + '">' +
            '<span class="pal-label">' + esc(item.label) + '</span>' +
            '<span class="pal-hint">' + esc(item.hint) + (item.anchor ? ' §' : '') + '</span>' +
            '</button></li>';
        }).join('')
      : '<li class="pal-empty">No match.</li>';
  }

  function openPalette() {
    palette.open = true;
    palette.active = 0;
    palette.items = paletteItems('');
    $('#palette').hidden = false;
    $('#pal-input').value = '';
    drawPalette();
    $('#pal-input').focus();
  }

  function closePalette() {
    palette.open = false;
    $('#palette').hidden = true;
    $('#search').focus();
  }

  function runPalette(i) {
    var item = palette.items[i];
    if (!item) return;
    closePalette();
    setView('reader');
    select(item.path);
    if (item.anchor) {
      var target = document.getElementById(item.anchor);
      if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }

  /* ---------------- wiring ---------------- */

  function fromHash() {
    var hash = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
    if (hash && byPath[hash]) state.selected = hash;
  }

  function init() {
    if (!data || !notes.length) {
      $('.workspace').innerHTML =
        '<p class="ex-empty" style="padding:28px">No snapshot has been published yet. ' +
        'Run <span class="mono">node tools/obsidian-sync.js --public</span> to write one.</p>';
      return;
    }

    fromHash();
    renderAll();
    setView('reader');

    /* One delegated click handler: every button that opens a note carries
       data-path, wherever it lives — tree, inspector, timeline, reader. */
    document.addEventListener('click', function (event) {
      var open = event.target.closest('[data-path]');
      if (open) { select(open.getAttribute('data-path')); return; }

      var folder = event.target.closest('[data-folder]');
      if (folder) {
        var name = folder.getAttribute('data-folder');
        state.open[name] = state.open[name] === false;
        tree();
        return;
      }

      var tag = event.target.closest('[data-tag]');
      if (tag) {
        var value = tag.getAttribute('data-tag');
        state.query = key(state.query) === key(value) ? '' : value;
        $('#search').value = state.query;
        renderAll();
        return;
      }

      var pal = event.target.closest('.pal-item');
      if (pal) { runPalette(Number(pal.getAttribute('data-i'))); return; }

      if (palette.open && !event.target.closest('.pal-box')) closePalette();
    });

    $('#search').addEventListener('input', function () {
      state.query = this.value;
      renderAll();
    });

    ['reader', 'graph', 'timeline'].forEach(function (v) {
      $('#view-' + v).addEventListener('click', function () { setView(v); });
    });

    $('#pal-input').addEventListener('input', function () {
      palette.items = paletteItems(this.value);
      palette.active = 0;
      drawPalette();
    });

    $('#pal-input').addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var step = event.key === 'ArrowDown' ? 1 : -1;
        palette.active = (palette.active + step + palette.items.length) % (palette.items.length || 1);
        drawPalette();
        var on = $('#pal-list .pal-item.on');
        if (on) on.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        runPalette(palette.active);
      }
    });

    document.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (palette.open) closePalette(); else openPalette();
        return;
      }
      if (event.key === 'Escape' && palette.open) { event.preventDefault(); closePalette(); }
    });

    global.addEventListener('hashchange', function () {
      var hash = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
      if (byPath[hash] && hash !== state.selected) select(hash);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}(window));
