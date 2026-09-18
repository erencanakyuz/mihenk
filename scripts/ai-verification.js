/* ==========================================================================
   MİHENK - AI verification note (prototype placeholder)

   Shows, on the moderator tab of an information post, where the planned
   AI verification stands. Nothing is verified here: the block only mirrors
   the queue rules so the presentation can show them. The model, its
   sources and the server contract are a TODO (see the plan, section 25).
   Priority rules mirrored:
     1. posts older than one hour that no moderator has handled, oldest first
     2. posts moderators already handled, oldest first
     3. everything else, oldest first
   ========================================================================== */
(function (M) {
  'use strict';
  var HOUR = 60 * 60 * 1000;

  function attention(p) { return ((p.messageCounts && p.messageCounts.coordination) || p.updates || 0) > 0; }
  function ageOf(p) { var at = p.createdAt ? new Date(p.createdAt).getTime() : NaN; return isNaN(at) ? 0 : Date.now() - at; }

  function status(p) {
    if (attention(p)) return { key: 'reviewed', label: 'Moderatör değerlendirdi', text: 'Yapay zeka bu paylaşımı ikinci öncelikte yeniden tarar ve moderatör sonucuyla karşılaştırır.' };
    if (ageOf(p) >= HOUR) return { key: 'queued', label: 'Yapay zeka sırasında', text: 'Bir saattir moderatör ilgilenmedi. Tanımlı kurum kaynakları taranıp bir etiket önerilecek (birinci öncelik).' };
    return { key: 'waiting', label: 'Moderatör bekleniyor', text: 'Bir saat içinde moderatör ilgilenmezse yapay zeka kurum kaynaklarını tarayıp etiket önerir.' };
  }

  function html(p) {
    var s = status(p);
    return '<section class="ai-note" data-ai="' + s.key + '" aria-label="Yapay zeka doğrulaması">' +
      '<div class="ai-note__head"><span class="ai-note__tag">Yapay zeka doğrulaması · Prototip</span><span class="ai-note__state">' + s.label + '</span></div>' +
      '<p>' + s.text + '</p>' +
      '<ul class="ai-note__legend" aria-label="Olası sonuçlar"><li data-verdict="true">Doğrulandı</li><li data-verdict="false">Yalan</li><li data-verdict="unclear">Muallak</li></ul>' +
      '</section>';
  }

  function infoPost(p) { return !!p && !p.need && p.kind !== 'request' && p.v !== 'official' && p.verification !== 'official'; }

  function place() {
    var page = document.getElementById('request-page');
    if (!page || !M.requestPageActive) return;
    var host = page.querySelector('.rp-conversation');
    if (!host) return;
    var channel = new URLSearchParams(location.search).get('channel') || 'coordination';
    var existing = host.querySelector('.ai-note');
    var p = M.getPost ? M.getPost(M.requestPageActive) : null;
    if (channel !== 'coordination' || !infoPost(p)) { if (existing) existing.remove(); return; }
    var s = status(p);
    if (existing) { if (existing.dataset.ai !== s.key) existing.outerHTML = html(p); return; }
    var strip = host.querySelector('.snote'), node = M.el(html(p));
    if (strip) strip.after(node); else host.prepend(node);
  }

  var frame = null;
  function schedule() { if (frame) return; frame = requestAnimationFrame(function () { frame = null; place(); }); }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  M.placeAiNote = place;
})(window.MIHENK = window.MIHENK || {});
