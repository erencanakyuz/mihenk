/* ==========================================================================
   MİHENK — crisis: activation, pinned card, verification, filters,
   share interception, crisis composer
   ========================================================================== */
(function (M) {
  'use strict';
  var S = M.SEED, esc = S.esc, icon = M.icon, el = M.el, $ = M.$, $$ = M.$$;
  var state = M.state;

  var VICON = { verified: 'checkc', official: 'shield', unverified: 'questionc', disputed: 'exclam' };
  var TAGLABEL = {};
  S.TAGS.forEach(function (t) { TAGLABEL[t.id] = t.label; });

  var KEYWORDS = ['deprem', 'enkaz', 'yardım', 'yardim', 'kayıp', 'kayip', 'afad', 'göçük',
    'gocuk', 'kurtarma', 'acil', 'imdat', 'yaralı', 'yarali', 'çadır', 'cadir', 'battaniye',
    'kızılay', 'kizilay', 'artçı', 'artci', 'sarsıntı', 'sarsinti', 'hasar', 'afet',
    'toplanma', 'barınma', 'barinma', 'kriz'];

  M.isCrisisText = function (t) {
    var s = (t || '').toLocaleLowerCase('tr-TR');
    return KEYWORDS.some(function (k) { return s.indexOf(k) >= 0; });
  };

  /* ------------------------------------------------------- crisis post DOM */
  function cpostHTML(p, opts) {
    opts = opts || {};
    var u = S.byId[p.uid];
    var v = state.verified[p.id] || p.v;
    var vl = S.VER[v];
    return '<article class="cpost" data-id="' + p.id + '" data-v="' + v + '" data-tag="' + p.tag + '">' +
      '<span class="av">' + u.avatar + '</span>' +
      '<div class="cpost__col">' +
        '<div class="cpost__head">' +
          '<span class="cpost__name">' + esc(u.name) + '</span>' +
          (u.org ? '<span class="post__verified">' + icon('vbadge') + '</span>' : '') +
          '<span class="post__handle">@' + esc(u.handle) + '</span>' +
          '<span class="post__dot">·</span><span class="post__time">' + esc(p.t) + '</span>' +
        '</div>' +
        '<span class="vpill vpill--' + v + '">' + icon(VICON[v]) +
          '<span class="vpill__t">' + esc(vl.label) + '</span></span>' +
        '<div class="cpost__body">' + esc(p.text) + '</div>' +
        (p.media ? '<div class="post__media">' + S.media(p.media) + '</div>' : '') +
        '<div class="cpost__meta">' +
          '<span class="cpost__loc">' + icon('pin', 'ic--sm') + esc(p.loc) + '</span>' +
          '<span class="cpost__tag">' + esc(TAGLABEL[p.tag]) + '</span>' +
          '<button class="cpost__verify" type="button" data-verify="' + p.id + '"' +
            (v === 'verified' ? ' data-done="1"' : '') + '>' +
            icon('checkc', 'ic--sm') + '<span>' + (v === 'verified' ? 'Doğrulandı' : 'Doğrula') + '</span></button>' +
        '</div>' +
      '</div></article>';
  }

  function allCrisis() { return state.extraCrisis.concat(S.crisis); }

  function matches(p) {
    var v = state.verified[p.id] || p.v;
    switch (state.filter) {
      case 'resmi': return v === 'official';
      case 'yardim': return p.tag === 'yardim';
      case 'dogrulanmis': return v === 'verified';
      default: return true;
    }
  }

  /* --------------------------------------------------------- crisis panel */
  function buildCrisisPanel() {
    if ($('#panel-crisis')) return;
    var p = el('<section class="feed" id="panel-crisis" role="tabpanel" aria-labelledby="tab-crisis"></section>');

    var head = el(
      '<div class="crisis-head">' +
        '<button class="sos" id="sos" type="button">' + icon('sos') +
          '<span>İMDAT ÇAĞRISI OLUŞTUR</span></button>' +
        '<div class="composer" id="ccomposer" hidden>' +
          '<span class="av">' + S.me.avatar + '</span>' +
          '<div class="composer__col">' +
            '<label class="sr-only" for="cta">Kriz akışında paylaş</label>' +
            '<textarea class="composer__ta" id="cta" rows="1" placeholder="Kriz akışında paylaş"></textarea>' +
            '<div class="tagsel" id="ctagsel">' +
              '<div class="tagsel__h">Bu paylaşımı etiketle</div>' +
              '<div class="tagsel__row">' +
                S.TAGS.map(function (t) {
                  return '<button class="chip" type="button" aria-pressed="false" data-tag="' + t.id + '">' + esc(t.label) + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="composer__bar">' +
              '<button class="composer__tool" type="button" disabled aria-disabled="true" title="Prototip kapsamı dışında" aria-label="Konum (prototip kapsamı dışında)">' + icon('pin') + '</button>' +
              '<button class="btn composer__post" id="cpostbtn" type="button" disabled>Kriz Var’da paylaş</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="chips" role="group" aria-label="Filtreler">' +
          [['all', 'Tümü'], ['resmi', 'Resmî'], ['yardim', 'Yardım Çağrısı'], ['dogrulanmis', 'Doğrulanmış']]
            .map(function (c) {
              return '<button class="chip" type="button" data-filter="' + c[0] + '" aria-pressed="' +
                (c[0] === 'all' ? 'true' : 'false') + '">' + esc(c[1]) +
                '<span class="chip__n" data-count="' + c[0] + '"></span></button>';
            }).join('') +
        '</div>' +
        '<div class="crisis-tools">' +
          '<button class="lowband" id="lowband" type="button" aria-pressed="false">' +
            '<span class="switch" aria-hidden="true"></span><span>Düşük bant genişliği modu</span></button>' +
          '<div class="bytechip" id="bytechip">' +
            '<span class="bytechip__bar"><span class="bytechip__fill"></span></span>' +
            '<span id="bytetext">Tam sürüm: <b>—</b> · Düz mod: <b>—</b></span></div>' +
        '</div>' +
        '<p class="crisis-note">Doğrulama durumu her gönderide görünür. Doğrulanmamış içerik gizlenmez, işaretlenir.</p>' +
      '</div>');

    var list = el('<div class="clist" id="clist"></div>');
    p.appendChild(head);
    p.appendChild(list);
    p.appendChild(el('<div class="feed__end">Kriz akışının sonundasın · yalnızca doğrulama, konum ve zaman gösterilir</div>'));
    $('#feeds').appendChild(p);
    M.syncPanels();
    renderCrisisList();
    wireCrisisPanel();
    showBytes();
  }

  /* Measured, not asserted: the chip reports what this page actually
     weighs and what the plain-HTML document actually weighs. */
  function measureBytes() {
    var doc = 0, res = 0;
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      doc = (nav && (nav.decodedBodySize || nav.transferSize)) || 0;
      performance.getEntriesByType('resource').forEach(function (r) {
        res += (r.decodedBodySize || r.transferSize || 0);
      });
    } catch (e) { /* older engine: fall through */ }
    if (!doc) doc = new Blob([document.documentElement.outerHTML]).size;
    var ns = document.querySelector('noscript');
    var plain = ns ? new Blob([ns.textContent || '']).size : 12000;
    return { full: doc + res, plain: plain };
  }

  function showBytes() {
    var b = measureBytes();
    var kb = function (n) { return Math.round(n / 1024) + ' KB'; };
    var t = $('#bytetext');
    if (t) t.innerHTML = 'Tam sürüm: <b>~' + kb(b.full) + '</b> · Düz mod: <b>~' + kb(b.plain) + '</b>';
    var ratio = Math.max(0.02, Math.min(1, b.plain / Math.max(1, b.full)));
    document.documentElement.style.setProperty('--byte-ratio', ratio.toFixed(3));
  }
  M.measureBytes = measureBytes;

  function renderCrisisList() {
    var list = $('#clist');
    if (!list) return;
    list.innerHTML = allCrisis().map(function (p) { return cpostHTML(p); }).join('');
    applyFilter(true);
    updateCounts();
  }
  M.renderCrisisList = renderCrisisList;

  function updateCounts() {
    var all = allCrisis();
    var c = {
      all: all.length,
      resmi: all.filter(function (p) { return (state.verified[p.id] || p.v) === 'official'; }).length,
      yardim: all.filter(function (p) { return p.tag === 'yardim'; }).length,
      dogrulanmis: all.filter(function (p) { return (state.verified[p.id] || p.v) === 'verified'; }).length
    };
    $$('[data-count]').forEach(function (n) { n.textContent = c[n.dataset.count]; });
  }

  /* FLIP filter re-flow */
  function applyFilter(instant) {
    var list = $('#clist');
    if (!list) return;
    var nodes = $$('.cpost', list);
    var before = {};
    if (!instant && !M.motionOff()) {
      nodes.forEach(function (n) {
        if (n.style.display !== 'none') before[n.dataset.id] = n.getBoundingClientRect().top;
      });
    }
    var idx = 0;
    nodes.forEach(function (n) {
      var p = allCrisis().filter(function (q) { return q.id === n.dataset.id; })[0];
      var show = p ? matches(p) : true;
      n.style.display = show ? '' : 'none';
      n.dataset.enter = '';
      if (show) { n.style.setProperty('--i', Math.min(idx, 8)); idx++; }
    });
    if (instant || M.motionOff()) return;

    nodes.forEach(function (n) {
      if (n.style.display === 'none') return;
      var now = n.getBoundingClientRect().top;
      var was = before[n.dataset.id];
      if (was === undefined) { n.dataset.enter = '1'; return; }
      var dy = was - now;
      if (!dy) return;
      n.dataset.flip = '1';
      n.style.transition = 'none';
      n.style.transform = 'translate3d(0,' + dy + 'px,0)';
      requestAnimationFrame(function () {
        n.style.transition = '';
        n.style.transform = '';
      });
    });
    setTimeout(function () {
      nodes.forEach(function (n) { n.dataset.flip = ''; n.dataset.enter = ''; n.style.transform = ''; });
    }, 420);
  }

  function wireCrisisPanel() {
    var panel = $('#panel-crisis');

    panel.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip[data-filter]');
      if (chip) {
        $$('.chip[data-filter]', panel).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        state.filter = chip.dataset.filter;
        applyFilter(false);
        return;
      }
      var vb = e.target.closest('[data-verify]');
      if (vb) { upgrade(vb.dataset.verify); return; }
      if (e.target.closest('#sos')) { M.openImdat(); return; }
      if (e.target.closest('#lowband')) {
        M.setPlain(!state.plain);
        M.toast(state.plain ? 'Düşük bant genişliği modu açık' : 'Tam sürüme dönüldü', { muted: true, life: 1800 });
        return;
      }
      var ctag = e.target.closest('#ctagsel .chip');
      if (ctag) {
        $$('#ctagsel .chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        ctag.setAttribute('aria-pressed', 'true');
        $('#cpostbtn').disabled = !$('#cta').value.trim();
      }
    });

    var cta = $('#cta');
    cta.addEventListener('input', function () {
      cta.style.height = 'auto';
      cta.style.height = Math.min(cta.scrollHeight, 220) + 'px';
      $('#cpostbtn').disabled = !cta.value.trim();
    });
    $('#cpostbtn').addEventListener('click', function () { publishCrisis(); });
  }

  function upgrade(id, silent) {
    var node = $('.cpost[data-id="' + id + '"]');
    if (!node) return;
    state.verified[id] = 'verified';
    var pill = node.querySelector('.vpill');
    node.dataset.v = 'verified';
    pill.className = 'vpill vpill--verified';
    pill.innerHTML = icon('checkc') + '<span class="vpill__t">Doğrulanmış</span>';
    pill.dataset.upgrade = '1';
    setTimeout(function () { pill.dataset.upgrade = ''; }, 460);
    var vb = node.querySelector('[data-verify]');
    if (vb) { vb.dataset.done = '1'; vb.querySelector('span').textContent = 'Doğrulandı'; }
    updateCounts();
    if (!silent) M.toast('Doğrulama kaydedildi', { muted: true, life: 1600 });
  }
  M.upgradeVerification = upgrade;

  /* ------------------------------------------------------- crisis publish */
  function publishCrisis() {
    var cta = $('#cta');
    var text = cta.value.trim();
    if (!text) return;
    var picked = $('#ctagsel .chip[aria-pressed="true"]');
    var tag = picked ? picked.dataset.tag : 'durum';
    var id = 'x' + (state.extraCrisis.length + 1);
    var post = { id: id, uid: 'me', t: 'şimdi', text: text, v: 'unverified', tag: tag, loc: 'Onikişubat' };
    state.extraCrisis.unshift(post);
    renderCrisisList();
    cta.value = ''; cta.style.height = 'auto';
    $('#cpostbtn').disabled = true;
    $('#ccomposer').hidden = true;
    $$('#ctagsel .chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    var node = $('.cpost[data-id="' + id + '"]');
    if (node) { node.dataset.enter = '1'; node.style.setProperty('--i', 0); }
    window.scrollTo({ top: 0, behavior: (M.motionOff() || M.capture) ? 'auto' : 'smooth' });
    setTimeout(function () { upgrade(id, true); M.toast('Gönderin doğrulandı', { muted: true, life: 1800 }); }, 1900);
    return id;
  }
  M.publishCrisis = publishCrisis;

  M.openCrisisComposer = function (text, tag) {
    buildCrisisPanel();
    var c = $('#ccomposer');
    c.hidden = false;
    var cta = $('#cta');
    cta.value = text || '';
    cta.style.height = 'auto';
    cta.style.height = Math.min(cta.scrollHeight, 220) + 'px';
    if (tag) {
      var chip = $('#ctagsel .chip[data-tag="' + tag + '"]');
      if (chip) { $$('#ctagsel .chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); chip.setAttribute('aria-pressed', 'true'); }
    }
    $('#cpostbtn').disabled = !(cta.value.trim() && $('#ctagsel .chip[aria-pressed="true"]'));
  };

  /* ------------------------------------------------------- pinned card */
  function pinHTML() {
    return '<div class="pin-wrap"><div class="pin" role="region" aria-label="Kriz bildirimi">' +
      '<div class="pin__k">' + icon('warn', 'ic--sm') + '<span>KRİZ VAR</span></div>' +
      '<div class="pin__t">Kahramanmaraş · 7.4 büyüklüğünde deprem</div>' +
      '<div class="pin__s">Doğrulanmış bilgi ve yardım çağrıları</div>' +
      '<button class="btn pin__go" type="button" data-goto-crisis>' +
        '<span>Kriz Var sekmesine git</span>' + icon('arrowr', 'ic--sm') + '</button>' +
      '</div></div>';
  }

  function insertPinned() {
    ['foryou', 'following'].forEach(function (fid) {
      var host = $('.pin-host[data-feed="' + fid + '"]');
      if (!host || host.firstChild) return;
      var isActive = (state.tab === fid);
      var posts = isActive && !M.motionOff() ? $$('.post', M.panel(fid)).slice(0, 12) : [];
      var before = posts.map(function (n) { return n.getBoundingClientRect().top; });
      var wrap = el(pinHTML());
      host.appendChild(wrap);
      if (isActive && !M.motionOff()) {
        wrap.dataset.anim = 'in';
        posts.forEach(function (n, i) {
          var dy = before[i] - n.getBoundingClientRect().top;
          if (!dy) return;
          n.dataset.flip = '1';
          n.style.transition = 'none';
          n.style.transform = 'translate3d(0,' + dy + 'px,0)';
          requestAnimationFrame(function () { n.style.transition = ''; n.style.transform = ''; });
        });
        setTimeout(function () {
          posts.forEach(function (n) { n.dataset.flip = ''; n.style.transform = ''; });
          wrap.dataset.anim = '';
        }, 460);
      }
    });
  }

  function removePinned() {
    ['foryou', 'following'].forEach(function (fid) {
      var host = $('.pin-host[data-feed="' + fid + '"]');
      if (!host || !host.firstChild) return;
      var wrap = host.firstChild;
      var isActive = (state.tab === fid);
      var posts = isActive && !M.motionOff() ? $$('.post', M.panel(fid)).slice(0, 12) : [];
      var before = posts.map(function (n) { return n.getBoundingClientRect().top; });
      var done = function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (isActive && !M.motionOff()) {
          posts.forEach(function (n, i) {
            var dy = before[i] - n.getBoundingClientRect().top;
            if (!dy) return;
            n.dataset.flip = '1';
            n.style.transition = 'none';
            n.style.transform = 'translate3d(0,' + dy + 'px,0)';
            requestAnimationFrame(function () { n.style.transition = ''; n.style.transform = ''; });
          });
          setTimeout(function () { posts.forEach(function (n) { n.dataset.flip = ''; n.style.transform = ''; }); }, 400);
        }
      };
      if (M.motionOff()) { done(); return; }
      wrap.dataset.anim = 'out';
      setTimeout(done, 300);
    });
  }

  /* ------------------------------------------------------------ activation */
  function addCrisisTab(animate) {
    if ($('.tab[data-tab="crisis"]')) return;
    var t = el('<button class="tab tab--crisis' + (animate ? ' tab--enter' : '') + '" role="tab" data-tab="crisis" id="tab-crisis" ' +
      'aria-controls="panel-crisis" aria-selected="false" tabindex="-1">' + icon('warn', 'ic--sm') +
      '<span class="tab__label">Kriz Var</span></button>');
    $('#tabs').appendChild(t);
    if (animate) setTimeout(function () { t.classList.remove('tab--enter'); }, 260);
  }

  function landCrisis(animate) {
    state.crisis = true;
    buildCrisisPanel();
    addCrisisTab(animate);
    M.moveUnderline(false);
    syncControls();
    M.emit('crisis', true);
  }

  function activate(opts) {
    opts = opts || {};
    if (state.crisis) return;
    var immediate = opts.immediate || M.motionOff();
    if (immediate) {
      insertPinned();
      landCrisis(false);
      return;
    }
    M.toast('Bölgenizde bir kriz tespit edildi', { icon: 'warn', life: opts.toastLife || 2800 });
    setTimeout(function () {
      insertPinned();
      setTimeout(function () { landCrisis(true); }, 480);
    }, 300);
  }

  function deactivate(opts) {
    opts = opts || {};
    if (!state.crisis) return;
    var immediate = opts.immediate || M.motionOff();
    var go = function () {
      var t = $('.tab[data-tab="crisis"]');
      if (t) {
        if (immediate) { if (t.parentNode) t.parentNode.removeChild(t); M.moveUnderline(false); }
        else {
          t.classList.add('tab--leave');
          setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); M.moveUnderline(false); }, 230);
        }
      }
      removePinned();
      state.crisis = false;
      state.filter = 'all';
      document.documentElement.dataset.palette = '';
      var drop = function () { var p = $('#panel-crisis'); if (p && p.parentNode) p.parentNode.removeChild(p); M.syncPanels(); };
      if (immediate) drop(); else setTimeout(drop, 340);
      if (!opts.silent) M.toast('Kriz modu sona erdi', { muted: true, life: opts.toastLife || 2600 });
      syncControls();
      M.emit('crisis', false);
    };
    var wasCrisisTab = state.tab === 'crisis';
    if (wasCrisisTab) {
      if (immediate) M.setTabInstant('foryou'); else M.setTab('foryou');
    }
    if (immediate) go(); else setTimeout(go, wasCrisisTab ? 780 : 0);
  }

  M.activateCrisis = activate;
  M.deactivateCrisis = deactivate;
  M.toggleCrisis = function () { state.crisis ? deactivate() : activate(); };

  /* --------------------------------------------------- share interception */
  M.submitCompose = function (text) {
    if (!text) return;
    if (state.crisis && state.tab !== 'crisis' && M.isCrisisText(text)) {
      showInterception(text);
      return;
    }
    postNormal(text);
  };

  function postNormal(text) {
    var id = 'own' + Date.now().toString(36);
    var p = { id: id, uid: 'me', t: 'şimdi', text: text, likes: 0, reposts: 0, replies: 0, views: 1 };
    S.forYou.unshift(p);
    S.following.unshift(p);
    ['foryou', 'following'].forEach(function (feedId) {
      var list = M.panel(feedId).querySelector('.feed__list');
      if (!list) return;
      var node = el(M.postHTML(p));
      if (feedId === state.tab) {
        node.style.setProperty('--i', 0);
        node.classList.add('post--stagger');
        setTimeout(function () { node.classList.remove('post--stagger'); }, 420);
      }
      list.insertBefore(node, list.firstChild);
    });
    M.clearComposer();
    window.scrollTo({ top: 0, behavior: (M.motionOff() || M.capture) ? 'auto' : 'smooth' });
    M.toast('Gönderin paylaşıldı', { muted: true, life: 1800 });
  }

  function showInterception(text) {
    var node = el(
      '<div class="modal">' +
        '<h2 class="modal__h" id="imh">Bu paylaşım krizle ilgili görünüyor.</h2>' +
        '<p class="modal__p">Kriz Var sekmesinde paylaşmak ister misiniz?</p>' +
        '<p class="modal__p">Orada doğrulama ve yardım eşleştirme çalışır.</p>' +
        '<div class="modal__actions">' +
          '<button class="btn" id="go-crisis" type="button">Kriz Var’da paylaş</button>' +
          '<button class="btn btn--ghost" id="stay-normal" type="button">Normal akışta kal</button>' +
        '</div>' +
      '</div>');
    M.openModal(node, { labelledBy: 'imh' });
    node.querySelector('#go-crisis').addEventListener('click', function () {
      M.closeModal();
      M.clearComposer();
      M.setTab('crisis');
      setTimeout(function () { M.openCrisisComposer(text); }, M.motionOff() ? 30 : 780);
    });
    node.querySelector('#stay-normal').addEventListener('click', function () {
      M.closeModal();
      postNormal(text);
    });
  }
  M.showInterception = showInterception;

  /* --------------------------------------------------- prototype controls */
  function controlsHTML() {
    return '<section class="card proto-ctl"><h2 class="card__h">Prototip kontrolleri</h2>' +
      '<div style="padding:4px 16px 16px;display:grid;gap:8px">' +
      '<button class="btn btn--block" data-ctl="crisis" type="button">Kriz modunu başlat</button>' +
      '<button class="btn btn--ghost btn--block" data-ctl="plain" type="button">Düşük bant genişliği modu</button>' +
      '<button class="btn btn--ghost btn--block" data-ctl="imdat" type="button">İmdat çağrısı akışı</button>' +
      '<p class="card__k" style="margin:2px 0 0">Senaryolu demo için adres satırına <b>?demo=1</b> ekleyin.</p>' +
      '</div></section>';
  }

  function syncControls() {
    $$('[data-ctl="crisis"]').forEach(function (b) {
      b.textContent = state.crisis ? 'Kriz modunu bitir' : 'Kriz modunu başlat';
    });
  }

  M.initCrisis = function () {
    var side = $('.side');
    if (side) side.insertBefore(el(controlsHTML()), side.querySelector('#trustcard'));
    var tail = el('<div class="proto-ctl-mobile">' + controlsHTML() + '</div>');
    M.panel('foryou').appendChild(tail);

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ctl]');
      if (b) {
        if (b.dataset.ctl === 'crisis') M.toggleCrisis();
        if (b.dataset.ctl === 'plain') { M.setPlain(!state.plain); }
        if (b.dataset.ctl === 'imdat') { if (!state.crisis) activate(); M.openImdat(); }
        return;
      }
      if (e.target.closest('[data-goto-crisis]')) { M.setTab('crisis'); }
    });

    M.on('plain', function (on) {
      $$('[data-ctl="plain"]').forEach(function (x) {
        x.textContent = on ? 'Tam sürüme dön' : 'Düşük bant genişliği modu';
      });
      var lb = $('#lowband');
      if (lb) lb.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

})(window.MIHENK = window.MIHENK || {});
