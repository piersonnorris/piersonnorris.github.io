(function () {
  'use strict';
  var stage = document.getElementById('showcase-wheel');
  var button = document.querySelector('.wheel-control');
  if (!stage || !button) return;

  button.addEventListener('click', function () {
    var paused = !stage.classList.contains('is-paused');
    stage.classList.toggle('is-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Resume orbit' : 'Pause orbit';
  });
})();
