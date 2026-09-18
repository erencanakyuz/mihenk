/* ==========================================================================
   MİHENK - bölüm açıklamaları (section notes)
   Her sekmenin listesinin hemen üstünde, oranın ne olduğunu ve orada nasıl
   davranılacağını bir iki cümleyle söyleyen kısa bir şerit. "Anladım"
   şeridi kapatır ve bunu bölüm başına hatırlar; okuyucu aynı açıklamayı
   ikinci kez okumak zorunda kalmaz.
   Renk yalnızca üst kenarı kıran künye plakasında taşınır: plakanın metni
   bölümün adı, şeridin metni ise her zaman normal metin renginde kalır.
   ========================================================================== */
(function (M) {
  'use strict';
  var esc = M.CATALOG.esc;

  /* tone: styles/section-notes.css içindeki data-tone eşleşmeleri */
  var NOTES = {
    foryou: { tone: 'accent', text: 'Genel akışın. Kriz bilgisi ve yardım çağrıları için Kriz Var sekmesine geç.' },
    following: { tone: 'accent', text: 'Takip ettiğin hesapların paylaşımları.' },
    'crisis:all': { tone: 'accent', text: 'Bölgeden gelen tüm paylaşımlar. Paylaşmadan önce doğrulama etiketine bak.' },
    'crisis:resmi': { tone: 'official', text: 'Resmî kurum duyuruları. Yorumlar kapalıdır; bilgiyi olduğu gibi aktar.' },
    'crisis:yardim': { tone: 'accent', text: 'Açık yardım talepleri. Destek verebiliyorsan talebi aç ve öneri yaz.' },
    'crisis:dogrulanmis': { tone: 'verified', text: 'Birden fazla kaynakla doğrulanmış bilgiler. Paylaşırken kaynağı belirt.' },
    'crisis:dogrulanmamis': { tone: 'unverified', text: 'Henüz doğrulanmamış bildirimler. Gördüysen tartışmada belirt; yaymadan önce bekle.' },
    'crisis:mine': { tone: 'accent', text: 'Kendi yardım taleplerin. Durumu güncelle, karşılandıysa kapat.' },
    'request:coordination': { tone: 'accent' },
    'request:community': { tone: 'verified' }
  };

  /* Künye plakası bölümün adını değil şeridin ne olduğunu söyler: bölüm adı
     zaten listenin başlığında (.clist__h) ve sekmede yazıyor, plaka onu
     tekrarlamaz. Hangi bölüm olduğunu plakanın tonu ve ikonu taşır. */
  var PLATE = 'Bölüm notu';
  var TONE_ICON = { accent: 'exclam', official: 'shield', verified: 'checkc', unverified: 'questionc' };

  function dismissed(key) {
    try { return localStorage.getItem('mihenk:note:' + key) === '1'; } catch (_) { return false; }
  }
  function remember(key) {
    try { localStorage.setItem('mihenk:note:' + key, '1'); } catch (_) { /* özel mod: şerit bu oturumda kapanır */ }
  }

  /* Şeridin HTML'i. Metni olmayan bölümler (talep sayfası) metnini kendisi
     verir, böylece oradaki mevcut açıklama aynen korunur. */
  function sectionNoteHTML(key, text) {
    var note = NOTES[key] || {};
    var body = text || note.text || '';
    if (!body || dismissed(key)) return '';
    var tone = note.tone || 'accent';
    var plate = '<span class="kunye">' + M.icon(TONE_ICON[tone] || TONE_ICON.accent, 'ic--sm') + PLATE + '</span>';
    return '<div class="snote" role="note" data-note="' + esc(key) + '" data-tone="' + esc(tone) + '">' +
      plate + '<p class="snote__t">' + esc(body) + '</p>' +
      '<button class="snote__ok" type="button" data-note-ok="' + esc(key) + '">Anladım</button></div>';
  }
  M.sectionNoteHTML = sectionNoteHTML;

  /* Şeridin listesinin üstüne girdiği yer */
  function target(key) {
    if (key === 'foryou' || key === 'following') {
      var panel = M.panel && M.panel(key);
      var list = panel && panel.querySelector('.feed__list');
      return list ? { host: panel, anchor: list } : null;
    }
    if (key.indexOf('crisis:') === 0) {
      var crisis = M.$('#panel-crisis'), clist = M.$('#clist');
      return crisis && clist ? { host: crisis, anchor: clist } : null;
    }
    return null;
  }

  M.renderSectionNote = function (key) {
    var spot = target(key);
    if (!spot) return;
    var current = spot.host.querySelector('.snote');
    if (current) {
      if (current.dataset.note === key) return;
      current.remove();
    }
    var html = sectionNoteHTML(key);
    if (html) spot.host.insertBefore(M.el(html), spot.anchor);
  };

  M.syncSectionNotes = function () {
    M.renderSectionNote('foryou');
    M.renderSectionNote('following');
    if (M.$('#clist')) M.renderSectionNote('crisis:' + ((M.state && M.state.filter) || 'all'));
  };

  /* "Anladım": şeridi kaldır, odağı şeritten sonraki öğeye taşı. */
  document.addEventListener('click', function (e) {
    var button = e.target.closest('[data-note-ok]');
    if (!button) return;
    var strip = button.closest('.snote');
    remember(button.dataset.noteOk);
    if (!strip) return;
    var focused = document.activeElement === button;
    var next = null;
    if (focused) {
      next = M.$$('a[href], button:not([disabled]), input, select, textarea').filter(function (node) {
        return !strip.contains(node) && node.offsetParent !== null &&
          (strip.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
      })[0];
    }
    strip.remove();
    if (next) next.focus({ preventScroll: true });
  });

  M.on('tab', M.syncSectionNotes);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.syncSectionNotes);
  else M.syncSectionNotes();
})(window.MIHENK = window.MIHENK || {});
