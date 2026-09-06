/* Seeded agent policy with recorded decisions and exact event replay. */
(function (M) {
  'use strict';
  var S = M.SEED, esc = S.esc, run = null, timer = null, sequence = 0, random;
  var ROLES = [
    { name: 'Yardım arayan', tag: 'yardim', text: 'Barınma ve battaniye ihtiyacımız var.', goal: 'İhtiyacına yardım bulmak' },
    { name: 'Gönüllü', tag: 'nokta', text: 'Malzeme dağıtımına destek olabilirim.', goal: 'Yakındaki açık taleplere destek olmak' },
    { name: 'Yakınını arayan', tag: 'kayip', text: 'Yakınımla iletişim kuramıyorum, haber bekliyorum.', goal: 'Yakını hakkında bilgi edinmek' },
    { name: 'Bilgi arayan', tag: 'durum', text: 'Açık yollar ve toplanma alanları hakkında bilgi arıyorum.', goal: 'Güvenilir bilgiye ulaşmak' },
    { name: 'Duyum paylaşan', tag: 'durum', text: 'Bir yolun kapandığını duydum. Kaynağını kontrol edemedim.', goal: 'Duyduğu bilgiyi paylaşmak ve teyit aramak' }
  ];
  var PLACES = ['Pazarcık', 'Onikişubat', 'Dulkadiroğlu', 'Elbistan'];
  function rng(seed) {
    var value = seed >>> 0;
    return function () { value += 0x6D2B79F5; var t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function pick(items) { return items[Math.floor(random() * items.length)]; }
  function allPosts() { return M.state.extraCrisis.concat(S.crisis); }
  function avatar(n) {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="20" fill="#35465d"/><text x="20" y="25" text-anchor="middle" font-family="system-ui" font-size="13" fill="#edf1f7">' + n + '</text></svg>';
  }
  function register(actors) {
    actors.forEach(function (a, i) { S.byId[a.id] = { name: a.name, handle: 'tatbikat' + (i + 1), avatar: avatar(i + 1), org: false }; });
  }
  function plan(actor) {
    var roll = random(), own = M.state.extraCrisis.find(function (p) { return p.uid === actor.id && !p.reposted; });
    var nearby = allPosts().filter(function (p) { return (p.region || p.loc) === actor.place && p.uid !== actor.id; });
    var event = { step: run.turn + 1, actor: actor.id, name: actor.name, kind: 'wait', detail: 'Akışı izlemeyi seçti.', post: null, target: null };
    if (own && own.offers && !own.resolved && actor.role === 0 && roll < .48) {
      event.kind = 'resolve'; event.target = own.id; event.detail = 'Gönüllü desteğini aldı; kendi talebini kapattı.';
    } else if (actor.role === 1 && roll < .7) {
      var needs = nearby.filter(function (p) { return p.simulationId === run.id && p.tag === 'yardim' && !p.resolved && actor.offered.indexOf(p.id) < 0; });
      if (needs.length) { var request = pick(needs); event.kind = 'offer'; event.target = request.id; event.detail = request.loc + ' bölgesindeki açık talebe destek önerdi.'; }
      else { event.kind = 'no_match'; event.detail = actor.place + ' içinde destek verebileceği yeni bir talep bulamadı.'; }
    } else if (!own && (actor.role === 0 || actor.role === 2 || roll < .42)) {
      event.kind = 'post'; event.detail = ROLES[actor.role].name + ' olarak ' + actor.place + ' bölgesinde paylaşım yaptı.';
      event.post = { id: run.id + '-p-' + run.turn, uid: actor.id, t: 'tatbikat', text: ROLES[actor.role].text + ' (' + actor.people + ' kişi)',
        tag: ROLES[actor.role].tag, v: 'unverified', loc: actor.place, region: actor.place, source: actor.role === 4 ? 'relayed' : 'firsthand', simulationId: run.id };
    } else if (own && !own.resolved && actor.role === 0 && roll < actor.impatience) {
      event.kind = 'update'; event.target = own.id; event.detail = 'Yeni kayıt açmak yerine mevcut talebinin hâlâ açık olduğunu belirtti.';
    } else {
      var candidates = nearby.filter(function (p) {
        if (actor.seen.indexOf(p.id) >= 0) return false;
        if (actor.role === 3) return (M.state.verified[p.id] || p.v) === 'official' || (M.state.verified[p.id] || p.v) === 'verified';
        return p.tag === ROLES[actor.role].tag || p.v === 'official';
      });
      if (candidates.length) {
        var post = pick(candidates); event.kind = 'read'; event.target = post.id; event.detail = actor.place + ' bölgesindeki ilgili bir gönderiyi okudu.';
        if (actor.role === 4 && post.v === 'unverified' && roll > actor.caution) {
          event.kind = 'share'; event.detail = 'Teyitsiz bir duyumu aktardı; gönderi doğrulanmamış kaldı.';
          event.post = { id: run.id + '-p-' + run.turn, uid: actor.id, t: 'tatbikat', text: 'Duyum: ' + post.text.slice(0, 280), tag: post.tag,
            v: 'unverified', loc: actor.place, region: actor.place, source: 'relayed', simulationId: run.id, reposted: true };
        }
      } else if (roll < .6) { event.kind = 'no_match'; event.detail = 'Henüz görmediği ilgili bilgi bulamadı; beklemeyi seçti.'; }
    }
    return event;
  }
  function apply(event) {
    var actor = run.actors.find(function (a) { return a.id === event.actor; });
    if (!actor) return;
    if (event.post) { M.state.extraCrisis.unshift(clone(event.post)); run.metrics.posts++; }
    var post = event.target && M.state.extraCrisis.find(function (p) { return p.id === event.target && p.simulationId === run.id; });
    if (event.kind === 'offer' && post) { post.offers = (post.offers || 0) + 1; actor.offered.push(post.id); run.metrics.offers++; }
    if (event.kind === 'resolve' && post && post.uid === actor.id) { post.resolved = true; run.metrics.resolved++; }
    if (event.kind === 'update' && post && post.uid === actor.id) { post.t = 'hâlâ açık'; run.metrics.updates++; }
    if (event.kind === 'read' || event.kind === 'share') { actor.seen.push(event.target); run.metrics.reads++; }
    if (event.kind === 'share') run.metrics.rumors++;
    if (event.kind === 'no_match') run.metrics.misses++;
    actor.memory.push(event.detail); if (actor.memory.length > 8) actor.memory.shift();
    run.events.push(clone(event));
  }
  function tick() {
    if (!run || run.status !== 'running') return;
    var event;
    if (run.replay) event = run.recorded[run.turn];
    else {
      // Every actor gets one opportunity per round; order and choices vary.
      if (!run.order.length) {
        run.order = run.actors.slice();
        for (var i = run.order.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)), temp = run.order[i]; run.order[i] = run.order[j]; run.order[j] = temp; }
      }
      event = plan(run.order.pop());
    }
    apply(event); run.turn++;
    if (run.turn % 10 === 0) M.queueCrisisUpdates();
    if (run.turn >= run.limit) { run.status = 'complete'; clearInterval(timer); timer = null; M.queueCrisisUpdates(); }
    update();
  }
  function removeRun() {
    clearInterval(timer); timer = null;
    if (!run) return;
    M.state.extraCrisis = M.state.extraCrisis.filter(function (p) {
      if (p.simulationId !== run.id) return true;
      delete M.state.verified[p.id]; delete M.state.corroborations[p.id]; return false;
    });
    run.actors.forEach(function (a) { delete S.byId[a.id]; });
  }
  function launch(count, speed, seed) {
    removeRun();
    if (!M.state.crisis) M.activateCrisis({ immediate: true });
    M.setTabInstant('crisis');
    M.$('#crisis-region').value = ''; M.$('#crisis-topic').value = ''; M.applySearch(''); M.$('.chip[data-filter="all"]').click();
    random = rng(seed);
    run = { id: 'sim-' + (++sequence), seed: seed, speed: speed, status: 'running', turn: 0, limit: count * 8, replay: false,
      metrics: { posts: 0, reads: 0, offers: 0, resolved: 0, updates: 0, rumors: 0, misses: 0 }, actors: [], events: [], order: [] };
    for (var i = 0; i < count; i++) run.actors.push({ id: run.id + '-a-' + i, name: 'Katılımcı ' + (i + 1), role: i % ROLES.length,
      place: pick(PLACES), people: 1 + Math.floor(random() * 7), impatience: .2 + random() * .5, caution: .2 + random() * .6, seen: [], offered: [], memory: [] });
    run.initialActors = clone(run.actors);
    register(run.actors); timer = setInterval(tick, speed); update();
  }
  function replay() {
    if (!run || run.status !== 'complete') return;
    var recorded = clone(run.events), initial = clone(run.initialActors), original = run;
    removeRun();
    run = { id: original.id, seed: original.seed, speed: original.speed, status: 'running', turn: 0, limit: recorded.length,
      replay: true, recorded: recorded, events: [], actors: initial, initialActors: clone(initial), order: [],
      metrics: { posts: 0, reads: 0, offers: 0, resolved: 0, updates: 0, rumors: 0, misses: 0 } };
    if (!M.state.crisis) M.activateCrisis({ immediate: true });
    register(run.actors); M.renderCrisisList(); timer = setInterval(tick, run.speed); update();
  }
  function pause() {
    if (!run || run.status === 'complete') return;
    if (run.status === 'running') { clearInterval(timer); timer = null; run.status = 'paused'; }
    else { if (!M.state.crisis) M.activateCrisis({ immediate: true }); run.status = 'running'; timer = setInterval(tick, run.speed); }
    M.queueCrisisUpdates(); update();
  }
  function reset() { removeRun(); run = null; M.renderCrisisList(); update(); }
  function update() {
    if (!M.$('#lab-content')) return;
    var status = run ? run.status : 'idle';
    M.$('#lab-status').textContent = ({ idle: 'Başlamaya hazır', running: 'Katılımcılar karar veriyor', paused: 'Duraklatıldı', complete: 'Tatbikat tamamlandı' })[status] +
      (run ? ' · ' + run.turn + ' / ' + run.limit + (run.replay ? ' · Kayıt tekrarı' : '') : ' · Rastlantısal davranış motoru');
    ['posts', 'offers', 'resolved'].forEach(function (key) { M.$('#lab-' + key).textContent = run ? run.metrics[key] : 0; });
    ['start', 'count', 'speed', 'seed'].forEach(function (id) { M.$('#lab-' + id).disabled = !!run; });
    M.$('#lab-pause').disabled = !run || status === 'complete';
    M.$('#lab-pause').textContent = status === 'paused' ? 'Devam et' : 'Duraklat';
    M.$('#lab-replay').disabled = status !== 'complete';
    M.$('#lab-export').disabled = !run; M.$('#lab-reset').disabled = !run;
    M.$('#lab-log').innerHTML = run ? run.events.slice(-20).reverse().map(function (e) {
      return '<li><span class="lab-event-kind" data-kind="' + e.kind + '">' + esc(e.name) + '</span> ' + esc(e.detail) + '</li>';
    }).join('') : '<li>Her katılımcının bir bölgesi, amacı, sabrı ve önceki adımlardan oluşan hafızası var.</li>';
    M.$('#lab-outcome').textContent = run ? run.metrics.reads + ' okuma · ' + run.metrics.updates + ' talep güncellemesi · ' + run.metrics.rumors + ' duyum aktarımı · ' + run.metrics.misses + ' sonuçsuz arama' : 'İhtiyaç bildirme, bilgi arama, destek önerme, duyum aktarma ve talep kapatma.';
  }
  function exportRun() {
    if (!run) return;
    var report = { version: 2, engine: 'seeded-policy', scenario: 'fictional-earthquake', seed: run.seed, status: run.status,
      participants: run.actors.length, steps: run.turn, metrics: run.metrics, actors: run.actors, events: run.events };
    var url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = 'mihenk-tatbikat-' + run.seed + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function open() {
    var seed = run ? run.seed : Math.floor(Math.random() * 1000000);
    var node = M.el('<div class="modal lab-dialog" id="lab-content">' +
      '<div class="flow__close"><span>MİHENK · Tatbikat</span><button data-lab-close aria-label="Tatbikatı kapat">' + M.icon('close') + '</button></div>' +
      '<h2 id="lab-title">Aynı kriz.<br>Yüz farklı karar.</h2><p class="modal__p">Yardım arayanlar, gönüllüler ve haber bekleyenler aynı akışta birbirlerinin paylaşımlarına tepki verir.</p>' +
      '<div class="lab-controls"><label for="lab-count">Katılımcı<select id="lab-count"><option>20</option><option>50</option><option selected>100</option></select></label>' +
      '<label for="lab-speed">Hız<select id="lab-speed"><option value="180">İzleyerek</option><option value="20">Hızlı</option></select></label>' +
      '<label for="lab-seed">Senaryo anahtarı<input type="number" min="0" max="999999999" id="lab-seed" value="' + seed + '"></label></div>' +
      '<div class="lab-controls"><button class="btn" id="lab-start">Başlat</button><button class="btn btn--ghost" id="lab-pause">Duraklat</button><button class="btn btn--ghost" data-lab-close>Akışı izle</button></div>' +
      '<p id="lab-status" class="lab-status" role="status"></p>' +
      '<div class="lab-stats"><div><b id="lab-posts">0</b>Yeni gönderi</div><div><b id="lab-offers">0</b>Destek önerisi</div><div><b id="lab-resolved">0</b>Karşılanan ihtiyaç</div></div>' +
      '<p class="lab-note" id="lab-outcome"></p><ul class="lab-log" id="lab-log" aria-label="Son tatbikat adımları"></ul>' +
      '<div class="lab-controls"><button class="btn btn--ghost" id="lab-replay">Kararları tekrar oynat</button><button class="btn btn--ghost" id="lab-export">Raporu indir</button><button class="btn btn--ghost" id="lab-reset">Sıfırla</button></div>' +
      '<p class="lab-note">Davranış motoru: rastlantısal kurallar. LLM bağlantısı henüz yok. Aynı karar kaydını tekrar oynatarak ekranı farklı koşullarda inceleyebilirsin.</p></div>');
    M.openModal(node, { labelledBy: 'lab-title' });
    node.querySelectorAll('[data-lab-close]').forEach(function (n) { n.addEventListener('click', M.closeModal); });
    if (run) { M.$('#lab-count').value = run.actors.length; M.$('#lab-speed').value = run.speed; }
    M.$('#lab-start').addEventListener('click', function () { launch(Number(M.$('#lab-count').value), Number(M.$('#lab-speed').value), Math.max(0, Math.min(999999999, Math.floor(Number(M.$('#lab-seed').value) || 0)))); });
    M.$('#lab-pause').addEventListener('click', pause); M.$('#lab-replay').addEventListener('click', replay);
    M.$('#lab-reset').addEventListener('click', reset); M.$('#lab-export').addEventListener('click', exportRun); update();
  }
  M.initSimulation = function () {
    document.addEventListener('click', function (e) { if (e.target.closest('[data-open-lab]')) open(); });
    M.on('crisis', function (active) { if (!active && run && run.status === 'running') pause(); });
  };
})(window.MIHENK = window.MIHENK || {});
