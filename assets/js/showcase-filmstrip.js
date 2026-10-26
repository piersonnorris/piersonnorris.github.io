(function () {
  'use strict';
  var strip = document.getElementById('showcase-filmstrip');
  if (!strip) return;

  Array.prototype.forEach.call(document.querySelectorAll('[data-film-direction]'), function (button) {
    button.addEventListener('click', function () {
      var direction = button.getAttribute('data-film-direction') === 'prev' ? -1 : 1;
      strip.scrollBy({ left: direction * Math.max(232, strip.clientWidth * 0.72), behavior: 'smooth' });
    });
  });
})();
