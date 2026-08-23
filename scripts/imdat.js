/* ==========================================================================
   MİHENK — İmdat: multi-step help-request flow
   One question per screen, large targets, horizontal slides.
   ========================================================================== */
(function (M) {
  'use strict';
  var S = M.SEED, esc = S.esc, icon = M.icon, el = M.el, $ = M.$, $$ = M.$$;

  var NEEDS = [
    { id: 'kurtarma', label: 'Arama kurtarma', ic: 'people' },
    { id: 'saglik',   label: 'Sağlık / ilk yardım', ic: 'med' },
    { id: 'barinma',  label: 'Barınma ve ısınma', ic: 'tent' },
    { id: 'gida',     label: 'Gıda ve su', ic: 'water' },
    { id: 'ulasim',   label: 'Ulaşım', ic: 'arrowr' }
  ];

  var CHAIN = [
    { t: 'Alındı',           s: 'Çağrınız kuyruğa eklendi' },
    { t: 'Doğrulanıyor',     s: 'Konum ve içerik kontrol ediliyor' },
    { t: 'Doğrulandı',       s: 'İki bağımsız kaynakla eşleşti' },
    { t: 'AFAD’a iletildi',  s: 'Koordinasyon merkezine aktarıldı' }
  ];

  function mapSVG() {
    var roads = '';
    for (var i = 1; i < 6; i++) roads += '<path d="M0 ' + (i * 60) + 'h640" stroke="#3a3f46" stroke-width="' + (i % 2 ? 8 : 3) + '"/>';
    for (var j = 1; j < 9; j++) roads += '<path d="M' + (j * 72) + ' 0v360" stroke="#3a3f46" stroke-width="' + (j % 3 ? 3 : 8) + '"/>';
    var blocks = '';
    for (var k = 0; k < 22; k++) {
      var x = (k * 97) % 600, y = ((k * 53) % 300);
      blocks += '<rect x="' + (x + 8) + '" y="' + (y + 10) + '" width="' + (34 + (k * 7) % 34) + '" height="' + (22 + (k * 11) % 28) + '" rx="3" fill="#23272c"/>';
    }
    return '<svg viewBox="0 0 640 360" role="img" aria-label="Konum haritası (temsilî)" focusable="false">' +
      '<rect width="640" height="360" fill="#15181c"/>' + roads + blocks +
      '<circle cx="320" cy="180" r="46" fill="var(--c-accent)" opacity=".14"/>' +
      '<circle cx="320" cy="180" r="24" fill="var(--c-accent)" opacity=".22"/>' +
      '<path d="M320 156a12 12 0 0 0-12 12c0 9 12 22 12 22s12-13 12-22a12 12 0 0 0-12-12z" fill="var(--c-accent)"/>' +
      '<circle cx="320" cy="168" r="4.4" fill="#000"/>' +
      '<text x="16" y="344" font-family="system-ui,sans-serif" font-size="15" fill="#7c8792">Temsilî harita · gerçek konum servisi yok</text>' +
      '</svg>';
  }

  var st = { need: [], addr: '', people: 3, step: 0 };

  function stepHTML(i) {
    if (i === 0) {
      return '<h2 class="flow__q" id="flowq">Ne tür yardıma ihtiyacınız var?</h2>' +
        '<p class="flow__hint">Birden fazla seçebilirsiniz.</p>' +
        '<div class="flow__body">' + NEEDS.map(function (n) {
          return '<button class="big-chip" type="button" data-need="' + n.id + '" aria-pressed="false">' +
            icon(n.ic) + '<span>' + esc(n.label) + '</span></button>';
        }).join('') + '</div>';
    }
    if (i === 1) {
      return '<h2 class="flow__q" id="flowq">Konumunuz</h2>' +
        '<p class="flow__hint">Haritadaki nokta yaklaşık konumunuzdur. Gerekiyorsa adresi elle yazın.</p>' +
        '<div class="flow__body"><div class="map">' + mapSVG() + '</div>' +
        '<label class="field"><span class="field__l">Adres tarifi</span>' +
        '<input type="text" id="addr" placeholder="Mahalle, sokak, bina tarifi" autocomplete="off"></label></div>';
    }
    if (i === 2) {
      return '<h2 class="flow__q" id="flowq">Kaç kişisiniz?</h2>' +
        '<p class="flow__hint">Yardım gereken toplam kişi sayısı.</p>' +
        '<div class="flow__body"><div class="stepper">' +
        '<button class="stepper__b" type="button" data-step="-1" aria-label="Azalt">' + icon('minus', 'ic--lg') + '</button>' +
        '<div class="stepper__v" id="peoplev" aria-live="polite">3</div>' +
        '<button class="stepper__b" type="button" data-step="1" aria-label="Artır">' + icon('plus', 'ic--lg') + '</button>' +
        '</div></div>';
    }
    if (i === 3) {
      return '<h2 class="flow__q" id="flowq">Çağrınızı gözden geçirin</h2>' +
        '<p class="flow__hint">Gönderdikten sonra durumu bu ekrandan izleyebilirsiniz.</p>' +
        '<div class="flow__body"><div class="review" id="review"></div></div>';
    }
    return '<h2 class="flow__q" id="flowq">Çağrınız iletildi</h2>' +
      '<p class="flow__hint">Durum zinciri gerçek zamanlı güncellenir.</p>' +
      '<div class="flow__body"><div class="chain" id="chain">' +
      CHAIN.map(function (c, k) {
        return '<div class="chain__i" data-k="' + k + '">' +
          '<span class="chain__b">' + icon(k === 3 ? 'shield' : 'check', 'ic--sm') + '</span>' +
          '<span><span class="chain__t">' + esc(c.t) + '</span><br><span class="chain__s">' + esc(c.s) + '</span></span>' +
          '</div>' + (k < 3 ? '<div class="chain__line"></div>' : '');
      }).join('') + '</div></div>';
  }

  function footHTML(i) {
    if (i === 4) return '<div class="flow__foot"><button class="btn btn--ghost" data-flow="close" type="button">Kapat</button></div>';
    return '<div class="flow__foot">' +
      (i > 0 ? '<button class="btn btn--ghost" data-flow="prev" type="button" style="flex:0 0 auto;width:52px" aria-label="Geri">' + icon('chevl') + '</button>' : '') +
      '<button class="btn" data-flow="next" type="button">' + (i === 3 ? 'Çağrıyı gönder' : 'Devam') + '</button>' +
      '</div>';
  }

  function render(dir) {
    var vp = $('#flowvp');
    var old = vp.querySelector('.flow__step');
    var next = el('<div class="flow__step">' + stepHTML(st.step) + footHTML(st.step) + '</div>');
    if (old && !M.motionOff()) {
      old.dataset.anim = dir > 0 ? 'out-next' : 'out-prev';
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 240);
    } else if (old) { old.parentNode.removeChild(old); }
    vp.appendChild(next);
    if (!M.motionOff()) next.dataset.anim = dir > 0 ? 'in-next' : 'in-prev';
    $$('.flow__dot').forEach(function (d, k) { d.dataset.on = k === st.step ? '1' : ''; });
    afterRender();
  }

  function afterRender() {
    if (st.step === 0) {
      $$('[data-need]').forEach(function (b) {
        b.setAttribute('aria-pressed', st.need.indexOf(b.dataset.need) >= 0 ? 'true' : 'false');
      });
    }
    if (st.step === 1) {
      var a = $('#addr'); if (a) { a.value = st.addr; a.addEventListener('input', function () { st.addr = a.value; }); }
    }
    if (st.step === 2) { var v = $('#peoplev'); if (v) v.textContent = st.people; }
    if (st.step === 3) {
      var names = st.need.map(function (n) {
        return (NEEDS.filter(function (x) { return x.id === n; })[0] || {}).label;
      }).filter(Boolean);
      $('#review').innerHTML =
        row('İhtiyaç', names.length ? names.join(', ') : 'Belirtilmedi') +
        row('Konum', st.addr || 'Onikişubat · harita üzerinden işaretlendi') +
        row('Kişi sayısı', st.people + ' kişi') +
        row('Görünürlük', 'Kriz Var akışı · Doğrulanmamış olarak başlar');
    }
    if (st.step === 4) runChain();
  }
  function row(k, v) {
    return '<div class="review__r"><span class="review__k">' + esc(k) + '</span><span class="review__v">' + esc(v) + '</span></div>';
  }

  function runChain() {
    var items = $$('.chain__i');
    items.forEach(function (n, k) {
      setTimeout(function () {
        n.dataset.on = '1';
        setTimeout(function () { n.dataset.done = '1'; }, M.motionOff() ? 0 : 240);
      }, M.motionOff() ? 0 : k * 620);
    });
  }
  M.runChain = runChain;

  M.openImdat = function (opts) {
    opts = opts || {};
    st = { need: opts.need || [], addr: '', people: 3, step: 0 };
    var node = el(
      '<div class="modal">' +
        '<div class="flow"><div class="flow__dots">' +
          [0, 1, 2, 3, 4].map(function (k) { return '<span class="flow__dot" data-on="' + (k ? '' : '1') + '"></span>'; }).join('') +
        '</div><div class="flow__viewport" id="flowvp"></div></div>' +
      '</div>');
    M.openModal(node, { labelledBy: 'flowq' });
    render(1);

    node.addEventListener('click', function (e) {
      var need = e.target.closest('[data-need]');
      if (need) {
        var id = need.dataset.need;
        var i = st.need.indexOf(id);
        if (i >= 0) st.need.splice(i, 1); else st.need.push(id);
        need.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
        return;
      }
      var sb = e.target.closest('[data-step]');
      if (sb) {
        st.people = Math.max(1, Math.min(30, st.people + parseInt(sb.dataset.step, 10)));
        var v = $('#peoplev');
        v.textContent = st.people;
        if (!M.motionOff()) { v.dataset.bounce = '1'; setTimeout(function () { v.dataset.bounce = ''; }, 280); }
        return;
      }
      var f = e.target.closest('[data-flow]');
      if (!f) return;
      if (f.dataset.flow === 'close') { M.closeModal(); return; }
      if (f.dataset.flow === 'prev') { st.step = Math.max(0, st.step - 1); render(-1); return; }
      if (f.dataset.flow === 'next') {
        if (st.step === 3) { st.step = 4; render(1); return; }
        st.step = Math.min(4, st.step + 1); render(1);
      }
    });
    return node;
  };

  M.imdatState = function () { return st; };
  M.imdatGoto = function (i) { var dir = i > st.step ? 1 : -1; st.step = i; render(dir); };
  M.imdatPick = function (id) {
    if (st.need.indexOf(id) < 0) st.need.push(id);
    var b = $('[data-need="' + id + '"]');
    if (b) b.setAttribute('aria-pressed', 'true');
  };

})(window.MIHENK = window.MIHENK || {});
