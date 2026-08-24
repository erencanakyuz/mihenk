/* ==========================================================================
   MİHENK - app: icons, state, routing, shell, tab transitions
   Vanilla JS. No framework, no build step. Everything hangs off window.MIHENK.
   ========================================================================== */
(function (M) {
  'use strict';

  var S = M.SEED;
  var esc = S.esc;

  /* ---------------------------------------------------------------- icons */
  var P = {
    home:      'M3 10.4 12 3.2l9 7.2V20a1 1 0 0 1-1 1h-4.6v-6.2H8.6V21H4a1 1 0 0 1-1-1z',
    search:    'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20.5 20.5 16 16',
    bell:      'M18.4 8.4a6.4 6.4 0 1 0-12.8 0c0 6.6-2.6 6.6-2.6 8.9h18c0-2.3-2.6-2.3-2.6-8.9M13.9 20.4a2.2 2.2 0 0 1-3.8 0',
    mail:      'M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM3.4 6.4 12 12.6l8.6-6.2',
    grok:      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6.5 17.5 17.5 6.5',
    bookmark:  'M6.4 3.4h11.2v17.2L12 16.4l-5.6 4.2z',
    star:      'M12 2.6l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9l6-.9z',
    user:      'M12 4.2a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8zM4.2 20.8c0-3.9 3.5-5.9 7.8-5.9s7.8 2 7.8 5.9',
    dots:      'M6 12h.01M12 12h.01M18 12h.01',
    dotsc:     'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.2 12h.01M12 12h.01M15.8 12h.01',
    quill:     'M4.6 19.4 8 18.6 19.2 7.4a2.4 2.4 0 0 0-3.4-3.4L4.6 15.2z',
    image:     'M4 4.6h16a1 1 0 0 1 1 1v12.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.6a1 1 0 0 1 1-1zM3.4 17.2 9 11.6l4 4 3-3 4.6 4.6M8.6 8.6h.01',
    poll:      'M8 6h13M8 12h13M8 18h13M3.4 6h.01M3.4 12h.01M3.4 18h.01',
    emoji:     'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.4 13.6a4.4 4.4 0 0 0 7.2 0M9 9.4h.01M15 9.4h.01',
    clock:     'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM12 6.8V12l3.6 2.1',
    pin:       'M12 21.2s6.8-6.4 6.8-11a6.8 6.8 0 1 0-13.6 0c0 4.6 6.8 11 6.8 11zM12 8.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
    flag:      'M5.2 21V3.6h12.6l-2.1 4.2 2.1 4.2H5.2',
    reply:     'M20 4.4H4a1 1 0 0 0-1 1v10.2a1 1 0 0 0 1 1h3.2v4l5.2-4H20a1 1 0 0 0 1-1V5.4a1 1 0 0 0-1-1z',
    repost:    'M17 2.6l4 4-4 4M21 6.6H8.4a4.4 4.4 0 0 0-4.4 4.4v2.2M7 21.4l-4-4 4-4M3 17.4h12.6a4.4 4.4 0 0 0 4.4-4.4v-2.2',
    heart:     'M12 20.8S3.4 15 3.4 9.4A4.9 4.9 0 0 1 12 6.5a4.9 4.9 0 0 1 8.6 2.9c0 5.6-8.6 11.4-8.6 11.4z',
    views:     'M4 20.4V10.6M9.3 20.4V3.6M14.7 20.4v-7.2M20 20.4V7',
    share:     'M12 3.2v12.4M8 7.2l4-4 4 4M4.8 13.4V19a1.4 1.4 0 0 0 1.4 1.4h11.6A1.4 1.4 0 0 0 19.2 19v-5.6',
    warn:      'M12 3.4 22.2 20.6H1.8zM12 9.8v4.8M12 17.6h.01',
    shield:    'M12 3 19 6v5.6c0 4.5-3 7.7-7 9.6-4-1.9-7-5.1-7-9.6V6z',
    checkc:    'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM7.9 12.3l2.8 2.8 5.4-5.6',
    questionc: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.4 9.5a2.7 2.7 0 1 1 3.3 3.3c-.5.2-.7.7-.7 1.2v.6M12 17.6h.01',
    exclam:    'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM12 7.2v5.6M12 16.6h.01',
    sos:       'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zM12 3.2v5.2M12 15.6v5.2M3.2 12h5.2M15.6 12h5.2',
    close:     'M6 6l12 12M18 6 6 18',
    plus:      'M12 5.2v13.6M5.2 12h13.6',
    minus:     'M5.2 12h13.6',
    arrowr:    'M4 12h14.6M13 6.2l6.2 5.8-6.2 5.8',
    chevl:     'M15 4.8 8 12l7 7.2',
    check:     'M5 12.4 9.6 17 19 6.8',
    box:       'M4 4.6h16a1 1 0 0 1 1 1v12.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.6a1 1 0 0 1 1-1z',
    med:       'M12 5.2v13.6M5.2 12h13.6',
    water:     'M12 3.4c3.6 4.2 5.6 7 5.6 9.6a5.6 5.6 0 1 1-11.2 0c0-2.6 2-5.4 5.6-9.6z',
    tent:      'M12 3.6 21 20.4H3zM12 3.6V20.4',
    people:    'M9 5.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM2.6 20c0-3.4 2.9-5 6.4-5s6.4 1.6 6.4 5M16.4 5.6a3.2 3.2 0 0 1 0 6.2M21.4 20c0-2.6-1.6-4.1-4-4.7'
  };
  var VBADGE = 'M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z';

  function icon(name, cls) {
    if (name === 'vbadge') {
      return '<svg class="ic ic--fill ic--sm ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + VBADGE + '"/></svg>';
    }
    var d = P[name] || P.dots;
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }
  M.icon = icon;

  /* ------------------------------------------------------------ utilities */
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function $(sel, r) { return (r || document).querySelector(sel); }
  function $$(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }
  function nfmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' Mn';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' B';
    return String(n);
  }
  M.el = el; M.$ = $; M.$$ = $$; M.nfmt = nfmt;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motionOff() { return reduced.matches || state.instant || state.plain; }
  M.motionOff = motionOff;

  /* --------------------------------------------------------------- state */
  var state = {
    tab: 'foryou',
    crisis: false,
    plain: false,
    filter: 'all',
    scroll: { foryou: 0, following: 0, crisis: 0 },
    busy: false,
    instant: false,
    likes: {}, reposts: {}, follows: {}, verified: {},
    extraCrisis: []
  };
  M.state = state;

  var TABS = {
    foryou:    { id: 'foryou',    label: 'Akış',       path: '/' },
    following: { id: 'following', label: 'Takip',     path: '/takip' },
    crisis:    { id: 'crisis',    label: 'Kriz Var',  path: '/kriz' }
  };
  M.TABS = TABS;
  function order() { return state.crisis ? ['foryou', 'following', 'crisis'] : ['foryou', 'following']; }
  M.order = order;

  /* ---------------------------------------------------------------- toast */
  function toast(text, opts) {
    opts = opts || {};
    var layer = $('#toasts');
    var t = el('<div class="toast ' + (opts.muted ? 'toast--muted' : '') + '" role="status">' +
      (opts.icon ? icon(opts.icon) : '') + '<span>' + esc(text) + '</span></div>');
    layer.appendChild(t);
    var life = opts.life || 2600;
    setTimeout(function () {
      t.dataset.leaving = '1';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 240);
    }, life);
    return t;
  }
  M.toast = toast;

  /* ---------------------------------------------------------------- modal */
  var lastFocus = null;
  function openModal(node, opts) {
    opts = opts || {};
    var layer = $('#modal');
    lastFocus = document.activeElement;
    layer.innerHTML = '';
    var scrim = el('<div class="modal__scrim"></div>');
    layer.appendChild(scrim);
    layer.appendChild(node);
    var heading = node.querySelector('h1, h2, h3');
    if (heading && !heading.id) heading.id = 'modal-title-' + Date.now().toString(36);
    if (opts.labelledBy || heading) layer.setAttribute('aria-labelledby', opts.labelledBy || heading.id);
    else layer.setAttribute('aria-label', opts.label || 'İletişim kutusu');
    layer.hidden = false;
    layer.dataset.wide = opts.wide ? '1' : '';
    document.body.style.overflow = 'hidden';
    var shell = $('.shell');
    if (shell) shell.inert = true;
    var f = node.querySelector('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
    if (f) { f.focus(); }
    else { node.tabIndex = -1; node.focus(); }
    if (!opts.persistent) scrim.addEventListener('click', closeModal);
    document.addEventListener('keydown', trap, true);
    return node;
  }
  function trap(e) {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', $('#modal'))
      .filter(function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closeModal() {
    var layer = $('#modal');
    if (layer.hidden) return;
    var m = layer.querySelector('.modal');
    if (m) m.dataset.leaving = '1';
    document.removeEventListener('keydown', trap, true);
    setTimeout(function () {
      layer.hidden = true; layer.innerHTML = '';
      layer.removeAttribute('aria-labelledby'); layer.removeAttribute('aria-label');
      document.body.style.overflow = '';
      var shell = $('.shell');
      if (shell) shell.inert = false;
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
    }, motionOff() ? 0 : 160);
  }
  M.openModal = openModal; M.closeModal = closeModal;

  /* ----------------------------------------------------------- shell HTML
     4 gerçek işlev, X'in 9 maddelik (çoğu prototipte işlevsiz) navının
     yerine. Bkz. GORSEL_KIMLIK_SPEC.md §3. */
  var NAV = [
    ['home', 'Ana Akış', 'home'],
    ['warn', 'Kriz Durumu', 'crisis'],
    ['sos', 'İmdat', 'imdat'],
    ['user', 'Profil']
  ];

  function logo() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<path d="M4 26V6h4.4l7.6 11.2L23.6 6H28v20h-4.6V13.8L16.6 24h-1.2L8.6 13.8V26z" fill="currentColor"/>' +
      '<circle cx="16" cy="29" r="1.6" fill="var(--c-accent)"/></svg>';
  }

  function buildShell() {
    var navHtml = NAV.map(function (n) {
      var active = n[2] === 'home';
      var badge = n[2] === 'crisis' ? '<span class="nav__dot" data-crisis-dot aria-hidden="true"></span>' : '';
      return '<li><button class="nav__item" type="button" ' +
        (n[2] ? 'data-nav="' + n[2] + '" ' : 'disabled aria-disabled="true" title="Prototip kapsamı dışında" ') +
        (active ? 'aria-current="page"' : '') + '>' + icon(n[0], 'ic--lg') + '<span>' + n[1] + '</span>' + badge + '</button></li>';
    }).join('');

    var side =
      '<div class="side__search"><div class="side__search-box">' + icon('search') +
        '<input type="search" placeholder="Ara" aria-label="Gönderilerde ara" data-search-input></div></div>' +
      trustCardHTML() +
      '<p class="card__k" style="padding:0 16px">Şablon hesaplar · Kurgusal veri · Prototip</p>';

    return el(
      '<div class="shell">' +
        '<header class="nav"><button class="nav__brand" type="button" data-nav="home" aria-label="MİHENK ana sayfa">' + logo() + '</button>' +
          '<nav aria-label="Birincil"><ul class="nav__list">' + navHtml + '</ul></nav>' +
          '<button class="nav__post" type="button" data-nav="compose">' + icon('quill', 'ic--lg') + '<span>Gönder</span></button>' +
          '<button class="nav__me" type="button" disabled aria-disabled="true" title="Profil prototip kapsamı dışında"><span class="av">' + S.me.avatar + '</span>' +
            '<span class="nav__me-txt"><span class="nav__me-name">' + esc(S.me.name) + '</span><br>' +
            '<span class="nav__me-handle">@' + esc(S.me.handle) + '</span></span>' + icon('dots') + '</button>' +
        '</header>' +
        '<main class="main" id="main">' +
          '<div class="topbar" id="topbar">' +
            '<div class="topbar__row">' + logo().replace('viewBox', 'style="width:26px;height:26px" viewBox') + '<span>MİHENK</span></div>' +
            '<div class="tabs" role="tablist" aria-label="Akışlar" id="tabs">' +
              '<div class="tabs__underline" id="underline" aria-hidden="true"></div>' +
            '</div>' +
          '</div>' +
          '<div class="feed-search" id="feed-search" hidden>' +
            '<label class="sr-only" for="feed-search-input">Gönderilerde ara</label>' +
            '<span class="feed-search__icon">' + icon('search') + '</span>' +
            '<input id="feed-search-input" type="search" placeholder="Gönderilerde ara" autocomplete="off" data-search-input>' +
            '<span class="feed-search__status" id="feed-search-status" role="status"></span>' +
            '<button type="button" data-search-close aria-label="Aramayı kapat">' + icon('close', 'ic--sm') + '</button>' +
          '</div>' +
          '<div class="feeds" id="feeds"></div>' +
        '</main>' +
        '<aside class="side" aria-label="İkincil">' + side + '</aside>' +
      '</div>');
  }

  /* "Bölge Güven Durumu" - X'in Gündem/Kimi-takip-etmeli widget'larının
     yerine. Ürünün asıl farkını (doğrulama katmanı) kriz kapalıyken bile
     gösterir. Sayı uydurma değil: S.crisis + state.verified'dan hesaplanır,
     crisis.js'teki updateCounts() ile aynı mantık. Bkz. GORSEL_KIMLIK_SPEC.md §4. */
  function trustStats() {
    var all = S.crisis;
    var resolved = 0, disputed = 0;
    all.forEach(function (p) {
      var v = state.verified[p.id] || p.v;
      if (v === 'verified' || v === 'official') resolved++;
      if (v === 'disputed') disputed++;
    });
    return { total: all.length, resolved: resolved, disputed: disputed,
      pct: Math.round((resolved / all.length) * 100) };
  }

  function trustCardHTML() {
    var s = trustStats();
    return '<section class="card trust-card" id="trustcard"><h2 class="card__h">Bölge Güven Durumu</h2>' +
      '<div class="trust-card__body">' +
        '<div class="trust-card__row"><span>Kahramanmaraş</span><span class="card__k">son 24 sa</span></div>' +
        '<div class="trust-card__stat">%' + s.pct + '<small>doğrulanmış / resmî kaynaklı</small></div>' +
        '<div class="trust-card__meter"><i style="width:' + s.pct + '%"></i></div>' +
        '<div class="card__k">' + s.total + ' gönderi izleniyor · ' + s.disputed + ' çelişkili işaretlendi</div>' +
      '</div></section>';
  }

  function refreshTrustCard() {
    var el2 = $('#trustcard');
    if (!el2) return;
    var fresh = el(trustCardHTML());
    el2.replaceWith(fresh);
  }
  M.refreshTrustCard = refreshTrustCard;

  /* ----------------------------------------------------------------- tabs */
  function renderTabs() {
    var bar = $('#tabs');
    var ids = order();
    ids.forEach(function (id, i) {
      var existing = bar.querySelector('.tab[data-tab="' + id + '"]');
      if (existing) return;
      var isCrisis = id === 'crisis';
      var t = el('<button class="tab ' + (isCrisis ? 'tab--crisis' : '') + '" role="tab" data-tab="' + id + '"' +
        ' id="tab-' + id + '" aria-controls="panel-' + id + '" aria-selected="false" tabindex="-1">' +
        (isCrisis ? icon('warn', 'ic--sm') : '') +
        '<span class="tab__label">' + esc(TABS[id].label) + '</span></button>');
      bar.appendChild(t);
    });
    syncTabs();
  }

  function syncTabs() {
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === state.tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    moveUnderline();
  }

  function moveUnderline(squash) {
    var u = $('#underline');
    var t = $('.tab[data-tab="' + state.tab + '"]');
    if (!u || !t) return;
    var label = t.querySelector('.tab__label');
    var lw = label ? label.getBoundingClientRect().width : 56;
    var w = Math.max(40, lw + (state.tab === 'crisis' ? 24 : 0));
    var barRect = $('#tabs').getBoundingClientRect();
    var r = t.getBoundingClientRect();
    var cx = r.left - barRect.left + r.width / 2;
    u.style.width = w + 'px';
    var apply = function (sx) { u.style.transform = 'translate3d(' + (cx - w / 2) + 'px,0,0) scaleX(' + sx + ')'; };
    if (squash && !motionOff()) {
      u.dataset.squash = '1';
      apply(1.4);
      setTimeout(function () { u.dataset.squash = ''; apply(1); }, 150);
    } else {
      apply(1);
    }
  }
  M.moveUnderline = moveUnderline;

  /* ---------------------------------------------------------------- feeds */
  function panel(id) { return $('#panel-' + id); }
  M.panel = panel;

  function syncPanelAccessibility() {
    $$('.feed').forEach(function (f) {
      var on = f.dataset.active === '1';
      f.setAttribute('aria-hidden', on ? 'false' : 'true');
      f.inert = !on;
    });
  }
  M.syncPanels = syncPanelAccessibility;

  function buildFeeds() {
    var f = $('#feeds');
    ['foryou', 'following'].forEach(function (id) {
      var p = el('<section class="feed" id="panel-' + id + '" role="tabpanel" aria-labelledby="tab-' + id + '"></section>');
      f.appendChild(p);
    });
    var sk = el('<section class="feed feed--skel" id="panel-skel" aria-hidden="true"></section>');
    sk.innerHTML = M.skeleton(7);
    f.appendChild(sk);
    M.renderFeed('foryou');
    M.renderFeed('following');
    panel('foryou').dataset.active = '1';
    syncPanelAccessibility();
  }

  /* -------------------------------------------------------- tab switching */
  function setTab(next, opts) {
    opts = opts || {};
    if (state.busy) return;
    if (!TABS[next]) return;
    if (next === state.tab) return;
    var ids = order();
    if (ids.indexOf(next) < 0) return;

    state.busy = true;
    state.scroll[state.tab] = window.scrollY;

    var dir = ids.indexOf(next) > ids.indexOf(state.tab) ? 1 : -1;
    var outEl = panel(state.tab);
    var inEl = panel(next);
    var skel = panel('skel');

    if (next === 'crisis' || state.tab === 'crisis') {
      document.documentElement.dataset.palette = (next === 'crisis') ? 'crisis' : '';
    }

    var prev = state.tab;
    state.tab = next;
    document.documentElement.dataset.tab = next;
    syncTabs();
    moveUnderline(true);
    if (!opts.fromHistory) pushURL(next, false);
    syncPanelAccessibility();

    var fast = motionOff();
    var tOut = fast ? 0 : 180;
    var tSkel = fast ? 0 : (opts.skelMs || 340);

    if (outEl) outEl.dataset.anim = dir > 0 ? 'out-left' : 'out-right';

    setTimeout(function () {
      if (outEl) { outEl.dataset.anim = ''; outEl.dataset.active = '0'; }
      skel.dataset.active = '1';
      syncPanelAccessibility();
      window.scrollTo(0, 0);
      setTimeout(function () {
        skel.dataset.active = '0';
        inEl.dataset.active = '1';
        syncPanelAccessibility();
        inEl.dataset.anim = dir > 0 ? 'in-right' : 'in-left';
        M.stagger(inEl);
        /* flush layout so the scroll range belongs to the incoming feed,
           then restore that feed's own scroll position */
        void document.body.offsetHeight;
        var want = state.scroll[next] || 0;
        window.scrollTo(0, want);
        setTimeout(function () {
          inEl.dataset.anim = '';
          if (Math.abs(window.scrollY - want) > 2) window.scrollTo(0, want);
          state.busy = false;
          M.emit('tab', { from: prev, to: next });
        }, fast ? 0 : 230);
      }, tSkel);
    }, tOut);
  }
  M.setTab = setTab;

  /* Instant, animation-free tab switch - used by the demo runner to build a
     scenario's opening state before frame 0. */
  M.setTabInstant = function (id) {
    if (!TABS[id]) return;
    var p = panel(id);
    if (!p) return;
    state.scroll[state.tab] = window.scrollY;
    $$('.feed').forEach(function (f) { f.dataset.active = ''; f.dataset.anim = ''; });
    p.dataset.active = '1';
    var from = state.tab;
    state.tab = id;
    document.documentElement.dataset.tab = id;
    document.documentElement.dataset.palette = (id === 'crisis') ? 'crisis' : '';
    syncTabs();
    moveUnderline(false);
    pushURL(id, true);
    syncPanelAccessibility();
    state.busy = false;
    M.emit('tab', { from: from, to: id });
    window.scrollTo(0, state.scroll[id] || 0);
  };

  /* ---------------------------------------------------- header on scroll */
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    var bar = $('#topbar');
    if (!bar) return;
    var d = y - lastY;
    if (y < 60) bar.dataset.hidden = '';
    else if (d > 4) bar.dataset.hidden = '1';
    else if (d < -4) bar.dataset.hidden = '';
    lastY = y;
  }

  /* --------------------------------------------------------------- events */
  var bus = {};
  M.on = function (k, fn) { (bus[k] = bus[k] || []).push(fn); };
  M.emit = function (k, d) { (bus[k] || []).forEach(function (f) { f(d); }); };

  /* ----------------------------------------------------------- plain mode */
  function setPlain(on) {
    state.plain = !!on;
    document.documentElement.dataset.plain = on ? '1' : '';
    var b = $('#lowband');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    M.emit('plain', on);
  }
  M.setPlain = setPlain;

  /* ------------------------------------------------------------- routing
     The crisis tab has its own URL via the History API. When the app is
     served from a directory root we use real paths (/takip, /kriz); when it
     is served as a single file from a deeper path we keep the same pathname
     and carry the tab in a query parameter, so reloading always works. */
  var PATH_MODE = location.protocol !== 'file:' && !/\.html?$/.test(location.pathname);
  var QKEY = { following: 'takip', crisis: 'kriz' };

  function urlFor(tab) {
    var q = new URLSearchParams(location.search);
    q.delete('t');
    if (PATH_MODE) {
      var s1 = q.toString();
      return TABS[tab].path + (s1 ? '?' + s1 : '');
    }
    if (QKEY[tab]) q.set('t', QKEY[tab]);
    var s2 = q.toString();
    return location.pathname + (s2 ? '?' + s2 : '');
  }
  M.urlFor = urlFor;

  function pushURL(tab, replace) {
    try { history[replace ? 'replaceState' : 'pushState']({ tab: tab }, '', urlFor(tab)); }
    catch (e) { /* sandboxed host: navigation state is optional */ }
  }
  M.pushURL = pushURL;

  function routeFromLocation() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    if (/(^|\/)kriz$/.test(p)) return 'crisis';
    if (/(^|\/)takip$/.test(p)) return 'following';
    var t = new URLSearchParams(location.search).get('t');
    if (t === 'kriz') return 'crisis';
    if (t === 'takip') return 'following';
    return 'foryou';
  }

  window.addEventListener('popstate', function () {
    var t = routeFromLocation();
    if (t === 'crisis' && !state.crisis) M.activateCrisis({ immediate: true });
    if (t !== state.tab) setTab(t, { fromHistory: true });
  });

  /* --------------------------------------------------------------- search */
  function applySearch(value) {
    var query = (value || '').trim().toLocaleLowerCase('tr-TR');
    $$('[data-search-input]').forEach(function (input) {
      if (input.value !== value) input.value = value;
    });
    var rows = $$('.post, .cpost', panel(state.tab));
    var count = 0;
    rows.forEach(function (row) {
      var match = !query || row.innerText.toLocaleLowerCase('tr-TR').indexOf(query) >= 0;
      row.dataset.searchHidden = match ? '' : '1';
      if (match) count++;
    });
    var status = $('#feed-search-status');
    if (status) status.textContent = query ? count + ' sonuç' : '';
  }

  function openSearch(term) {
    var box = $('#feed-search');
    if (!box) return;
    box.hidden = false;
    var input = $('#feed-search-input');
    input.value = term || input.value || '';
    applySearch(input.value);
    window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' });
    setTimeout(function () { input.focus(); }, motionOff() ? 0 : 180);
  }
  M.openSearch = openSearch;

  function closeSearch() {
    var box = $('#feed-search');
    if (box) box.hidden = true;
    applySearch('');
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    document.body.appendChild(buildShell());
    document.body.appendChild(el('<div class="toast-layer" id="toasts"></div>'));
    document.body.appendChild(el('<div class="modal-layer" id="modal" role="dialog" aria-modal="true" hidden></div>'));
    document.body.appendChild(el('<button class="fab" aria-label="Gönder">' + icon('quill', 'ic--lg') + '</button>'));
    document.body.appendChild(el('<nav class="bottombar" aria-label="Alt gezinme">' +
      '<button type="button" data-nav="home" aria-label="Anasayfa">' + icon('home', 'ic--lg') + '</button>' +
      '<button type="button" data-nav="search" aria-label="Keşfet">' + icon('search', 'ic--lg') + '</button>' +
      '<button type="button" data-nav="crisis" aria-label="Kriz Durumu">' + icon('warn', 'ic--lg') + '</button>' +
      '<button type="button" data-nav="imdat" aria-label="İmdat">' + icon('sos', 'ic--lg') + '</button></nav>'));

    renderTabs();
    buildFeeds();
    M.mountComposer();
    M.initCrisis();

    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) {
        if (nav.dataset.nav === 'home') {
          if (state.tab !== 'foryou') setTab('foryou');
          window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' });
        }
        if (nav.dataset.nav === 'search') openSearch('');
        if (nav.dataset.nav === 'compose') {
          var ta = $('#ta');
          if (ta) { ta.focus(); window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' }); }
        }
        if (nav.dataset.nav === 'crisis') {
          if (state.crisis) setTab('crisis');
          else toast('Şu anda bölgenizde aktif bir kriz yok. Tespit edilirse burada görünür.', { muted: true, life: 2400 });
        }
        if (nav.dataset.nav === 'imdat') {
          if (!state.crisis) M.activateCrisis({ immediate: true });
          M.openImdat();
        }
      }
      var trend = e.target.closest('[data-search-term]');
      if (trend) openSearch(trend.dataset.searchTerm);
      var follow = e.target.closest('[data-follow]');
      if (follow) {
        var id = follow.dataset.follow;
        state.follows[id] = !state.follows[id];
        follow.setAttribute('aria-pressed', state.follows[id] ? 'true' : 'false');
        follow.querySelector('.btn-follow').textContent = state.follows[id] ? 'Takip ediliyor' : 'Takip et';
      }
      if (e.target.closest('[data-search-close]')) closeSearch();
    });
    $$('[data-search-input]').forEach(function (input) {
      input.addEventListener('input', function () {
        if ($('#feed-search').hidden) $('#feed-search').hidden = false;
        applySearch(input.value);
      });
    });
    M.on('tab', function () { applySearch($('#feed-search-input').value); });
    M.on('crisis', function (on) {
      $$('[data-crisis-dot]').forEach(function (d) { d.dataset.on = on ? '1' : ''; });
      refreshTrustCard();
    });

    $('#tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (t) setTab(t.dataset.tab);
    });
    $('#tabs').addEventListener('keydown', function (e) {
      var ids = order();
      var i = ids.indexOf(state.tab);
      if (e.key === 'ArrowRight') { e.preventDefault(); setTab(ids[(i + 1) % ids.length]); $('.tab[data-tab="' + ids[(i + 1) % ids.length] + '"]').focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(ids[(i - 1 + ids.length) % ids.length]); $('.tab[data-tab="' + ids[(i - 1 + ids.length) % ids.length] + '"]').focus(); }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { moveUnderline(false); });
    requestAnimationFrame(function () { moveUnderline(false); });

    document.documentElement.dataset.tab = state.tab;
    var initial = routeFromLocation();
    if (initial === 'following') M.setTabInstant('following');
    if (initial === 'crisis') { M.activateCrisis({ immediate: true }); M.setTabInstant('crisis'); }

    M.initDemo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.MIHENK = window.MIHENK || {});
