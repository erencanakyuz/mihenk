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
    return '<button class="act act--' + kind + ' ' + (cls || '') + '" type="button" ' +
      'data-act="' + kind + '" ' + (on ? 'data-on="1" ' : '') +
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
    return '<article class="post" data-id="' + p.id + '" tabindex="0" role="article" ' +
      'aria-label="' + esc(u.name + ' gönderisi') + '">' +
      '<span class="av">' + u.avatar + '</span>' +
      '<div class="post__col">' +
        '<div class="post__head">' +
          '<span class="post__name">' + esc(u.name) + '</span>' +
          (u.org ? '<span class="post__verified">' + icon('vbadge') + '</span>' : '') +
          '<span class="post__handle">@' + esc(u.handle) + '</span>' +
          '<span class="post__dot">·</span>' +
          '<span class="post__time">' + esc(p.t) + '</span>' +
          '<button class="post__more" type="button" aria-label="Daha fazla">' + icon('dots', 'ic--sm') + '</button>' +
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

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.act');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    var art = a.closest('.post');
    if (!art) return;
    var id = art.dataset.id;
    var kind = a.dataset.act;
    var nEl = a.querySelector('.act__n');
    var base = (S.forYou.concat(S.following)).filter(function (p) { return p.id === id; })[0];
    if (!base) return;

    if (kind === 'like') {
      state.likes[id] = !state.likes[id];
      a.dataset.on = state.likes[id] ? '1' : '';
      nEl.textContent = M.nfmt(base.likes + (state.likes[id] ? 1 : 0));
      bounce(a);
    } else if (kind === 'repost') {
      state.reposts[id] = !state.reposts[id];
      a.dataset.on = state.reposts[id] ? '1' : '';
      nEl.textContent = M.nfmt(base.reposts + (state.reposts[id] ? 1 : 0));
      bounce(a);
    } else if (kind === 'reply') {
      state.replies = state.replies || {};
      state.replies[id] = (state.replies[id] || 0) + 1;
      nEl.textContent = M.nfmt(base.replies + state.replies[id]);
      bounce(a);
      M.toast('Yanıtın eklendi', { muted: true, life: 1600 });
    } else if (kind === 'share') {
      M.toast('Bağlantı kopyalandı', { muted: true, life: 1600 });
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
            ['image', 'poll', 'emoji', 'clock', 'pin'].map(function (i) {
              return '<button class="composer__tool" type="button" aria-label="' + i + '">' + icon(i) + '</button>';
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
    if (fab) fab.addEventListener('click', function () { ta.focus(); window.scrollTo({ top: 0, behavior: (M.motionOff() || M.capture) ? 'auto' : 'smooth' }); });
  };

  M.composerValue = function () { return $('#ta') ? $('#ta').value : ''; };
  M.clearComposer = function () {
    var ta = $('#ta');
    if (!ta) return;
    ta.value = ''; ta.style.height = 'auto';
    $('#postbtn').disabled = true;
    $('#tagsel').hidden = true;
    $$('.chip', $('#tagsel')).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
  };

})(window.MIHENK = window.MIHENK || {});
