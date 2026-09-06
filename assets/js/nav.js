/* ============================================================
   PNNav — U6: the mobile hamburger toggle, shared across every page
   so the behavior (and any future fix) lives in exactly one place.
   Purely progressive enhancement: with this script absent or blocked,
   .navlinks still renders (just always expanded, per site.css), so
   nothing breaks with JS off.
   ============================================================ */
(function () {
  'use strict';

  function wire(btn) {
    var nav = btn.closest('nav');
    var panel = (nav && nav.querySelector('.navlinks')) || document.querySelector('.navlinks');
    if (!panel) return;

    btn.addEventListener('click', function () {
      var open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });

    /* collapse again once a link is actually followed, so returning
       via back-button doesn't leave the menu stuck open */
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        panel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.navtoggle'), wire);
})();
