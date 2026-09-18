/* ==========================================================================
   MİHENK - crisis: activation, pinned card, verification, filters,
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

  function sourceHTML(p) {
    if (!p.source) return '';
    var labels = { firsthand: 'Kendi gözlemim', relayed: 'Başkasından duydum', link: 'Kaynak bağlantısı' };
    var link = '';
    if (p.source === 'link' && p.sourceUrl) {
      try {
        var url = new URL(p.sourceUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') link = '<a href="' + esc(url.href) + '" target="_blank" rel="noopener noreferrer">' + esc(url.hostname) + '</a>';
      } catch (e) { /* malformed source is never rendered as a link */ }
    }
    return '<div class="source-line">' + icon('flag', 'ic--sm') + '<span>' + esc(labels[p.source] || 'Kaynak belirtilmedi') + '</span>' + link + '</div>';
  }

  /* ------------------------------------------------------- crisis post DOM */
  var NEEDLABEL = { kurtarma: 'Arama kurtarma', saglik: 'Sağlık / ilk yardım', barinma: 'Barınma ve ısınma', gida: 'Gıda ve su', ulasim: 'Ulaşım' };
  /* Help request cards: the need strip and the people count say what is
     asked for before the reader opens the request. */
  function requestBlock(p) {
    var needs = (p.need || []).map(function (n) { return '<span class="cpost__need">' + esc(NEEDLABEL[n] || n) + '</span>'; }).join('');
    var facts = [];
    if (p.need) facts.push(icon('people', 'ic--sm') + '<span>' + (p.people == null ? 'Kişi sayısı henüz bilinmiyor' : esc(p.people) + ' kişi') + '</span>');
    // Uncertainty is a property of the request, not of the fields this viewer may read:
    // a private address must not silently remove the note for outsiders.
    if (p.location && !p.location.known && (p.need || p.location.text || p.location.region)) facts.push(icon('questionc', 'ic--sm') + '<span>Konum kesin değil</span>');
    if (!needs && !facts.length) return '';
    return '<div class="cpost__request">' + (needs ? '<div class="cpost__needs">' + needs + '</div>' : '') +
      (facts.length ? '<div class="cpost__facts">' + facts.map(function (f) { return '<span>' + f + '</span>'; }).join('') + '</div>' : '') + '</div>';
  }
  function statePill(p) {
    return '<span class="cpost__state" data-open="' + (p.resolved ? '' : '1') + '">' + icon(p.resolved ? 'lock' : 'clock', 'ic--sm') + '<span>' + (p.resolved ? 'Talep kapalı' : 'Talep açık') + '</span></span>';
  }
  /* A structured request opens the request page; every other non-official crisis post
     opens the same page in information mode, where its accuracy is discussed. */
  function pageKind(p, v) {
    return p.need ? 'request' : (v || p.v) !== 'official' ? 'info' : null;
  }
  M.crisisPageKind = pageKind;
  function needSummary(need) {
    return (need || []).map(function (n) { return NEEDLABEL[n] || n; }).join(', ');
  }
  M.needSummary = needSummary;
  /* Quote-like reference: an information post about a help request carries the request's
     need summary and one way into that request's community support. */
  function aboutBlock(p) {
    var about = M.aboutRef ? M.aboutRef(p.about) : null;
    if (!about) return '';
    return '<div class="cpost__about">' +
      '<span class="cpost__about-t">' + icon('reply', 'ic--sm') + '<span>Talep hakkında: ' + esc(about.author && about.author.name ? about.author.name : 'Talep sahibi') +
      (needSummary(about.need) ? ' · ' + esc(needSummary(about.need)) : '') + '</span></span>' +
      '<button class="cpost__about-go" type="button" data-open-request="' + esc(about.id) + '" data-channel="community" data-page="request">Talebin topluluk desteğine git</button>' +
      '</div>';
  }
  function cpostHTML(p, opts) {
    opts = opts || {};
    var u = S.byId[p.uid] || S.me;
    var v = state.verified[p.id] || p.v;
    var vl = S.VER[v];
    var kind = pageKind(p, v), help = kind === 'request';
    return '<article class="cpost" data-id="' + p.id + '" data-version="'+(p.version||1)+'" data-v="' + v + '" data-resolved="' + (p.resolved ? '1' : '') + '" data-tag="' + p.tag + '"' + (kind ? ' data-page="' + kind + '"' : '') + '>' +
      '<span class="av">' + u.avatar + '</span>' +
      '<div class="cpost__col">' +
        '<div class="cpost__head">' +
          '<span class="cpost__name">' + esc(u.name) + '</span>' +
          (u.org ? '<span class="post__verified">' + icon('vbadge') + '</span>' : '') +
          '<span class="post__handle">@' + esc(u.handle) + '</span>' +
          '<span class="post__dot">·</span><span class="post__time">' + esc(p.t) + '</span>' + (help && p.need ? statePill(p) : '') +
        '</div>' +
        '<span class="vpill vpill--' + v + '">' + icon(VICON[v]) +
          '<span class="vpill__t">' + esc(vl.label) + '</span></span>' +
        /* A help card shows the requester's own words; the need chips below already carry the generated summary. */
        '<div class="cpost__body">' + esc(help && p.details && String(p.details).trim() ? p.details : p.text) + '</div>' +
        sourceHTML(p) +
        (p.corrects?'<button class="text-action" type="button" data-thread="'+esc(p.corrects)+'">İlgili önceki gönderi</button>':'')+        (help ? requestBlock(p) : '') +
        '<div class="cpost__meta">' +
          '<span class="cpost__loc">' + icon('pin', 'ic--sm') + esc((p.region && p.region !== p.loc ? p.region + ' · ' : '') + p.loc) + '</span>' +
          '<span class="cpost__tag">' + esc(TAGLABEL[p.tag]) + '</span>' +          '<button class="cpost__why" type="button" data-why="' + p.id + '">' +
            icon('questionc', 'ic--sm') + '<span>Gerekçe</span></button>' +
        '</div>' +
        (kind === 'info' ? aboutBlock(p) : '') +
      // The actions read the same effective verification as data-page, so the card body
      // and the entry button never disagree after a local verification change.
      (M.cardActions ? M.cardActions(v === p.v ? p : Object.assign({}, p, { v: v })) : '') + '</div></article>';
  }

  M.crisisPostHTML = cpostHTML;
  function allCrisis() { return state.extraCrisis.concat(S.crisis); }

  /* Doğrulanmış Bilgi Merkezi: resmî ve doğrulanmış içerik ilk ekranda önce
     görünür (rapor §3.3 "Bilgi arayan kullanıcı" akışı). Stabil sıralama:
     aynı öncelikteki gönderiler kendi aralarındaki sırayı korur. */
  var V_PRIORITY = { official: 0, verified: 1, unverified: 2, disputed: 3 };
  function sortedCrisis() {
    if (M.shared) return allCrisis();
    return allCrisis().slice().sort(function (a, b) {
      return V_PRIORITY[state.verified[a.id] || a.v] - V_PRIORITY[state.verified[b.id] || b.v];
    });
  }

  function matches(p) {
    var v = state.verified[p.id] || p.v;
    var region = $('#crisis-region');
    var topic = $('#crisis-topic');
    if (region && region.value === 'unknown') { if (!p.location || p.location.known || !p.need) return false; }
    else if (region && region.value && (p.region || p.loc) !== region.value) return false;
    if (topic && topic.value && p.tag !== topic.value) return false;
    switch (state.filter) {
      case 'resmi': return v === 'official';
      case 'yardim': return !!p.need && !p.resolved;
      case 'dogrulanmis': return v === 'verified';
      case 'dogrulanmamis': return v === 'unverified';
      case 'mine': return p.uid === 'me' && !!p.need;
      case 'myposts': return p.uid === 'me' && !p.need;
      default: return true;
    }
  }

  /* --------------------------------------------------------- crisis panel */
  function buildCrisisPanel() {
    if ($('#panel-crisis')) return;
    var p = el('<section class="feed" id="panel-crisis" role="tabpanel" aria-labelledby="tab-crisis"></section>');

    var head = el(
      '<div class="crisis-head">' +
        '<div class="crisis-card">' +
        '<div class="crisis-intro"><span class="scenario-label kunye">' + icon('shield', 'ic--sm') + 'Kriz bilgi merkezi</span>' +
        '<h1>' + (M.shared ? esc(M.sharedView.title) : 'Kahramanmaraş depremi') + '</h1><p>Bölgeni seç, güvenilir bilgiyi takip et.</p></div>' +
        '<div class="crisis-actions">' +
        '<button class="sos" id="sos" type="button">' + icon('sos') +
          '<span>Yardım talebi oluştur</span></button>' +
        '<button class="btn btn--ghost" type="button" id="crisis-write">' + icon('quill') + 'Bilgi paylaş</button></div>' +
        '</div>' +
        '<div class="composer" id="ccomposer" hidden>' +
          '<span class="av">' + S.me.avatar + '</span>' +
          '<div class="composer__col">' +
            '<label class="sr-only" for="cta">Kriz akışında paylaş</label>' +
            '<div class="composer__heading"><b>Bilgi paylaş</b><button type="button" id="close-ccomposer" aria-label="Paylaşım alanını kapat">' + icon('close') + '</button></div>' +
            '<div class="compose-about" id="compose-about" hidden><span id="compose-about-t"></span>' +
              '<button type="button" id="compose-about-x" aria-label="Talep bağlantısını kaldır">' + icon('close', 'ic--sm') + '</button></div>' +
            '<textarea class="composer__ta" id="cta" rows="2" maxlength="1000" placeholder="Ne oldu, nerede oldu? Bildiğin kadarını yaz."></textarea>' +
            '<div class="tagsel" id="ctagsel">' +
              '<div class="tagsel__h">Bu paylaşımı etiketle</div>' +
              '<div class="tagsel__row">' +
                S.TAGS.map(function (t) {
                  return '<button class="chip" type="button" aria-pressed="false" data-tag="' + t.id + '">' + esc(t.label) + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="compose-context"><label for="post-region">Bölge<select id="post-region"><option value="">Bölge seç (isteğe bağlı)</option>' + M.CATALOG.regions.slice().sort(function (a,b) { return a.localeCompare(b, 'tr'); }).map(function (loc) { return '<option>' + esc(loc) + '</option>'; }).join('') + '</select></label>' +
            '<label for="post-source">Bu bilgiyi nasıl edindin?<select id="post-source"><option value="">Kaynak seç</option><option value="firsthand">Kendim gördüm</option><option value="relayed">Başkasından duydum</option><option value="link">Kaynak bağlantısı var</option></select></label></div>' +
            '<label class="field" id="post-link-field" hidden><span class="field__l">Kaynak bağlantısı</span><input id="post-link" type="url" maxlength="600" placeholder="https://…"></label>' +
            '<p class="compose-error" id="compose-error" role="alert" hidden></p>' +
            '<div class="composer__bar">' +
              '<span class="compose-count" id="compose-count">0 / 1000</span>' +
              '<button class="btn composer__post" id="cpostbtn" type="button" disabled>Kriz Var’da paylaş</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="chips" role="group" aria-label="Filtreler">' +
          [['resmi', 'Resmî'], ['yardim', 'Yardım'], ['dogrulanmis', 'Doğrulanmış'], ['dogrulanmamis', 'Doğrulanmamış']]
            .map(function (c) {
              return '<button class="chip" type="button" data-filter="' + c[0] + '" aria-pressed="' +
                'false' + '">' + esc(c[1]) +
                '<span class="chip__n" data-count="' + c[0] + '"></span></button>';
            }).join('') +
        '</div>' +
        '<div class="crisis-filters"><label>' + icon('pin', 'ic--sm') + '<select id="crisis-region" aria-label="Bölge seç"><option value="">Tüm bölgeler</option><option value="unknown">Konumu bilinmeyen talepler</option>' +
          M.CATALOG.regions.slice().sort(function (a,b) { return a.localeCompare(b, 'tr'); }).map(function (loc) { return '<option>' + esc(loc) + '</option>'; }).join('') + '</select></label>' +
        '<label><select id="crisis-topic" aria-label="İhtiyaç türü seç"><option value="">Tüm konular</option>' + S.TAGS.map(function (t) { return '<option value="' + t.id + '">' + esc(t.label) + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" id="crisis-find" aria-label="Kriz gönderilerinde ara">' + icon('search') + '</button></div>' +
        '<details class="crisis-settings"><summary>Görünüm seçenekleri</summary><div class="crisis-tools">' +
          '<button class="lowband" id="lowband" type="button" aria-pressed="false">' +
            '<span class="switch" aria-hidden="true"></span><span>Düşük bant genişliği modu</span></button>' +
          '<div class="bytechip" id="bytechip">' +
            '<span class="bytechip__bar"><span class="bytechip__fill"></span></span>' +
            '<span id="bytetext">Tam sürüm: <b>-</b> · Düz mod: <b>-</b></span></div>' +
        '</div>' +
        '</details>' +
      '</div>');

    var listHead = el('<h2 class="clist__h">Doğrulanmış Bilgi Merkezi</h2>');
    var list = el('<div class="clist" id="clist"></div>');
    p.appendChild(head);
    p.appendChild(listHead);
    p.appendChild(list);
    p.appendChild(el('<div class="feed__end">'+(M.shared?'Bu görünümdeki gönderilerin sonuna geldiniz.':'Kriz akışının sonundasın · yalnızca doğrulama, konum ve zaman gösterilir')+'</div>'));
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
    if(M.shared){var chip=$('#bytechip');if(chip)chip.textContent='Görselleri ve hareketleri azaltır. Metinler ve işlemler kullanılabilir.';return;}
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
    var pending = $('#crisis-updates');
    if (pending) pending.remove();
    list.innerHTML = sortedCrisis().map(function (p) { return cpostHTML(p); }).join('');
    applyFilter(true);
    updateCounts();
    if (M.refreshTrustCard) M.refreshTrustCard();
    var search = $('#feed-search-input');
    if (search && search.value) search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  M.renderCrisisList = renderCrisisList;
  M.queueCrisisUpdates = function () {
    if (state.tab !== 'crisis' || window.scrollY < 100) { renderCrisisList(); return; }
    if ($('#crisis-updates')) return;
    var button = el('<button class="new-updates" id="crisis-updates" type="button">Yeni gönderiler var · Akışı güncelle</button>');
    $('#panel-crisis').insertBefore(button, $('#clist'));
    button.addEventListener('click', function () { button.remove(); renderCrisisList(); });
  };

  function updateCounts() {
    var all = allCrisis();
    var c = {
      all: all.length,
      resmi: all.filter(function (p) { return (state.verified[p.id] || p.v) === 'official'; }).length,
      yardim: all.filter(function (p) { return !!p.need && !p.resolved; }).length,
      dogrulanmis: all.filter(function (p) { return (state.verified[p.id] || p.v) === 'verified'; }).length,
      dogrulanmamis: all.filter(function (p) { return (state.verified[p.id] || p.v) === 'unverified'; }).length,
      mine: all.filter(function (p) { return p.uid === 'me' && !!p.need; }).length,
      myposts: all.filter(function (p) { return p.uid === 'me' && !p.need; }).length
    };
    if (M.shared) c = M.sharedView.counts;
    if (M.syncNavCounts) M.syncNavCounts(c);
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
    if (M.applySearch) M.applySearch($('#feed-search-input').value);
    var titles = { all: 'Bölgeden güncellemeler', resmi: 'Resmî kaynaklardan', yardim: 'Açık yardım talepleri', dogrulanmis: 'Doğrulanmış bilgiler', dogrulanmamis: 'Doğrulanmamış bilgiler', mine: 'Yardım taleplerim', myposts: 'Bilgi paylaşımlarım' };
    var heading = $('#panel-crisis .clist__h');
    if (heading) heading.textContent = titles[state.filter] || titles.all;
    if (M.renderSectionNote) M.renderSectionNote('crisis:' + (state.filter || 'all'));
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

  function selectFilter(name, instant) {
    if (name === 'mine' || name === 'myposts') { var r = $('#crisis-region'), t = $('#crisis-topic'); if (r) r.value = ''; if (t) t.value = ''; if (M.applySearch) M.applySearch(''); }
    $$('.chip[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.filter === name ? 'true' : 'false'); });
    state.filter = name;
    if (M.syncTabs) M.syncTabs();
    if (M.shared) M.refreshShared(true); else applyFilter(!!instant);
  }
  M.setCrisisFilter = selectFilter;

  function wireCrisisPanel() {
    var panel = $('#panel-crisis');
    $('#crisis-region').addEventListener('change', function () { if(M.shared) M.refreshShared(true); else applyFilter(true); });
    $('#crisis-topic').addEventListener('change', function () { if(M.shared) M.refreshShared(true); else applyFilter(true); });

    panel.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit-request]');
      if (edit) { M.openImdat({ editId: edit.dataset.editRequest }); return; }
      if (e.target.closest('#close-ccomposer')) { $('#ccomposer').hidden = true; $('#crisis-write').focus(); return; }
      if (e.target.closest('#compose-about-x')) { M.setComposeAbout(null); $('#cta').focus(); return; }
      var resolved = e.target.closest('[data-resolve]');
      if (resolved && M.shared) {
        var target = M.getPost(resolved.dataset.resolve),shown=resolved.closest('.cpost');
        if(Number(shown.dataset.version)!==target.version){M.openThread(target.id);M.toast('Talep güncellendi. Son bilgileri kontrol edin.');return;}resolved.disabled=true;
        M.transport.send({type:target.resolved?'request.reopen':'request.close',targetId:target.id,expectedVersion:target.version,payload:{}}).then(function(result){if(!result.ok){resolved.disabled=false;M.toast(result.error.message);}else{M.refreshShared(true);M.toast(target.resolved?'Talebiniz yeniden açıldı.':'Talebiniz kapatıldı. Taleplerim üzerinden yeniden açabilirsiniz.');}});return;
      }
      if (resolved) {
        var request = state.extraCrisis.find(function (p) { return p.id === resolved.dataset.resolve && p.uid === 'me'; });
        if (request) {
          request.resolved = !request.resolved;
          resolved.textContent = request.resolved ? 'İhtiyaç karşılandı · Yeniden aç' : 'İhtiyacım karşılandı';
          resolved.closest('.cpost').dataset.resolved = request.resolved ? '1' : '';
          var status = resolved.closest('.cpost').querySelector('.request-status');
          if (status) status.innerHTML = icon(request.resolved ? 'checkc' : 'clock', 'ic--sm') + '<span>' + (request.resolved ? 'Talep sahibi ihtiyacın karşılandığını belirtti' : 'Talep açık') + '</span>';
          updateCounts();
          applyFilter(true);
          M.toast(request.resolved ? 'Talebin kapatıldı. Gerektiğinde yeniden açabilirsin.' : 'Talebin yeniden açıldı.', { muted: true });
        }
        return;
      }
      var chip = e.target.closest('.chip[data-filter]');
      if (chip) {
        if (chip.dataset.filter === 'mine') {
          $('#crisis-region').value = ''; $('#crisis-topic').value = '';
          if (M.applySearch) M.applySearch('');
        }
        // Chips toggle: pressing the active chip returns to the full list.
        selectFilter(chip.getAttribute('aria-pressed') === 'true' ? 'all' : chip.dataset.filter, false);
        return;
      }
      var why = e.target.closest('[data-why]');
      if (why) { showRationale(why.dataset.why); return; }
      if (e.target.closest('#sos')) { M.openImdat(); return; }
      if (e.target.closest('#crisis-write')) { M.openCrisisComposer(); $('#cta').focus(); return; }
      if (e.target.closest('#crisis-find')) { M.openSearch(''); return; }
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
    $('#post-source').addEventListener('change', function () { $('#post-link-field').hidden = this.value !== 'link'; });
    cta.addEventListener('input', function () {
      cta.style.height = 'auto';
      cta.style.height = Math.min(cta.scrollHeight, 220) + 'px';
      $('#cpostbtn').disabled = !cta.value.trim();
      $('#compose-count').textContent = cta.value.length + ' / 1000';
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
    updateCounts();
    if (!silent) M.toast('Doğrulama kaydedildi', { muted: true, life: 1600 });
  }
  M.upgradeVerification = upgrade;

  /* "Kullanıcı içeriğe dokunduğunda doğrulama gerekçesi açılır" (rapor §3.3).
     Sinyaller rapor §3.2'deki üç bileşeni (kaynak/içerik analizi, topluluk
     oylaması, kurumsal kimlik) kısa, okunabilir bir gerekçeye çeviriyor. */
  var RATIONALE = {
    verified:   'Bu örnek gönderi senaryoda doğrulanmış olarak tanımlandı. Canlı kaynak kontrolü yapılmıyor; yapay zekâ veya tek bir kullanıcı beyanı doğrulama sayılmaz.',
    official:   'Bu, resmî kurum hesabını temsil eden kurgusal bir gönderidir. Kurum bağlantısı veya canlı kimlik doğrulaması yoktur.',
    unverified: 'Henüz ikinci bir kaynakla doğrulanmadı. Paylaşmadan önce teyit bekleyin.',
    disputed:   'Birbiriyle çelişen birden fazla bildirim var. Doğrulanana kadar yaymayın.'
  };
  function showRationale(id) {
    var p = allCrisis().filter(function (q) { return q.id === id; })[0];
    if (!p) return;
    var v = state.verified[id] || p.v;
    var vl = S.VER[v];
    var node = el(
      '<div class="modal" role="document">' +
        '<h2 class="modal__h" id="rh">' + esc(vl.label) + '</h2>' +
        '<p class="modal__p">' + esc(M.shared ? ({official:'Bu gönderi kurum hesabından yayımlandı. Kaynağı ve son güncelleme zamanını birlikte değerlendirin.',verified:'Bu gönderi doğrulanmış olarak işaretlendi. Güncelliğini kontrol edin.',unverified:'Bu bilgi henüz bağımsız bir kaynakla doğrulanmadı.',disputed:'Bu bilgi hakkında çelişen bildirimler var.'}[v]) : RATIONALE[v]) + '</p>' +
        '<p class="modal__p" style="color:var(--c-text-2)">' + esc(p.loc) + ' · ' + esc(TAGLABEL[p.tag]) + '</p>' +
        '<div class="modal__actions">' +
          '<button class="btn btn--ghost" id="rationale-close" type="button">Kapat</button>' +
        '</div>' +
      '</div>');
    M.openModal(node, { labelledBy: 'rh' });
    node.querySelector('#rationale-close').addEventListener('click', function () { M.closeModal(); });
  }

  /* ------------------------------------------------------- crisis publish */
  async function publishCrisis() {
    var cta = $('#cta');
    var text = cta.value.trim();
    if (!text) return;
    var source = $('#post-source').value;
    var sourceUrl = $('#post-link').value.trim();
    var error = $('#compose-error');
    if (source === 'link') {
      try { var parsed = new URL(sourceUrl); if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocol'); }
      catch (e) { error.hidden = false; error.textContent = 'http:// veya https:// ile başlayan bir kaynak bağlantısı ekle.'; $('#post-link').focus(); return; }
    }
    error.hidden = true;
    var picked = $('#ctagsel .chip[aria-pressed="true"]');
    var tag = picked ? picked.dataset.tag : 'durum';
    var id = 'x' + (state.extraCrisis.length + 1);
    var region = $('#post-region').value;
    var about = M.crisisAbout && M.crisisAbout.id ? M.crisisAbout.id : null;
    var post = { id: id, uid: 'me', t: 'şimdi', text: text, v: 'unverified', tag: tag,
      loc: region || 'Konum belirtilmedi', region: region, source: source, sourceUrl: source === 'link' ? sourceUrl : '' };
    if (about) post.about = about;
    if(M.shared){
      var button=$('#cpostbtn');if(button.dataset.sending)return;button.dataset.sending='1';button.disabled=true;
      var pending=M.crisisPending || {commandId:crypto.randomUUID(),type:'post.create',payload:{text:text,tag:tag,location:{known:!!region,region:region||null,text:''},source:{kind:source||null,url:source==='link'?sourceUrl:null},about:about}};M.crisisPending=pending;if(M.saveComposeDraft)M.saveComposeDraft();if(M.lockCompose)M.lockCompose(true);
      var result=await M.transport.send(pending);delete button.dataset.sending;
      if(!result.ok){error.hidden=false;error.textContent=result.error.message;button.disabled=false;if((result.error.code!=='unavailable'||result.error.retryable===false)){M.crisisPending=null;if(M.lockCompose)M.lockCompose(false);}button.textContent=M.crisisPending?'Gönderimi yeniden dene':'Paylaş';if(M.saveComposeDraft)M.saveComposeDraft();return;}id=result.entityId;M.crisisPending=null;if(M.lockCompose)M.lockCompose(false);button.textContent='Paylaş';
    } else state.extraCrisis.unshift(post);
    state.filter = 'all';
    $('#crisis-region').value = ''; $('#crisis-topic').value = ''; M.applySearch('');
    $$('.chip[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.filter === 'all' ? 'true' : 'false'); });
    renderCrisisList();
    cta.value = ''; cta.style.height = 'auto';
    $('#post-region').value = ''; $('#post-source').value = ''; $('#post-link').value = '';
    $('#post-link-field').hidden = true; $('#compose-count').textContent = '0 / 1000';
    M.setComposeAbout(null);
    $('#cpostbtn').disabled = true;
    $('#ccomposer').hidden = true;
    $$('#ctagsel .chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    var node = $('.cpost[data-id="' + id + '"]');
    if (node) {
      node.dataset.enter = '1'; node.style.setProperty('--i', 0); node.tabIndex = -1;
      node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'center', behavior: M.motionOff() ? 'auto' : 'smooth' });
    }
    if(M.saveComposeDraft)M.saveComposeDraft();
    M.toast('Paylaşıldı · Henüz doğrulanmadı', { muted: true, life: 2200 });
    return id;
  }
  M.publishCrisis = publishCrisis;

  /* The composer keeps one optional request reference. It is a chip, not a hidden field,
     so the writer can see and remove the link before sharing. */
  function renderComposeAbout() {
    var chip = $('#compose-about');
    if (!chip) return;
    var about = M.crisisAbout;
    chip.hidden = !about;
    $('#compose-about-t').textContent = about ? 'Talep hakkında: ' + (about.name || 'Talep sahibi') + (about.needs ? ' · ' + about.needs : '') : '';
  }
  M.setComposeAbout = function (about) {
    M.crisisAbout = about || null;
    renderComposeAbout();
    if (M.saveComposeDraft) M.saveComposeDraft();
  };
  M.renderComposeAbout = renderComposeAbout;
  function aboutRefFor(id) {
    var p = M.getPost(id);
    if (!p) return { id: id, name: '', needs: '' };
    return { id: id, name: (p.author && p.author.name) || (S.byId[p.uid] || S.me).name, needs: needSummary(p.need) };
  }
  /* One entry point for "share information about this request", used by the help card
     and by the request page (which leaves the page first so the composer is visible). */
  M.shareAboutRequest = function (id, ref) {
    var about = ref || aboutRefFor(id);
    var open = function () {
      M.openCrisisComposer('', null, about);
      var cta = $('#cta');
      if (cta) { cta.focus(); cta.scrollIntoView({ block: 'center', behavior: M.motionOff() ? 'auto' : 'smooth' }); }
    };
    if (state.tab !== 'crisis' && state.crisis && M.setTab) { M.setTab('crisis'); setTimeout(open, M.motionOff() ? 0 : 420); }
    else open();
  };

  M.openCrisisComposer = function (text, tag, about) {
    buildCrisisPanel();
    var c = $('#ccomposer');
    c.hidden = false;
    if (about !== undefined) M.setComposeAbout(about);
    else renderComposeAbout();
    var cta = $('#cta');
    if (typeof text === 'string') cta.value = text.slice(0, 1000);
    cta.style.height = 'auto';
    cta.style.height = Math.min(cta.scrollHeight, 220) + 'px';
    if (tag) {
      var chip = $('#ctagsel .chip[data-tag="' + tag + '"]');
      if (chip) { $$('#ctagsel .chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); chip.setAttribute('aria-pressed', 'true'); }
    }
    $('#cpostbtn').disabled = !cta.value.trim();
    $('#compose-count').textContent = cta.value.length + ' / 1000';
  };

  /* ------------------------------------------------------- pinned card */
  function pinHTML() {
    return '<div class="pin-wrap"><div class="pin" role="region" aria-label="Kriz bildirimi">' +
      '<div class="pin__k kunye">' + icon('shield', 'ic--sm') + '<span>' + (M.shared ? 'Kriz bilgi alanı' : 'Kriz bilgi alanı · Tatbikat') + '</span></div>' +
      '<div class="pin__t">' + (M.shared ? esc(M.sharedView.title) : 'Kahramanmaraş deprem senaryosu') + '</div>' +
      '<div class="pin__s">Doğrulanmış bilgi ve yardım çağrıları</div>' +
      '<button class="btn pin__go" type="button" data-goto-crisis>' +
        '<span>Kriz Var sekmesine git</span>' + icon('arrowr', 'ic--sm') + '</button>' +
      '</div></div>';
  }

  function insertPinned() {
    ['foryou'].forEach(function (fid) {
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
    insertPinned();
    landCrisis(!opts.immediate && !M.motionOff());
    if (!opts.immediate) M.toast('Kriz bilgi alanı açıldı', { icon: 'shield', life: 2000 });
  }

  function deactivate(opts) {
    opts = opts || {};
    if (!state.crisis) return;
    if (state.tab === 'crisis') M.setTabInstant('foryou');
    state.crisis = false;
    state.filter = 'all';
    var tab = $('.tab[data-tab="crisis"]');
    if (tab) tab.remove();
    $$('.pin-host').forEach(function (host) { host.replaceChildren(); });
    var panel = $('#panel-crisis');
    if (panel) panel.remove();
    document.documentElement.dataset.palette = '';
    M.moveUnderline(false); M.syncPanels(); syncControls();
    M.emit('crisis', false);
    if (!opts.silent) M.toast('Kriz modu sona erdi', { muted: true, life: 2000 });
  }

  M.activateCrisis = activate;
  M.deactivateCrisis = deactivate;
  M.toggleCrisis = function () { state.crisis ? deactivate() : activate(); };

  /* --------------------------------------------------- share interception */
  M.submitCompose = function (text) {
    if (!text) return;
    if (M.shared) { M.openCrisisComposer(text); return; }
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
    ['foryou'].forEach(function (feedId) {
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
        '<p class="modal__p">Orada bilginin kaynağını ve bölgesini belirtebilirsiniz.</p>' +
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
    return '<section class="card proto-ctl"><h2 class="card__h">Senaryo merkezi</h2>' +
      '<div style="padding:4px 16px 16px;display:grid;gap:8px">' +
      '<button class="btn btn--block" data-ctl="crisis" type="button">Kriz modunu başlat</button>' +
      '<button class="btn btn--ghost btn--block" data-ctl="plain" type="button">Düşük bant genişliği modu</button>' +
      '<button class="btn btn--ghost btn--block" data-ctl="imdat" type="button">İmdat çağrısı akışı</button>' +
      '<button class="btn btn--ghost btn--block" data-open-lab type="button">100 kişilik tatbikat</button>' +
      '</div></section>';
  }

  function syncControls() {
    $$('[data-ctl="crisis"]').forEach(function (b) {
      b.textContent = state.crisis ? 'Kriz modunu bitir' : 'Kriz modunu başlat';
    });
  }

  M.initCrisis = function () {
    var side = $('.side');
    if (!M.shared && side) side.appendChild(el(controlsHTML()));
    var tail = el('<div class="proto-ctl-mobile">' + controlsHTML() + '</div>');
    if (!M.shared) M.panel('foryou').appendChild(tail);

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
