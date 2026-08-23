/* ==========================================================================
   MİHENK — feed: rendering, skeletons, FLIP, optimistic interactions
   ========================================================================== */
(function (M) {
  'use strict';
  var S = M.SEED, esc = S.esc, icon = M.icon, el = M.el, $ = M.$, $$ = M.$$;
  var state = M.state;

  /* ------------------------------------------------------------ skeleton */
  M.skeleton = function (n) {
    var rows = '';
    for (var i = 0; i < n; i++) {
      var w1 = 30 + (i * 13) % 26, w2 = 62 + (i * 17) % 30, w3 = 40 + (i * 23) % 40;
      rows +=
        '<div class="sk-row"><div class="sk sk--av"></div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="sk sk--l" style="width:' + w1 + '%;margin:6px 0 10px"></div>' +
        '<div class="sk sk--l" style="width:' + w2 + '%;margin-bottom:8px"></div>' +
        '<div class="sk sk--l" style="width:' + w3 + '%;margin-bottom:10px"></div>' +
        '</div></div>';
    }
    return rows;
  };

  /* ------------------------------------------------------------- stagger */
  M.stagger = function (panel) {
    if (M.motionOff()) return;
    var rows = $$('.post, .cpost', panel).slice(0, 6);
    rows.forEach(function (r, i) {
      r.style.setProperty('--i', i);
      r.classList.add('post--stagger');
    });
    setTimeout(function () {
      rows.forEach(function (r) { r.classList.remove('post--stagger'); r.style.removeProperty('--i'); });
    }, 460);
  };

  /* --------------------------------------------------------- post render */
  function act(kind, cls, label, n, on) {
    if (kind === 'views') {
      return '<span class="act act--views ' + (cls || '') + '" aria-label="' + esc(label + ': ' + M.nfmt(n)) + '">' +
        '<span class="act__halo">' + icon('views') + '</span><span class="act__n">' + M.nfmt(n) + '</span></span>';
    }
    return '<button class="act act--' + kind + ' ' + (cls || '') + '" type="button" ' +
      'data-act="' + kind + '" ' + (on ? 'data-on="1" ' : '') +
      ((kind === 'like' || kind === 'repost') ? 'aria-pressed="' + (on ? 'true' : 'false') + '" ' : '') +
      'aria-label="' + esc(label) + '">' +
      '<span class="act__halo">' + icon(kind === 'reply' ? 'reply' : kind === 'repost' ? 'repost' :
        kind === 'like' ? 'heart' : kind === 'views' ? 'views' : 'share') + '</span>' +
      (n === null ? '' : '<span class="act__n">' + M.nfmt(n) + '</span>') +
      '</button>';
  }

  function postHTML(p) {
    var u = S.byId[p.uid];
    var liked = !!state.likes[p.id];
    var rep = !!state.reposts[p.id];
    return '<article class="post" data-id="' + p.id + '" ' +
      'aria-label="' + esc(u.name + ' gönderisi') + '">' +
      '<span class="av">' + u.avatar + '</span>' +
      '<div class="post__col">' +
        '<div class="post__head">' +
          '<span class="post__name">' + esc(u.name) + '</span>' +
          (u.org ? '<span class="post__verified">' + icon('vbadge') + '</span>' : '') +
          '<span class="post__handle">@' + esc(u.handle) + '</span>' +
          '<span class="post__dot">·</span>' +
          '<span class="post__time">' + esc(p.t) + '</span>' +
          '<button class="post__more" type="button" disabled aria-disabled="true" aria-label="Diğer işlemler (prototip kapsamı dışında)">' + icon('dots', 'ic--sm') + '</button>' +
        '</div>' +
        '<div class="post__body">' + esc(p.text) + '</div>' +
        (p.media ? '<div class="post__media">' + S.media(p.media) + '</div>' : '') +
        '<div class="acts">' +
          act('reply', '', 'Yanıtla', p.replies + (state.replies && state.replies[p.id] || 0)) +
          act('repost', '', 'Yeniden gönder', p.reposts + (rep ? 1 : 0), rep) +
          act('like', '', 'Beğen', p.likes + (liked ? 1 : 0), liked) +
          act('views', '', 'Görüntülenme', p.views) +
          act('share', '', 'Paylaş', null) +
        '</div>' +
      '</div></article>';
  }
  M.postHTML = postHTML;

  M.renderFeed = function (id) {
    var p = M.panel(id);
    var data = id === 'following' ? S.following : S.forYou;
    var host = el('<div class="feed__list"></div>');
    host.innerHTML = data.map(postHTML).join('');
    p.innerHTML = '';
    p.appendChild(el('<div class="pin-host" data-feed="' + id + '"></div>'));
    p.appendChild(host);
    p.appendChild(el('<div class="feed__end">Akışın sonundasın · ' + (id === 'following' ? 'Takip' : 'Sana Özel') + '</div>'));
  };

  /* ------------------------------------------- optimistic like / repost */
  function bounce(btn) {
    if (M.motionOff()) return;
    btn.dataset.bounce = '1';
    setTimeout(function () { btn.dataset.bounce = ''; }, 280);
  }

  function syncAction(id, kind, base) {
    $$('.post[data-id="' + id + '"] [data-act="' + kind + '"]').forEach(function (btn) {
      var on = kind === 'like' ? !!state.likes[id] : !!state.reposts[id];
      btn.dataset.on = on ? '1' : '';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var n = btn.querySelector('.act__n');
      if (n) n.textContent = M.nfmt(base[kind === 'like' ? 'likes' : 'reposts'] + (on ? 1 : 0));
      bounce(btn);
    });
  }

  function syncReplies(id, base) {
    $$('.post[data-id="' + id + '"] [data-act="reply"] .act__n').forEach(function (n) {
      n.textContent = M.nfmt(base.replies + state.replies[id]);
    });
  }

  async function copyShareLink(id) {
    var url = location.href.split('#')[0] + '#gonderi-' + encodeURIComponent(id);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
      else {
        var input = document.createElement('textarea');
        input.value = url; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.appendChild(input); input.select();
        var copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('copy failed');
      }
      M.toast('Bağlantı kopyalandı', { muted: true, life: 1600 });
    } catch (_) {
      M.toast('Bağlantı kopyalanamadı', { muted: true, life: 2000 });
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.act');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    var art = a.closest('.post');
    if (!art) return;
    var id = art.dataset.id;
    var kind = a.dataset.act;
    var base = (S.forYou.concat(S.following)).filter(function (p) { return p.id === id; })[0];
    if (!base) return;

    if (kind === 'like') {
      state.likes[id] = !state.likes[id];
      syncAction(id, kind, base);
    } else if (kind === 'repost') {
      state.reposts[id] = !state.reposts[id];
      syncAction(id, kind, base);
    } else if (kind === 'reply') {
      state.replies = state.replies || {};
      state.replies[id] = (state.replies[id] || 0) + 1;
      syncReplies(id, base);
      bounce(a);
      M.toast('Yanıtın eklendi', { muted: true, life: 1600 });
    } else if (kind === 'share') {
      copyShareLink(id);
    }
  });

  /* -------------------------------------------------------------- composer */
  M.mountComposer = function () {
    var c = el(
      '<div class="composer" id="composer">' +
        '<span class="av">' + S.me.avatar + '</span>' +
        '<div class="composer__col">' +
          '<label class="sr-only" for="ta">Ne oluyor?</label>' +
          '<textarea class="composer__ta" id="ta" rows="1" placeholder="Ne oluyor?"></textarea>' +
          '<div class="tagsel" id="tagsel" hidden>' +
            '<div class="tagsel__h">Bu paylaşımı etiketle</div>' +
            '<div class="tagsel__row">' +
              S.TAGS.map(function (t) {
                return '<button class="chip" type="button" role="button" aria-pressed="false" data-tag="' + t.id + '">' + esc(t.label) + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="composer__bar">' +
            [['image', 'Görsel'], ['poll', 'Anket'], ['emoji', 'Emoji'], ['clock', 'Zamanlama'], ['pin', 'Konum']].map(function (i) {
              return '<button class="composer__tool" type="button" disabled aria-disabled="true" title="Prototip kapsamı dışında" aria-label="' + i[1] + ' (prototip kapsamı dışında)">' + icon(i[0]) + '</button>';
            }).join('') +
            '<button class="btn composer__post" id="postbtn" type="button" disabled>Gönder</button>' +
          '</div>' +
        '</div>' +
      '</div>');
    $('#feeds').insertBefore(c, $('#feeds').firstChild);

    var ta = $('#ta'), btn = $('#postbtn');
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 260) + 'px';
      btn.disabled = !ta.value.trim();
    });
    btn.addEventListener('click', function () { M.submitCompose(ta.value.trim()); });
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (ta.value.trim()) M.submitCompose(ta.value.trim()); }
    });

    $('#tagsel').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', $('#tagsel')).forEach(function (c2) { c2.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      M.emit('tagpick', chip.dataset.tag);
    });

    M.on('tab', function (d) {
      c.style.display = (d.to === 'crisis') ? 'none' : '';
    });

    var fab = $('.fab');
    if (fab) fab.addEventListener('click', function () {
      if (state.tab === 'crisis' && M.openCrisisComposer) {
        M.openCrisisComposer('');
        setTimeout(function () { var crisisTa = $('#cta'); if (crisisTa) crisisTa.focus(); }, M.motionOff() ? 0 : 180);
        return;
      }
      c.dataset.mobileOpen = '1';
      window.scrollTo({ top: 0, behavior: (M.motionOff() || M.capture) ? 'auto' : 'smooth' });
      setTimeout(function () { ta.focus(); }, M.motionOff() ? 0 : 180);
    });
  };

  M.composerValue = function () { return $('#ta') ? $('#ta').value : ''; };
  M.clearComposer = function () {
    var ta = $('#ta');
    if (!ta) return;
    ta.value = ''; ta.style.height = 'auto';
    var composer = $('#composer');
    if (composer) composer.dataset.mobileOpen = '';
    $('#postbtn').disabled = true;
    $('#tagsel').hidden = true;
    $$('.chip', $('#tagsel')).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
  };

})(window.MIHENK = window.MIHENK || {});
