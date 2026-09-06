/* ==========================================================================
   MİHENK - İmdat: multi-step help-request flow
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
    { t: 'Talebiniz paylaşıldı', s: 'Bilgilerinizi aynı talep üzerinden güncelleyebilirsiniz.' },
    { t: 'Talep açık', s: 'Yanıtları talebinizden takip edin. Bir destek önerisi, yardımın ulaştığı anlamına gelmez.' }
  ];

  var st = { need: [], addr: '', people: null, step: 0, editId: null, region: '', locationKnown: false };
  var draft = st;
  var restored = false;
  function draftKey() { return 'mihenk:help:' + (M.sharedView ? M.sharedView.runId + ':' + M.actorId : 'offline'); }
  function persist() { try { localStorage.setItem(draftKey(), JSON.stringify(st)); } catch (_) {} }
  function showError(message) {
    var note = $('#flow-error');
    if (!note && $('#flowvp')) { note = el('<p class="flow-error" id="flow-error" role="alert"></p>'); $('#flowvp .flow__step:last-child .flow__body').appendChild(note); }
    if(note) note.textContent = message;
  }
  function regionsHTML() {
    return '<label class="field"><span class="field__l">İlçe</span><select id="request-region"><option value="">İlçeyi bilmiyorum</option>' +
      M.CATALOG.regions.slice().sort(function(a,b) { return a.localeCompare(b, 'tr'); }).map(function (loc) { return '<option>' + esc(loc) + '</option>'; }).join('') + '</select></label>';
  }

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
        '<p class="flow__hint">Mahalle, sokak veya yakınındaki belirgin bir yeri yaz.</p>' +
        '<div class="flow__body">' + regionsHTML() +
        '<label class="field"><span class="field__l">Adres tarifi</span>' +
        '<input type="text" id="addr" placeholder="Mahalle, sokak, bina tarifi" maxlength="240" autocomplete="off"></label><p class="field-hint">Bu bilgi talebinizle birlikte herkese görünür. Bir mahalle veya yakınınızdaki belirgin bir yer yeterli.</p>' +
        '<button class="location-skip" type="button" data-flow="unknown-location">Konumu bilmiyorum, devam et</button></div>';
    }
    if (i === 2) {
      return '<h2 class="flow__q" id="flowq">Kaç kişisiniz?</h2>' +
        '<p class="flow__hint">Yardım gereken toplam kişi sayısı.</p>' +
        '<div class="flow__body"><div class="stepper">' +
        '<button class="stepper__b" type="button" data-step="-1" aria-label="Azalt">' + icon('minus', 'ic--lg') + '</button>' +
        '<input class="stepper__v" id="peoplev" type="text" inputmode="numeric" aria-label="Kişi sayısı" placeholder="?" value="">' +
        '<button class="stepper__b" type="button" data-step="1" aria-label="Artır">' + icon('plus', 'ic--lg') + '</button>' +
        '</div><p class="flow__hint">Biliyorsan toplam sayıyı yaz. Daha sonra güncelleyebilirsin.</p><button class="location-skip" type="button" data-flow="unknown-people">Kişi sayısını bilmiyorum, devam et</button></div>';
    }
    if (i === 3) {
      return '<h2 class="flow__q" id="flowq">Çağrınızı gözden geçirin</h2>' +
        '<p class="flow__hint">İhtiyacını ve adres tarifini son kez kontrol et.</p>' +
        '<div class="flow__body"><div class="review" id="review"></div></div>';
    }
    return '<h2 class="flow__q" id="flowq">Talebiniz paylaşıldı</h2>' +
      '<p class="flow__hint">Tekrar paylaşmana gerek yok. Durumunu Taleplerim’den takip edebilirsin.</p>' +
      '<div class="flow__body"><div class="chain" id="chain">' +
      CHAIN.map(function (c, k) {
        return '<div class="chain__i" data-k="' + k + '">' +
          '<span class="chain__b">' + icon(k === 0 ? 'check' : 'clock', 'ic--sm') + '</span>' +
          '<span><span class="chain__t">' + esc(c.t) + '</span><br><span class="chain__s">' + esc(c.s) + '</span></span>' +
          '</div>' + (k < CHAIN.length - 1 ? '<div class="chain__line"></div>' : '');
      }).join('') + '</div></div>';
  }

  function footHTML(i) {
    if (i === 4) return '<div class="flow__foot"><button class="btn" data-flow="requests" type="button">Taleplerime git</button></div>';
    return '<div class="flow__foot">' +
      (i > 0 ? '<button class="btn btn--ghost" data-flow="prev" type="button" '+(st.pending?'disabled':'')+' style="flex:0 0 auto;width:52px" aria-label="Geri">' + icon('chevl') + '</button>' : '') +
      '<button class="btn" data-flow="next" type="button">' + (i === 3 ? (st.pending?'Gönderimi yeniden dene':st.editId ? 'Değişiklikleri kaydet' : 'Talebi oluştur') : 'Devam') + '</button>' +
      '</div>';
  }

  function render(dir) {
    var vp = $('#flowvp');
    var old = vp.querySelector('.flow__step');
    var next = el('<div class="flow__step">' + stepHTML(st.step) + footHTML(st.step) + '</div>');
    if (old && !M.motionOff()) {
      old.inert = true;
      old.removeAttribute('id');
      old.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      old.dataset.anim = dir > 0 ? 'out-next' : 'out-prev';
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 240);
    } else if (old) { old.parentNode.removeChild(old); }
    vp.appendChild(next);
    if (!M.motionOff()) next.dataset.anim = dir > 0 ? 'in-next' : 'in-prev';
    $$('.flow__dot').forEach(function (d, k) { d.dataset.on = k === st.step ? '1' : ''; });
    afterRender();
    var progress = $('#flow-progress');
    if (progress) progress.textContent = st.step === 4 ? 'Paylaşıldı' : 'Adım ' + (st.step + 1) + ' / 4';
    var heading = next.querySelector('h2');
    heading.tabIndex = -1;
    heading.focus();
  }

  function afterRender() {
    if (st.step === 0) {
      $$('[data-need]').forEach(function (b) {
        b.setAttribute('aria-pressed', st.need.indexOf(b.dataset.need) >= 0 ? 'true' : 'false');
      });
    }
    if (st.step === 1) {
      var a = $('#addr'); if (a) { a.value = st.addr; a.addEventListener('input', function () { st.addr = a.value; st.locationKnown = !!(st.addr.trim() || st.region); }); }
      var region = $('#request-region'); region.value = st.region || '';
      region.addEventListener('change', function () { st.region = region.value; st.locationKnown = !!(st.addr.trim() || st.region); });
    }
    if (st.step === 2) { var v = $('#peoplev'); if (v) { v.value = st.people === null ? '' : st.people; v.addEventListener('input', function () { st.people = v.value.trim() === '' ? null : v.value; }); } }
    if (st.step === 3) {
      var names = st.need.map(function (n) {
        return (NEEDS.filter(function (x) { return x.id === n; })[0] || {}).label;
      }).filter(Boolean);
      $('#review').innerHTML =
        row('İhtiyaç', names.length ? names.join(', ') : 'Belirtilmedi') +
        row('Konum', (st.region ? st.region + ' · ' : '') + (st.addr || 'Konum belirtilmedi')) +
        row('Kişi sayısı', st.people === null ? 'Henüz bilinmiyor' : st.people + ' kişi') +
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
        n.dataset.on = k === 0 ? '1' : '';
        if (k === 0) setTimeout(function () { n.dataset.done = '1'; }, M.motionOff() ? 0 : 240);
      }, M.motionOff() ? 0 : k * 620);
    });
  }
  M.runChain = runChain;

  M.openImdat = function (opts) {
    opts = opts || {};
    if (!restored) { try { var saved = JSON.parse(localStorage.getItem(draftKey())); if(saved && Array.isArray(saved.need) && Number.isInteger(saved.step) && saved.step < 4) { st=saved; st.sending=false; draft=st; } } catch(_){} restored=true; }
    if(st.pending&&opts.editId!==st.editId)opts=st.editId?{editId:st.editId}:{};
    if (opts.editId) {
      var original = M.getPost(opts.editId);
      if (!original || original.uid !== 'me' || !original.need) return;
      if (!st.editId) draft = st;
      if(st.editId!==original.id || st.step===4)st = { need: original.need.slice(), addr: original.location ? original.location.text : original.loc, people: original.people == null ? null : original.people, region: original.region || '', locationKnown: original.location ? original.location.known : true, step: 1, editId: original.id, version: original.version };
    } else {
      if (st.editId && !st.pending) st = draft;
      if (st.step === 4 || (opts.need && !st.pending)) st = { need: opts.need || [], addr: '', people: null, step: 0, editId: null, region: '', locationKnown: false };
      draft = st;
    }
    var node = el(
      '<div class="modal">' +
        '<div class="flow__close"><span>' + (M.shared ? 'Yardım talebi' : 'Tatbikat · Gerçek yardım iletilmez') + '</span><button type="button" data-flow="close" aria-label="Talebi kapat">' + icon('close') + '</button></div>' +
        '<p class="flow__progress" id="flow-progress">Adım 1 / 4</p>' +
        '<div class="flow"><div class="flow__dots">' +
          [0, 1, 2, 3, 4].map(function (k) { return '<span class="flow__dot" data-on="' + (k ? '' : '1') + '"></span>'; }).join('') +
        '</div><div class="flow__viewport" id="flowvp"></div></div>' +
      '</div>');
    M.openModal(node, { labelledBy: 'flowq' });
    render(1);

    node.addEventListener('click', async function (e) {
      if(st.sending && !e.target.closest('[data-flow="close"]')) return;
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
        var current = Number(st.people);
        st.people = Math.max(1, (Number.isSafeInteger(current) ? current : 0) + parseInt(sb.dataset.step, 10));
        var v = $('#peoplev');
        v.value = st.people;
        if (!M.motionOff()) { v.dataset.bounce = '1'; setTimeout(function () { v.dataset.bounce = ''; }, 280); }
        return;
      }
      var f = e.target.closest('[data-flow]');
      if (!f) return;
      if (f.dataset.flow === 'close') { M.closeModal(); return; }
      if (f.dataset.flow === 'unknown-location') { st.addr = ''; st.region = ''; st.locationKnown = false; st.step = 2; render(1); return; }
      if (f.dataset.flow === 'unknown-people') { st.people = null; st.step = 3; render(1); return; }
      if (f.dataset.flow === 'requests') {
        M.closeModal(); M.setTabInstant('crisis');
        $('.chip[data-filter="mine"]').click();
        return;
      }
      if (f.dataset.flow === 'prev') { st.step = Math.max(0, st.step - 1); render(-1); return; }
      if (f.dataset.flow === 'next') {
        var error = st.step === 0 && !st.need.length ? 'Devam etmek için bir ihtiyaç seçin.' :
          st.step === 1 && !st.addr.trim() && !st.region ? 'Bir yer tarifi yazın veya Konumu bilmiyorum ile devam edin.' :
          st.step === 2 && st.people !== null && (!/^\d+$/.test(String(st.people)) || !Number.isSafeInteger(Number(st.people)) || Number(st.people) < 1) ? 'Pozitif bir tam sayı yazın veya Kişi sayısını bilmiyorum ile devam edin.' : '';
        if (error) {
          var note = $('#flow-error');
          if (!note) { note = el('<p class="flow-error" id="flow-error" role="alert"></p>'); $('#flowvp .flow__step:last-child .flow__body').appendChild(note); }
          note.textContent = error;
          return;
        }
        if (st.step === 3) {
          var submitting=st;
          if(M.shared || M.transport) {
            st.pending=st.pending || {commandId:crypto.randomUUID(),type:st.editId?'request.update':'request.create',payload:{need:st.need.slice(),people:st.people===null?null:Number(st.people),location:{text:st.addr.trim(),region:st.region||null,known:!!(st.addr.trim()||st.region)}}};
            if(st.editId){st.pending.targetId=st.editId;st.pending.expectedVersion=st.version;}
            st.sending=true;persist();f.disabled=true;f.textContent='Gönderiliyor…';
            var result=await M.transport.send(st.pending);submitting.sending=false;
            if(!result.ok){
              if((result.error.code!=='unavailable'||result.error.retryable===false))delete submitting.pending;
              persist();if(st===submitting && node.isConnected){f.disabled=false;f.textContent='Yeniden dene';showError(result.error.message);
                if(result.error.code==='conflict'){
                  f.disabled=true;
                  var latest=el('<button class="btn btn--ghost" type="button">Son bilgileri karşılaştır</button>');$('#flow-error').after(latest);
                  latest.onclick=async function(){
                    latest.disabled=true;
                    try{
                      var view=await M.transport.getView({thread:submitting.editId}),current=view.thread.post;
                      var compare=el('<div class="thread-original"><b>Son kaydedilen bilgi</b><p>'+esc(current.text)+'</p><p>'+esc(current.location.text||current.location.region||'Konum henüz belirtilmedi')+'</p><p>'+(current.status==='closed'?'Talep kapalı':'Talep açık')+'</p><p>Taslağınız yukarıda korundu. Kaydederseniz bu ayrıntılar taslağınızdaki bilgilerle değişir.</p><button class="btn btn--ghost" type="button">Taslağımla devam et</button></div>');
                      latest.replaceWith(compare);
                      compare.querySelector('button').onclick=function(){submitting.version=current.version;persist();compare.remove();f.disabled=false;f.textContent='Değişiklikleri kaydet';showError('Son bilgileri gördünüz. Taslağınızı düzenleyebilir veya kaydedebilirsiniz.');};
                    }catch(_){latest.disabled=false;showError('Son bilgiler alınamadı. Taslağınız korundu.');}
                  };
                }
              }return;
            }
            delete submitting.pending;submitting.savedId=result.entityId;submitting.step=4;persist();
            if(M.shared)M.refreshShared(true);else if(M.renderCrisisList)M.renderCrisisList();
            if(st===submitting && node.isConnected)render(1);return;
          }
          var names = st.need.map(function (id) { return NEEDS.filter(function (n) { return n.id === id; })[0].label; });
          var post = st.editId && M.state.extraCrisis.find(function (p) { return p.id === st.editId && p.uid === 'me'; });
          if (!post) { post = { id: 'help-' + Date.now().toString(36), uid: 'me', tag: 'yardim', v: 'unverified' }; M.state.extraCrisis.unshift(post); }
          post.text = names.join(', ') + ' ihtiyacı var.' + (st.people === null ? ' Kişi sayısı henüz bilinmiyor.' : ' ' + st.people + ' kişi.');
          post.need = st.need.slice(); post.people = st.people === null ? null : Number(st.people); post.loc = st.addr.trim() || st.region || 'Konum henüz belirtilmedi'; post.region = st.region;
          post.location = { text: st.addr.trim(), region: st.region || null, known: !!(st.addr.trim() || st.region) };
          post.t = st.editId ? 'güncellendi' : 'şimdi';
          post.v = 'unverified'; delete M.state.verified[post.id];
          if (M.renderCrisisList) M.renderCrisisList();
          st.step = 4; render(1); return;
        }
        st.step = Math.min(4, st.step + 1); render(1);
      }
    });
    node.addEventListener('input',persist);
    node.addEventListener('change',persist);
    node.addEventListener('click',persist);
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
