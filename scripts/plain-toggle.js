/* ==========================================================================
   MİHENK - low-bandwidth mode: one obvious switch, one obvious way back.
   A prominent toggle row sits under the crisis head card; while the mode is
   on, a fixed top bar offers "Normal görünüme dön". Uses M.setPlain and the
   'plain' event; the old #lowband switch in "Görünüm seçenekleri" still works.
   ========================================================================== */
(function (M) {
  'use strict';
  var BARS = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 19h3v-5H4zM10 19h3V9h-3zM16 19h3V4h-3z"/></svg>';

  function active() { return !!(M.state && M.state.plain); }

  function rowHTML() {
    var on = active();
    return '<div class="band-row" id="band-row"><button class="band-toggle" id="band-toggle" type="button" aria-pressed="' + on + '">' + BARS +
      '<span class="band-toggle__text"><b>Düşük bant genişliği modu</b><small>Görselleri ve hareketleri kapatır; metin ve işlemler kalır.</small></span>' +
      '<span class="band-toggle__state">' + (on ? 'Açık' : 'Kapalı') + '</span></button></div>';
  }

  function syncRow() {
    var button = document.getElementById('band-toggle');
    if (!button) return;
    var on = active(), label = on ? 'Açık' : 'Kapalı', state = button.querySelector('.band-toggle__state');
    if (button.getAttribute('aria-pressed') !== String(on)) button.setAttribute('aria-pressed', String(on));
    if (state && state.textContent !== label) state.textContent = label;
  }

  function placeRow() {
    var head = document.querySelector('#panel-crisis .crisis-head');
    if (!head) return;
    if (head.querySelector('#band-row')) { syncRow(); return; }
    var anchor = head.querySelector('.crisis-card') || head.querySelector('.crisis-actions');
    var node = M.el(rowHTML());
    if (anchor) anchor.after(node); else head.prepend(node);
  }

  function placeExit() {
    var bar = document.getElementById('band-exit');
    if (!active()) { if (bar) bar.remove(); return; }
    if (bar) return;
    bar = M.el('<div class="band-exit" id="band-exit" role="region" aria-label="Düşük bant modu"><span>' + BARS + 'Düşük bant modu açık</span><button type="button" id="band-exit-button">Normal görünüme dön</button></div>');
    document.body.prepend(bar);
  }

  function update() { syncRow(); placeExit(); }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#band-toggle')) { M.setPlain(!active()); update(); return; }
    if (e.target.closest('#band-exit-button')) {
      M.setPlain(false); update();
      var toggle = document.getElementById('band-toggle');
      if (toggle) toggle.focus({ preventScroll: true });
    }
  });
  if (M.on) M.on('plain', update);

  var frame = null;
  new MutationObserver(function () {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = null; placeRow(); placeExit(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})(window.MIHENK = window.MIHENK || {});
