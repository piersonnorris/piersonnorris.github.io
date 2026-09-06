/* ============================================================
   PNNotes — the Obsidian-style note UI, mounted onto any element.

   Two modes, one engine (see vault.js):
     mode 'general'  → /notes/           plain notes, tags, backlinks
     mode 'stocks'   → /tools/tracker/   adds a ticker field and a
                                         structured Outlook panel

   PNNotes.mount({
     el:        container element
     scope:     'general' | 'stocks'      (storage namespace)
     mode:      'general' | 'stocks'      (which fields to show)
     tickers:   ['NVDA', …]               (optional datalist source)
     pin:       '1234'                    (optional: unlock silently)
     lockCopy:  {title, blurb}            (optional lock-screen text)
   })
   ============================================================ */
(function (global) {
  'use strict';

  var STANCES = ['Bullish', 'Neutral', 'Bearish', 'Watching', 'Exiting'];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function relTime(iso) {
    if (!iso) return '';
    var then = new Date(iso).getTime();
    if (!isFinite(then)) return '';
    var s = Math.max(0, (Date.now() - then) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  // ------------------------------------------------------------------

  function mount(opts) {
    var root = opts.el;
    var mode = opts.mode || 'general';
    var vault = new global.PNVault.Vault(opts.scope || mode);
    var state = { selected: null, query: '', tag: null, preview: false, saveTimer: null };

    if (!vault.storageAvailable()) {
      root.innerHTML =
        '<div class="nv-warn"><b>Browser storage is blocked.</b> Notes are saved in this ' +
        'browser only, so they need localStorage. Turn off private browsing or allow site ' +
        'data for this page, then reload.</div>';
      return null;
    }

    root.classList.add('nv');
    root.innerHTML = '';

    // ---------------- lock screen ----------------

    var lock = el('form', 'nv-lock');
    var copy = opts.lockCopy || {};
    lock.innerHTML =
      '<div class="nv-lockcard">' +
        '<span class="nv-glyph">' + (vault.exists() ? 'ENCRYPTED' : 'NEW VAULT') + '</span>' +
        '<h2>' + esc(copy.title || (mode === 'stocks' ? 'Stock notes' : 'Notes')) + '</h2>' +
        '<p>' + esc(copy.blurb || (vault.exists()
          ? 'Enter your PIN to decrypt. Notes live in this browser only — nothing is uploaded.'
          : 'Set a PIN to create the vault. Notes are encrypted in this browser only, never uploaded, never in the repo.')) + '</p>' +
        '<div class="nv-pinrow">' +
          '<input type="password" class="nv-pin" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="Vault PIN">' +
          '<button type="submit" class="btn primary nv-go">' + (vault.exists() ? 'Unlock' : 'Create') + '</button>' +
        '</div>' +
        '<p class="nv-msg" aria-live="polite"></p>' +
        '<p class="finetext">AES-256-GCM · PBKDF2 600k · this device only</p>' +
      '</div>';
    root.appendChild(lock);

    var app = el('div', 'nv-app');
    app.hidden = true;
    root.appendChild(app);

    var pinEl = lock.querySelector('.nv-pin');
    var msgEl = lock.querySelector('.nv-msg');
    var goEl = lock.querySelector('.nv-go');

    lock.addEventListener('submit', function (e) {
      e.preventDefault();
      var pin = pinEl.value.trim();
      if (!pin) { pinEl.focus(); return; }
      doUnlock(pin);
    });

    function doUnlock(pin) {
      goEl.disabled = true;
      msgEl.className = 'nv-msg';
      msgEl.textContent = 'decrypting…';
      return vault.unlock(pin).then(function () {
        pinEl.value = '';
        goEl.disabled = false;
        msgEl.textContent = '';
        lock.hidden = true;
        app.hidden = false;
        buildApp();
        renderAll();
        return true;
      }).catch(function () {
        goEl.disabled = false;
        msgEl.className = 'nv-msg err';
        msgEl.textContent = 'Wrong PIN.';
        pinEl.value = '';
        pinEl.focus();
        return false;
      });
    }

    var ready = opts.pin ? doUnlock(opts.pin) : Promise.resolve(false);

    // ---------------- app shell ----------------

    var side, listEl, tagsEl, searchEl, mainEl, countEl;

    function buildApp() {
      if (app.dataset.built) return;
      app.dataset.built = '1';

      app.innerHTML =
        '<aside class="nv-side">' +
          '<div class="nv-toolbar">' +
            '<button type="button" class="btn primary nv-new">+ New</button>' +
            '<button type="button" class="btn nv-export" title="Download every note as .md files in a zip">Export</button>' +
            '<label class="btn nv-importlbl" title="Import .md files from your Obsidian vault">Import' +
              '<input type="file" class="nv-import" accept=".md,.markdown,.txt" multiple hidden></label>' +
            '<button type="button" class="btn nv-lockbtn" title="Lock this vault">Lock</button>' +
          '</div>' +
          '<input type="search" class="nv-search" placeholder="Search notes…" aria-label="Search notes">' +
          '<div class="nv-tags"></div>' +
          '<p class="nv-count"></p>' +
          '<ul class="nv-list"></ul>' +
        '</aside>' +
        '<section class="nv-main"></section>';

      side = app.querySelector('.nv-side');
      listEl = app.querySelector('.nv-list');
      tagsEl = app.querySelector('.nv-tags');
      searchEl = app.querySelector('.nv-search');
      mainEl = app.querySelector('.nv-main');
      countEl = app.querySelector('.nv-count');

      app.querySelector('.nv-new').addEventListener('click', function () {
        vault.create_note({ title: 'Untitled', body: '' }).then(function (n) {
          state.selected = n.id;
          renderAll();
          var t = mainEl.querySelector('.nv-title');
          if (t) { t.focus(); t.select(); }
        });
      });

      app.querySelector('.nv-export').addEventListener('click', function () {
        var out = vault.exportZip();
        if (!out) { flash('Nothing to export yet.'); return; }
        download(out.blob, out.name);
      });

      app.querySelector('.nv-import').addEventListener('change', function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        vault.importMarkdown(files).then(function (r) {
          flash('Imported ' + r.added + ' note' + (r.added === 1 ? '' : 's') +
                (r.skipped ? ' · ' + r.skipped + ' skipped' : ''));
          renderAll();
        }).catch(function () { flash('Import failed.'); });
        e.target.value = '';
      });

      app.querySelector('.nv-lockbtn').addEventListener('click', function () {
        vault.lock();
        state.selected = null;
        app.hidden = true;
        lock.hidden = false;
        lock.querySelector('.nv-glyph').textContent = 'ENCRYPTED';
        goEl.textContent = 'Unlock';
        pinEl.focus();
      });

      searchEl.addEventListener('input', function () {
        state.query = searchEl.value;
        renderList();
      });
    }

    function flash(text) {
      var f = app.querySelector('.nv-flash') || el('p', 'nv-flash');
      f.textContent = text;
      if (!f.parentNode) side.insertBefore(f, side.querySelector('.nv-list'));
      clearTimeout(f._t);
      f._t = setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 3200);
    }

    // ---------------- rendering ----------------

    function renderAll() { renderTags(); renderList(); renderMain(); }

    function renderTags() {
      var tags = vault.tags();
      if (!tags.length) { tagsEl.innerHTML = ''; return; }
      tagsEl.innerHTML = tags.slice(0, 14).map(function (t) {
        return '<button type="button" class="nv-tag' +
          (state.tag === t.tag ? ' on' : '') + '" data-tag="' + esc(t.tag) + '">#' +
          esc(t.tag) + '<span>' + t.count + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(tagsEl.querySelectorAll('.nv-tag'), function (b) {
        b.addEventListener('click', function () {
          state.tag = (state.tag === b.dataset.tag) ? null : b.dataset.tag;
          renderTags(); renderList();
        });
      });
    }

    function renderList() {
      var notes = vault.search(state.query, { tag: state.tag });
      countEl.textContent = notes.length + (notes.length === 1 ? ' note' : ' notes');

      if (!notes.length) {
        listEl.innerHTML = '<li class="nv-none">' +
          (vault.list().length ? 'Nothing matches.' : 'No notes yet — hit <b>+ New</b>.') + '</li>';
        return;
      }

      listEl.innerHTML = notes.map(function (n) {
        var stance = n.outlook && n.outlook.stance
          ? '<span class="nv-stance s-' + esc(String(n.outlook.stance).toLowerCase()) + '">' +
            esc(n.outlook.stance) + '</span>' : '';
        var tick = n.ticker ? '<span class="nv-ticker">' + esc(n.ticker) + '</span>' : '';
        var preview = (n.body || '').replace(/[#*`>\[\]-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 72);
        return '<li><button type="button" class="nv-item' +
          (state.selected === n.id ? ' on' : '') + '" data-id="' + n.id + '">' +
          '<span class="nv-itemtop">' + tick + '<span class="nv-itemtitle">' + esc(n.title || 'Untitled') +
          '</span>' + stance + '</span>' +
          '<span class="nv-itemmeta">' + esc(relTime(n.updated)) +
          (preview ? ' · ' + esc(preview) : '') + '</span></button></li>';
      }).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.nv-item'), function (b) {
        b.addEventListener('click', function () {
          state.selected = b.dataset.id;
          state.preview = false;
          renderList(); renderMain();
        });
      });
    }

    function renderMain() {
      var note = state.selected ? vault.get(state.selected) : null;

      if (!note) {
        mainEl.innerHTML =
          '<div class="nv-blank">' +
            '<svg class="nv-blankicon" width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<path d="M4 13h4l1.5 3h5L16 13h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
              '<path d="M6 6h12l2 7v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6l2-7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
            '</svg>' +
            '<p class="eyebrow">' + (mode === 'stocks' ? 'Stock notes' : 'Notes') + '</p>' +
            '<h3>' + (vault.list().length ? 'Pick a note' : 'Your vault is empty') + '</h3>' +
            '<p class="muted">' + (vault.list().length
              ? 'Choose one on the left, or start a new one.'
              : 'Write here, export as Markdown, drop the files into Obsidian. Import works the same way in reverse.') +
            '</p>' +
          '</div>';
        return;
      }

      var isStock = (mode === 'stocks');
      var o = note.outlook || {};

      mainEl.innerHTML =
        '<form class="nv-edit" autocomplete="off">' +
          '<div class="nv-edithead">' +
            '<input type="text" class="nv-title" value="' + esc(note.title) + '" placeholder="Title" aria-label="Note title">' +
            '<div class="nv-editbtns">' +
              '<button type="button" class="btn nv-preview">' + (state.preview ? 'Edit' : 'Preview') + '</button>' +
              '<button type="button" class="btn danger nv-del">Delete</button>' +
            '</div>' +
          '</div>' +

          (isStock
            ? '<div class="nv-row">' +
                '<label class="fld nv-f-ticker"><span>Ticker</span>' +
                  '<input type="text" class="nv-tick" list="nv-tickers" value="' + esc(note.ticker || '') +
                  '" placeholder="NVDA" maxlength="12"></label>' +
                '<label class="fld nv-f-stance"><span>Stance</span>' +
                  '<select class="nv-stancesel"><option value="">—</option>' +
                  STANCES.map(function (s) {
                    return '<option' + (o.stance === s ? ' selected' : '') + '>' + s + '</option>';
                  }).join('') + '</select></label>' +
                '<label class="fld nv-f-conv"><span>Conviction</span>' +
                  '<select class="nv-conv"><option value="0">—</option>' +
                  [1, 2, 3, 4, 5].map(function (i) {
                    return '<option value="' + i + '"' + (+o.conviction === i ? ' selected' : '') + '>' + i + ' / 5</option>';
                  }).join('') + '</select></label>' +
                '<label class="fld nv-f-hz"><span>Horizon</span>' +
                  '<input type="text" class="nv-hz" value="' + esc(o.horizon || '') + '" placeholder="6–12 mo"></label>' +
                '<label class="fld nv-f-tgt"><span>Target</span>' +
                  '<input type="text" class="nv-tgt" value="' + esc(o.target || '') + '" placeholder="$230"></label>' +
              '</div>' +
              '<div class="nv-row2">' +
                '<label class="fld"><span>Thesis</span><textarea class="nv-thesis" rows="3" placeholder="Why you own it — in your own words.">' + esc(o.thesis || '') + '</textarea></label>' +
                '<label class="fld"><span>Risks</span><textarea class="nv-risks" rows="3" placeholder="What would make you wrong.">' + esc(o.risks || '') + '</textarea></label>' +
              '</div>'
            : '') +

          '<label class="fld"><span>Tags — comma separated</span>' +
            '<input type="text" class="nv-tags-in" value="' + esc((note.tags || []).join(', ')) + '" placeholder="research, macro"></label>' +

          (state.preview
            ? '<div class="nv-render md">' + global.PNVault.render(note.body) + '</div>'
            : '<label class="fld"><span>Note — Markdown, [[wikilinks]] and #tags work</span>' +
              '<textarea class="nv-body" rows="16" placeholder="Write here…">' + esc(note.body) + '</textarea></label>') +

          '<p class="nv-saved" aria-live="polite"></p>' +
          renderBacklinks(note) +
        '</form>';

      wire(note);
    }

    function renderBacklinks(note) {
      var back = vault.backlinks(note.title);
      back = back.filter(function (b) { return b.id !== note.id; });
      if (!back.length) return '';
      return '<div class="nv-backlinks"><p class="eyebrow">Linked from</p><ul>' +
        back.map(function (b) {
          return '<li><button type="button" class="nv-blink" data-id="' + b.id + '">' +
            esc(b.title) + '</button></li>';
        }).join('') + '</ul></div>';
    }

    function wire(note) {
      var form = mainEl.querySelector('.nv-edit');
      var saved = form.querySelector('.nv-saved');

      form.addEventListener('submit', function (e) { e.preventDefault(); });

      function collect() {
        var patch = {
          title: form.querySelector('.nv-title').value.trim() || 'Untitled',
          tags: form.querySelector('.nv-tags-in').value
            .split(',').map(function (t) { return t.trim(); }).filter(Boolean)
        };
        var bodyEl = form.querySelector('.nv-body');
        if (bodyEl) patch.body = bodyEl.value;

        if (mode === 'stocks') {
          patch.ticker = (form.querySelector('.nv-tick').value || '').trim().toUpperCase() || null;
          var stance = form.querySelector('.nv-stancesel').value;
          var conv = parseInt(form.querySelector('.nv-conv').value, 10) || 0;
          var hz = form.querySelector('.nv-hz').value.trim();
          var tgt = form.querySelector('.nv-tgt').value.trim();
          var thesis = form.querySelector('.nv-thesis').value.trim();
          var risks = form.querySelector('.nv-risks').value.trim();
          patch.outlook = (stance || conv || hz || tgt || thesis || risks)
            ? { stance: stance, conviction: conv, horizon: hz, target: tgt, thesis: thesis, risks: risks }
            : null;
        }
        return patch;
      }

      function queueSave() {
        clearTimeout(state.saveTimer);
        saved.textContent = 'saving…';
        state.saveTimer = setTimeout(function () {
          vault.update(note.id, collect()).then(function () {
            saved.textContent = 'saved ' + new Date().toLocaleTimeString('en-US',
              { hour: 'numeric', minute: '2-digit' });
            renderList(); renderTags();
          }).catch(function (err) {
            saved.textContent = (err && err.message === 'storage-full')
              ? 'Could not save — browser storage is full.'
              : 'Could not save.';
          });
        }, 450);
      }

      Array.prototype.forEach.call(
        form.querySelectorAll('input, textarea, select'),
        function (i) { i.addEventListener('input', queueSave); i.addEventListener('change', queueSave); }
      );

      form.querySelector('.nv-preview').addEventListener('click', function () {
        clearTimeout(state.saveTimer);
        vault.update(note.id, collect()).then(function () {
          state.preview = !state.preview;
          renderMain();
        });
      });

      form.querySelector('.nv-del').addEventListener('click', function () {
        if (!confirm('Delete “' + (note.title || 'Untitled') + '”? This cannot be undone.')) return;
        vault.remove(note.id).then(function () {
          state.selected = null;
          renderAll();
        });
      });

      Array.prototype.forEach.call(form.querySelectorAll('.nv-blink'), function (b) {
        b.addEventListener('click', function () {
          state.selected = b.dataset.id; state.preview = false; renderList(); renderMain();
        });
      });

      /* [[wikilink]] in preview → jump to that note, or create it */
      Array.prototype.forEach.call(form.querySelectorAll('.wikilink'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var target = a.dataset.wikilink;
          var hit = vault.list().filter(function (n) {
            return (n.title || '').toLowerCase() === String(target).toLowerCase();
          })[0];
          if (hit) {
            state.selected = hit.id; state.preview = false; renderList(); renderMain();
          } else {
            vault.create_note({ title: target }).then(function (n) {
              state.selected = n.id; state.preview = false; renderAll();
            });
          }
        });
      });
    }

    /* ticker datalist for the stock mode */
    if (opts.tickers && opts.tickers.length && !document.getElementById('nv-tickers')) {
      var dl = el('datalist');
      dl.id = 'nv-tickers';
      dl.innerHTML = opts.tickers.map(function (t) {
        return '<option value="' + esc(t) + '">';
      }).join('');
      document.body.appendChild(dl);
    }

    return {
      vault: vault,
      ready: ready,
      unlockWith: doUnlock,
      refresh: function () { if (vault.isUnlocked()) renderAll(); },
      /* Upsert generated tracker notes without exposing them outside the
         encrypted stock vault. The caller supplies ordinary Markdown. */
      upsertNote: function (fields) {
        if (!vault.isUnlocked()) return Promise.resolve(false);
        fields = fields || {};
        var title = String(fields.title || '').trim();
        if (!title) return Promise.resolve(false);
        var ticker = String(fields.ticker || '').toUpperCase();
        var hit = vault.list().filter(function (n) {
          if (ticker) return String(n.ticker || '').toUpperCase() === ticker && n.title === title;
          return n.title === title;
        })[0];
        var write = hit ? vault.update(hit.id, fields) : vault.create_note(fields);
        return write.then(function (note) {
          state.selected = note.id;
          state.preview = true;
          renderAll();
          return true;
        });
      },
      /* Inline purchase journals in the portfolio table use the same
         encrypted stock vault and export as ordinary Obsidian notes. */
      getPositionJournal: function (key) {
        if (!vault.isUnlocked()) return null;
        return vault.list().filter(function (n) { return n.positionKey === key; })[0] || null;
      },
      savePositionJournal: function (fields) {
        if (!vault.isUnlocked()) return Promise.resolve(false);
        fields = fields || {};
        var key = String(fields.positionKey || '');
        if (!key) return Promise.resolve(false);
        var hit = vault.list().filter(function (n) { return n.positionKey === key; })[0];
        var patch = {
          title: String(fields.title || fields.ticker || 'Position') + ' purchase journal',
          ticker: String(fields.ticker || '').toUpperCase() || null,
          positionKey: key,
          purchases: Array.isArray(fields.purchases) ? fields.purchases : [],
          body: String(fields.body || ''),
          tags: ['portfolio', 'purchases']
        };
        var write = hit ? vault.update(hit.id, patch) : vault.create_note(patch);
        return write.then(function (note) {
          renderAll();
          return note;
        });
      },
      /* Ticker-level "outlook" notes: same concept openTicker() already
         creates (title "<TICKER> outlook", keyed by ticker with no
         positionKey so it's distinct from a per-platform purchase
         journal). These two just let a caller read/write that note's
         body inline without switching the vault panel's selection --
         used by the Charts tab's inline per-stock notes. */
      getTickerNote: function (ticker) {
        if (!vault.isUnlocked()) return null;
        ticker = String(ticker || '').toUpperCase();
        if (!ticker) return null;
        return vault.list().filter(function (n) { return !n.positionKey && String(n.ticker || '').toUpperCase() === ticker; })[0] || null;
      },
      saveTickerNote: function (ticker, body) {
        if (!vault.isUnlocked()) return Promise.resolve(false);
        ticker = String(ticker || '').toUpperCase();
        if (!ticker) return Promise.resolve(false);
        var hit = vault.list().filter(function (n) { return !n.positionKey && String(n.ticker || '').toUpperCase() === ticker; })[0];
        var patch = {
          title: hit ? hit.title : (ticker + ' outlook'),
          ticker: ticker,
          body: String(body || ''),
          tags: hit && Array.isArray(hit.tags) ? hit.tags : ['portfolio', 'outlook']
        };
        var write = hit ? vault.update(hit.id, patch) : vault.create_note(patch);
        return write.then(function (note) { renderAll(); return note; });
      },
      openPositionJournal: function (fields) {
        if (!vault.isUnlocked()) return false;
        fields = fields || {};
        var key = String(fields.positionKey || '');
        var hit = vault.list().filter(function (n) { return n.positionKey === key; })[0];
        if (hit) {
          state.selected = hit.id;
          state.preview = false;
          renderAll();
          return true;
        }
        return vault.create_note({
          title: String(fields.title || fields.ticker || 'Position') + ' purchase journal',
          ticker: String(fields.ticker || '').toUpperCase() || null,
          positionKey: key,
          purchases: [], body: '', tags: ['portfolio', 'purchases']
        }).then(function (note) {
          state.selected = note.id;
          state.preview = false;
          renderAll();
          return true;
        });
      },
      getCalendarData: function () {
        if (!vault.isUnlocked()) return null;
        var hit = vault.list().filter(function (n) { return n.noteType === 'portfolio-calendar'; })[0];
        return hit ? {
          id: hit.id,
          events: Array.isArray(hit.calendarEvents) ? hit.calendarEvents.slice() : [],
          dividendOverrides: hit.dividendOverrides && typeof hit.dividendOverrides === 'object' ? hit.dividendOverrides : {}
        } : { id: null, events: [], dividendOverrides: {} };
      },
      saveCalendarData: function (events, dividendOverrides) {
        if (!vault.isUnlocked()) return Promise.resolve(false);
        var hit = vault.list().filter(function (n) { return n.noteType === 'portfolio-calendar'; })[0];
        var patch = {
          title: 'Portfolio calendar', noteType: 'portfolio-calendar',
          calendarEvents: Array.isArray(events) ? events : [],
          dividendOverrides: dividendOverrides && typeof dividendOverrides === 'object' ? dividendOverrides : {},
          tags: ['portfolio', 'calendar'], body: hit ? hit.body || '' : ''
        };
        var write = hit ? vault.update(hit.id, patch) : vault.create_note(patch);
        return write.then(function (note) { renderAll(); return note; });
      },
      getProjectBoard: function () {
        if (!vault.isUnlocked()) return null;
        var hit = vault.list().filter(function (n) { return n.noteType === 'portfolio-project-board'; })[0];
        return hit ? { id: hit.id, goals: Array.isArray(hit.projectGoals) ? hit.projectGoals.slice() : [] } : { id: null, goals: [] };
      },
      saveProjectBoard: function (goals) {
        if (!vault.isUnlocked()) return Promise.resolve(false);
        var hit = vault.list().filter(function (n) { return n.noteType === 'portfolio-project-board'; })[0];
        var patch = {
          title: 'Portfolio project board', noteType: 'portfolio-project-board',
          projectGoals: Array.isArray(goals) ? goals : [],
          tags: ['portfolio', 'projects', 'goals'], body: hit ? hit.body || '' : ''
        };
        var write = hit ? vault.update(hit.id, patch) : vault.create_note(patch);
        return write.then(function (note) { renderAll(); return note; });
      },
      openProjectBoard: function () {
        if (!vault.isUnlocked()) return false;
        var hit = vault.list().filter(function (n) { return n.noteType === 'portfolio-project-board'; })[0];
        if (!hit) return false;
        state.selected = hit.id;
        state.preview = true;
        renderAll();
        return true;
      },
      /* used by the vault graph to jump straight to a note */
      openNoteById: function (id) {
        if (!vault.isUnlocked()) return false;
        var hit = vault.get(id);
        if (!hit) return false;
        state.selected = hit.id;
        state.preview = true;
        renderAll();
        return true;
      },
      /* used by the tracker page to jump straight into a ticker's note */
      openTicker: function (ticker) {
        if (!vault.isUnlocked()) return false;
        var matches = vault.list().filter(function (n) {
          return (n.ticker || '').toUpperCase() === String(ticker).toUpperCase();
        });
        var hit = matches.filter(function (n) { return !n.positionKey; })[0] || matches[0];
        if (hit) { state.selected = hit.id; }
        else {
          return vault.create_note({ title: ticker + ' outlook', ticker: ticker })
            .then(function (n) { state.selected = n.id; renderAll(); return true; });
        }
        state.preview = false;
        renderAll();
        return true;
      }
    };
  }

  global.PNNotes = { mount: mount, STANCES: STANCES };
})(window);
