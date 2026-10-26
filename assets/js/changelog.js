/* A small public-facing release note, shared by every page.
   Content is intentionally hand-curated: it describes meaningful public
   improvements, not internal commit noise. */
(function () {
  'use strict';

  var entries = [
    { date: 'Oct 25', title: 'The homepage got simpler', detail: 'The skyline and homepage jar card are gone, leaving the profile and selected work to lead the page.' },
    { date: 'Oct 25', title: 'Highlights became a filmstrip', detail: 'Six selected moments now sit in a simple swipeable row—no autoplay, just images, titles, and direct links.' },
    { date: 'Oct 25', title: 'The story has more texture', detail: 'New event photography, a rebuilt résumé, and a clearer view of the work behind the roles.' },
    { date: 'Oct 25', title: 'Athletics joined the site', detail: 'A focused page for training, competition, and the part movement plays in the larger story.' },
    { date: 'Sep 29', title: 'Atlas and Firefly Jar refined', detail: 'Two quieter ways to explore notes, ideas, and the connections between them.' }
  ];

  function esc(value) {
    return String(value).replace(/[&<>\"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }

  var root = document.createElement('aside');
  root.className = 'site-changelog';
  root.setAttribute('aria-label', 'Website changelog');
  root.innerHTML =
    '<button class="cl-trigger" type="button" aria-expanded="false" aria-controls="site-changelog-panel">' +
      '<span class="cl-trigger-dot" aria-hidden="true"></span><span>What\'s new</span>' +
    '</button>' +
    '<section class="cl-panel" id="site-changelog-panel" hidden>' +
      '<div class="cl-head"><div><p class="cl-kicker">Changelog</p><p class="cl-title">Built in public</p></div>' +
      '<button class="cl-close" type="button" aria-label="Minimize changelog">&times;</button></div>' +
      '<ol class="cl-list">' + entries.map(function (entry) {
        return '<li><time>' + esc(entry.date) + '</time><div><b>' + esc(entry.title) + '</b><span>' + esc(entry.detail) + '</span></div></li>';
      }).join('') + '</ol>' +
      '<p class="cl-foot">Meaningful public changes only. No analytics, no tracking.</p>' +
    '</section>';

  document.body.appendChild(root);
  var trigger = root.querySelector('.cl-trigger');
  var panel = root.querySelector('.cl-panel');
  var close = root.querySelector('.cl-close');

  function setOpen(open, returnFocus) {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    try { sessionStorage.setItem('pn-changelog-open', open ? '1' : '0'); } catch (ignore) {}
    if (open) close.focus();
    else if (returnFocus) trigger.focus();
  }

  trigger.addEventListener('click', function () { setOpen(panel.hidden, false); });
  close.addEventListener('click', function () { setOpen(false, true); });
  root.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
  });
})();
