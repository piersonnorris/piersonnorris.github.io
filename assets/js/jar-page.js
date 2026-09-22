/* ============================================================
   /jar/ — the page around PNJar.

   PNJar draws the jar and the swarm; this file is the UI beside it:
   the readout, the open/seal and links buttons, the group chips,
   and one fixed-height slot that shows either the index of every
   note in the jar or the card for the one you picked.

   Data flow, one way: PNVaultPublic (the published snapshot) →
   PNJar.mount() → callbacks (onState, onSelect, onHover) → here.
   Nothing on this page writes back to the data.
   ============================================================ */
(function () {
  'use strict';

  var data = window.PNVaultPublic;
  var host = document.getElementById('jar');
  if (!host || !window.PNJar || !data) return;

  var REPO = 'https://github.com/piersonnorris/piersonnorris.github.io/blob/master/';

  var $ = function (id) { return document.getElementById(id); };
  var readEl = $('read'), toggleBtn = $('toggle'), linksBtn = $('links');
  var groupsEl = $('groups'), indexWrap = $('indexwrap'), indexEl = $('index'), card = $('card');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* A few plain sentences from the top of a note, with the Markdown
     taken off. Headings, tables, code and rules are skipped — the card
     is a preview, the full note is one link away. */
  function excerpt(body, max) {
    var out = [], len = 0, fence = false;
    String(body || '').split(/\r?\n/).some(function (line) {
      var t = line.trim();
      if (/^(```|~~~)/.test(t)) { fence = !fence; return false; }
      if (fence || !t || /^(#|\||---|\*\*\*|<)/.test(t)) return false;
      t = t.replace(/^>\s?/, '').replace(/^[-*+]\s+/, '')
        .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, function (_, a, b) { return b || a; })
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`]+/g, '');
      if (!t) return false;
      out.push(t); len += t.length;
      return len >= max;
    });
    var s = out.join(' ');
    return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s;
  }

  /* The publish step reads hex colours in the docs as #tags. They are
     not tags anyone wrote, so the card does not show them. */
  function realTags(tags) {
    return (tags || []).filter(function (t) { return !/^[0-9a-f]{3,8}$/i.test(t); });
  }

  // ------------------------------------------------------------- mount

  var jar = PNJar.mount(host, {
    data: data,
    onState: function (state) {
      var open = state === 'open';
      toggleBtn.setAttribute('aria-pressed', String(open));
      toggleBtn.querySelector('span').textContent = open ? 'Seal the jar' : 'Open the jar';
      if (!open) jar && jar.select(null);
    },
    onSelect: function (it) { showCard(it); },
    onHover: function (it) {
      Array.prototype.forEach.call(indexEl.children, function (li) {
        li.classList.toggle('is-hover', !!it && +li.getAttribute('data-i') === it.i2);
      });
    }
  });

  /* a stable index into jar.items, for the list and the card */
  jar.items.forEach(function (it, i) { it.i2 = i; });

  // ----------------------------------------------------------- readout

  var s = jar.stats, g = jar.groups.length;
  readEl.innerHTML =
    '<b>' + s.notes + '</b> notes · <b>' + s.links + '</b> links · ' +
    '<b>' + g + '</b> ' + (g === 1 ? 'group' : 'groups') + ' · ' +
    '<b>' + s.orphans + '</b> ' + (s.orphans === 1 ? 'orphan' : 'orphans') +
    (jar.capped ? '<br><span class="warn">showing ' + jar.items.length + ' of ' + jar.total +
      ' — ranked by links</span>' : '');

  // ----------------------------------------------------------- buttons

  toggleBtn.addEventListener('click', function () {
    if (jar.state() === 'open') jar.seal(); else jar.open();
  });

  linksBtn.addEventListener('click', function () {
    var on = linksBtn.getAttribute('aria-pressed') !== 'true';
    linksBtn.setAttribute('aria-pressed', String(on));
    jar.showLinks(on);
    if (on && jar.state() !== 'open') jar.open();
  });

  // ------------------------------------------------------------ groups

  /* Only worth showing when there is more than one — a single chip
     that highlights everything is not a filter. */
  if (g > 1) {
    groupsEl.hidden = false;
    groupsEl.innerHTML = '<p class="jar-slot-h">Groups</p>' + jar.groups.map(function (c, i) {
      var hue = PNJar.HUES[i % PNJar.HUES.length];
      return '<button type="button" class="jchip" aria-pressed="false" data-c="' + i + '">' +
        '<i style="background:' + hue + '"></i>' + esc(c.label) + ' <small>' + c.size + '</small></button>';
    }).join('');
    groupsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var on = b.getAttribute('aria-pressed') !== 'true';
      Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-c]'), function (x) {
        x.setAttribute('aria-pressed', String(x === b && on));
      });
      if (jar.state() !== 'open') jar.open();
      showCard(null);
      jar.focusGroup(on ? +b.getAttribute('data-c') : null);
    });
  }

  // ------------------------------------------------------------- index

  var order = jar.items.slice().sort(function (a, b) {
    return (b.links - a.links) || a.short.localeCompare(b.short);
  });
  indexEl.innerHTML = order.map(function (it) {
    return '<li data-i="' + it.i2 + '"><button type="button">' +
      '<i style="background:' + it.hue + ';box-shadow:0 0 8px ' + it.hue + '"></i>' +
      '<span>' + esc(it.short) + '</span>' +
      '<small>' + it.links + (it.links === 1 ? ' link' : ' links') + '</small></button></li>';
  }).join('');

  function pick(i) {
    if (jar.state() !== 'open') jar.open();
    jar.select(i);
  }

  indexEl.addEventListener('click', function (e) {
    var li = e.target.closest('[data-i]');
    if (li) pick(+li.getAttribute('data-i'));
  });
  indexEl.addEventListener('pointerover', function (e) {
    var li = e.target.closest('[data-i]');
    if (jar.state() === 'open') jar.preview(li ? +li.getAttribute('data-i') : null);
  });
  indexEl.addEventListener('pointerleave', function () { jar.preview(null); });
  indexEl.addEventListener('focusin', function (e) {
    var li = e.target.closest('[data-i]');
    if (li && jar.state() === 'open') jar.preview(+li.getAttribute('data-i'));
  });

  // -------------------------------------------------------------- card

  var byId = {};
  jar.items.forEach(function (it) { byId[it.id] = it; });

  function showCard(it) {
    if (!it) {
      card.hidden = true; card.innerHTML = '';
      indexWrap.hidden = false;
      return;
    }
    var note = it.note || {};
    var near = (jar.near[it.id] || []).map(function (id) { return byId[id]; })
      .filter(Boolean)
      .filter(function (x, i, a) { return a.indexOf(x) === i; })
      .sort(function (a, b) { return b.links - a.links; });
    var tags = realTags(note.tags);
    /* a group name only says something when there is more than one */
    var group = g > 1 && it.cluster >= 0 && jar.groups[it.cluster] ? jar.groups[it.cluster].label : null;
    var text = excerpt(note.body, 300);

    card.innerHTML =
      '<button type="button" class="jcard-x" data-close aria-label="Close this note">×</button>' +
      '<p class="jcard-eyebrow"><i style="background:' + it.hue + ';box-shadow:0 0 10px ' + it.hue + '"></i>' +
        esc(it.folder || 'vault') + (group && !it.orphan ? ' · ' + esc(group) : '') +
        (it.orphan ? ' · orphan' : '') + '</p>' +
      '<h2 id="card-title">' + esc(it.title) + '</h2>' +
      '<p class="jcard-stats">' + it.links + (it.links === 1 ? ' link' : ' links') +
        (tags.length ? ' · ' + tags.map(function (t) { return '<span class="jtag">#' + esc(t) + '</span>'; }).join(' ') : '') +
      '</p>' +
      (text ? '<p class="jcard-text">' + esc(text) + '</p>' : '') +
      (near.length ? '<p class="jar-slot-h">Linked notes</p><ul class="jcard-near">' +
        near.map(function (x) {
          return '<li><button type="button" data-go="' + x.i2 + '">' +
            '<i style="background:' + x.hue + '"></i>' + esc(x.short) + '</button></li>';
        }).join('') + '</ul>'
        : '<p class="jcard-text dim">Nothing links here yet, and it links nowhere.</p>') +
      (it.path ? '<a class="jcard-read" href="' + REPO + encodeURI(it.path) + '" rel="noopener">' +
        'Read the full note →</a>' : '');

    indexWrap.hidden = true;
    card.hidden = false;
    card.scrollTop = 0;
    /* on a phone the slot sits under the jar; bring the card into view */
    if (window.matchMedia('(max-width:900px)').matches) {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  card.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { jar.select(null); return; }
    var go = e.target.closest('[data-go]');
    if (go) jar.select(+go.getAttribute('data-go'));
  });

  /* The index and readout were written after mount(), and the web
     fonts may still be arriving — both change the panels' size, so
     the jar re-measures once they have settled. */
  jar.relayout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(jar.relayout);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (jar.selected()) jar.select(null);
    else if (jar.state() === 'open') jar.seal();
  });
}());
