/* ==========================================================================
   MİHENK — demo runner
   Scripted scenarios on a virtual clock driven by requestAnimationFrame
   frame counts (never wall-clock), so headless captures are reproducible
   frame for frame. Synthetic cursor with click ripples.
   ========================================================================== */
(function (M) {
  'use strict';
  var $ = M.$, $$ = M.$$, el = M.el, icon = M.icon;
  var state = M.state;
  var FPS = 60;
  function sec(s) { return Math.round(s * FPS); }

  /* ------------------------------------------------------------ clock */
  var clock = { frame: 0, running: false, tl: [], i: 0, total: 0, tweens: [], onEnd: null, id: null };
  M.demoFrame = function () { return clock.frame; };
  M.demoRunning = function () { return clock.running; };

  /* One frame of the virtual clock. Interactively this is driven by
     requestAnimationFrame; under headless capture the recorder calls
     __mihenk.step() once per frame instead, so the same frame numbers
     produce the same output every run. */
  function tick() {
    if (!clock.running) return;
    clock.frame++;
    while (clock.i < clock.tl.length && clock.tl[clock.i].f <= clock.frame) {
      try { clock.tl[clock.i].fn(); } catch (e) { /* keep the reel rolling */ }
      clock.i++;
    }
    if (CAPT) drivePulse();
    for (var k = clock.tweens.length - 1; k >= 0; k--) {
      var tw = clock.tweens[k];
      tw.t++;
      var p = Math.min(1, tw.t / tw.d);
      tw.step(ease(p));
      if (p >= 1) clock.tweens.splice(k, 1);
    }
    if (clock.frame >= clock.total) { stop(true); return; }
    if (!CAPT) requestAnimationFrame(tick);
  }
  function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  /* clock-driven replacement for the CSS warning pulse (capture only) */
  var pulsePeriod = 120;
  function drivePulse() {
    var nodes = $$('.tab--crisis .ic, .pin__k .ic');
    if (!nodes.length) return;
    var ph = (clock.frame % pulsePeriod) / pulsePeriod;
    var k = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
    var op = (0.65 + 0.35 * k).toFixed(3);
    var sc = (1 + 0.16 * k).toFixed(4);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.style.animation !== 'none') n.style.animation = 'none';
      n.style.opacity = op;
      n.style.transform = 'scale(' + sc + ')';
    }
  }

  function stop(finished) {
    clock.running = false;
    clock.tweens.length = 0;
    cursorOff();
    $$('.demo__btn').forEach(function (b) { b.dataset.active = ''; });
    if (finished && clock.onEnd) clock.onEnd();
  }
  M.demoStop = function () { stop(false); };

  /* ----------------------------------------------------------- cursor */
  var cur = null, cx = 0, cy = 0;
  function ensureCursor() {
    if (cur) return cur;
    cur = el('<div class="cursor" aria-hidden="true"><span class="cursor__ripple"></span></div>');
    document.body.appendChild(cur);
    return cur;
  }
  function cursorPut(x, y) {
    cx = x; cy = y;
    var c = ensureCursor();
    c.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }
  function cursorOn(x, y) { ensureCursor().dataset.on = '1'; cursorPut(x, y); }
  function cursorOff() { if (cur) cur.dataset.on = ''; }

  function centerOf(sel) {
    var n = typeof sel === 'string' ? $(sel) : sel;
    if (!n) return null;
    var r = n.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, node: n };
  }

  function tweenCursorTo(sel, frames) {
    var c = centerOf(sel);
    if (!c) return;
    var node = ensureCursor();
    node.style.opacity = '';
    node.dataset.on = '1';
    var x0 = cx, y0 = cy;
    if (!x0 && !y0) { cursorPut(c.x, c.y + 120); x0 = cx; y0 = cy; }
    clock.tweens.push({
      t: 0, d: Math.max(1, frames),
      step: function (p) { cursorPut(x0 + (c.x - x0) * p, y0 + (c.y - y0) * p); }
    });
  }

  function ripple() {
    var c = ensureCursor();
    c.dataset.click = '';
    void c.offsetWidth;
    c.dataset.click = '1';
    setTimeout(function () { c.dataset.click = ''; }, 440);
  }

  function clickSel(sel) {
    var c = centerOf(sel);
    if (c) cursorPut(c.x, c.y);
    ripple();
    if (c && c.node) {
      setTimeout(function () {
        c.node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, 90);
    }
  }

  function scrollTween(to, frames) {
    var y0 = window.scrollY;
    clock.tweens.push({
      t: 0, d: Math.max(1, frames),
      step: function (p) { window.scrollTo(0, y0 + (to - y0) * p); }
    });
  }

  /* ------------------------------------------------------- script DSL */
  function Seq() {
    this.f = 0; this.tl = [];
  }
  Seq.prototype.wait = function (fr) { this.f += fr; return this; };
  Seq.prototype.at = function (fn) { var s = this; s.tl.push({ f: s.f, fn: fn }); return s; };
  Seq.prototype.move = function (sel, fr) {
    var s = this;
    s.tl.push({ f: s.f, fn: function () { tweenCursorTo(sel, fr); } });
    s.f += fr; return s;
  };
  Seq.prototype.click = function (sel, pad) {
    var s = this;
    s.tl.push({ f: s.f, fn: function () { clickSel(sel); } });
    s.f += (pad === undefined ? 14 : pad); return s;
  };
  Seq.prototype.scroll = function (y, fr) {
    var s = this;
    s.tl.push({ f: s.f, fn: function () { scrollTween(y, fr); } });
    s.f += fr; return s;
  };
  Seq.prototype.type = function (sel, text, fr) {
    var s = this;
    var per = Math.max(1, Math.floor(fr / text.length));
    for (var i = 1; i <= text.length; i++) {
      (function (n, at) {
        s.tl.push({ f: at, fn: function () {
          var t = $(sel); if (!t) return;
          t.value = text.slice(0, n);
          t.dispatchEvent(new Event('input', { bubbles: true }));
        } });
      })(i, s.f + i * per);
    }
    s.f += text.length * per; return s;
  };

  function instantly(fn) {
    state.instant = true;
    fn();
    state.instant = false;
  }
  M.instantly = instantly;

  /* -------------------------------------------------------- scenarios */
  var CAPTION = {
    activation:   'Kriz modu devreye giriyor',
    'tab-switch': 'Normal akışlar yerinde kalır',
    verification: 'Dört doğrulama durumu',
    interception: 'Paylaşımı kriz akışına yönlendirme',
    imdat:        'İmdat çağrısı akışı',
    'plain-mode': 'Düşük bant genişliği modu'
  };

  function resetAll() {
    instantly(function () {
      M.closeModal();
      state.filter = 'all';
      state.extraCrisis.length = 0;
      state.verified = {};
      if (state.tab !== 'foryou') M.setTabInstant('foryou');
      if (state.crisis) M.deactivateCrisis({ immediate: true, silent: true });
      $$('.pin-host').forEach(function (h) { h.innerHTML = ''; });
      $$('.toast').forEach(function (t) { if (t.parentNode) t.parentNode.removeChild(t); });
      M.setPlain(false);
      M.clearComposer();
      var c = $('#composer'); if (c) c.style.display = '';
      state.scroll = { foryou: 0, following: 0, crisis: 0 };
      window.scrollTo(0, 0);
      M.moveUnderline(false);
      state.busy = false;
    });
  }
  M.demoReset = resetAll;

  function crisisNow() {
    instantly(function () { M.activateCrisis({ immediate: true }); });
  }
  function tabNow(id) {
    instantly(function () { M.setTabInstant(id); });
  }

  var SCEN = {

    /* 1 — activation: normal feed → toast → pinned card → crisis tab,
       then the spec'd deactivation returns the exact opening frame.     */
    activation: { dur: 7.0, setup: function () { resetAll(); }, build: function () {
      var s = new Seq();
      s.wait(sec(.5))
       .move('.proto-ctl [data-ctl="crisis"], .tab[data-tab="foryou"]', sec(.5))
       .at(function () { M.activateCrisis(); })
       .wait(sec(3.0))
       .at(function () { M.deactivateCrisis({ toastLife: 1500 }); })
       .wait(sec(2.3));
      return s;
    } },

    /* 2 — tab switching, palette shift, skeletons, underline spring     */
    'tab-switch': { dur: 5.2, setup: function () { resetAll(); crisisNow(); }, build: function () {
      var s = new Seq();
      s.wait(sec(.35))
       .move('.tab[data-tab="following"]', sec(.4)).click('.tab[data-tab="following"]')
       .wait(sec(.95))
       .move('.tab[data-tab="crisis"]', sec(.45)).click('.tab[data-tab="crisis"]')
       .wait(sec(1.35))
       .move('.tab[data-tab="foryou"]', sec(.5)).click('.tab[data-tab="foryou"]')
       .wait(sec(.85));
      return s;
    } },

    /* 3 — verification states + filter chips re-flowing the feed        */
    verification: { dur: 7.0, setup: function () {
      resetAll(); crisisNow();
      tabNow('crisis');
    }, build: function () {
      var s = new Seq();
      s.wait(sec(.3))
       .scroll(320, sec(1.1))
       .wait(sec(.35))
       .scroll(760, sec(1.0))
       .wait(sec(.3))
       .scroll(0, sec(.75))
       .move('.chip[data-filter="resmi"]', sec(.45)).click('.chip[data-filter="resmi"]')
       .wait(sec(.9))
       .move('.chip[data-filter="dogrulanmis"]', sec(.4)).click('.chip[data-filter="dogrulanmis"]')
       .wait(sec(.9))
       .move('.chip[data-filter="all"]', sec(.4)).click('.chip[data-filter="all"]')
       .wait(sec(.7));
      return s;
    } },

    /* 4 — share interception → crisis composer → tag → post → upgrade  */
    interception: { dur: 9.2, setup: function () { resetAll(); crisisNow(); }, build: function () {
      var s = new Seq();
      s.wait(sec(.3))
       .move('#ta', sec(.45)).click('#ta', 6)
       .type('#ta', 'Enkaz altında ses duyuluyor, kurtarma ekibi lazım.', sec(1.5))
       .wait(sec(.35))
       .move('#postbtn', sec(.4)).click('#postbtn')
       .wait(sec(.9))
       .move('#go-crisis', sec(.45)).click('#go-crisis')
       .wait(sec(1.3))
       .move('#ctagsel .chip[data-tag="yardim"]', sec(.45)).click('#ctagsel .chip[data-tag="yardim"]')
       .wait(sec(.35))
       .move('#cpostbtn', sec(.35)).click('#cpostbtn')
       .wait(sec(2.4))
       .at(function () { M.setTab('foryou'); })
       .wait(sec(1.0));
      return s;
    } },

    /* 5 — full İmdat flow through to AFAD'a iletildi                     */
    imdat: { dur: 10.4, setup: function () {
      resetAll(); crisisNow();
      tabNow('crisis');
    }, build: function () {
      var s = new Seq();
      s.wait(sec(.3))
       .move('#sos', sec(.5)).click('#sos')
       .wait(sec(.7))
       .move('[data-need="kurtarma"]', sec(.45)).click('[data-need="kurtarma"]')
       .wait(sec(.2))
       .move('[data-need="saglik"]', sec(.35)).click('[data-need="saglik"]')
       .wait(sec(.25))
       .move('[data-flow="next"]', sec(.4)).click('[data-flow="next"]')
       .wait(sec(.75))
       .type('#addr', 'Toplanma alanı yakını', sec(.85))
       .wait(sec(.2))
       .move('[data-flow="next"]', sec(.4)).click('[data-flow="next"]')
       .wait(sec(.5))
       .move('[data-step="1"]', sec(.35)).click('[data-step="1"]', 10).click('[data-step="1"]', 10)
       .wait(sec(.3))
       .move('[data-flow="next"]', sec(.4)).click('[data-flow="next"]')
       .wait(sec(.7))
       .move('[data-flow="next"]', sec(.35)).click('[data-flow="next"]')
       .wait(sec(2.7))
       .move('[data-flow="close"]', sec(.4)).click('[data-flow="close"]')
       .wait(sec(.6));
      return s;
    } },

    /* 6 — low-bandwidth mode strips the interface, byte chip animates   */
    'plain-mode': { dur: 5.4, setup: function () {
      resetAll(); crisisNow();
      tabNow('crisis');
    }, build: function () {
      var s = new Seq();
      s.wait(sec(.45))
       .move('#lowband', sec(.55)).click('#lowband')
       .wait(sec(2.1))
       .move('#lowband', sec(.4)).click('#lowband')
       .wait(sec(1.2));
      return s;
    } }
  };

  M.scenarios = Object.keys(SCEN);
  M.scenarioDur = function (id) { return SCEN[id] ? SCEN[id].dur : 0; };

  function run(id, onEnd) {
    var sc = SCEN[id];
    if (!sc) return false;
    stop(false);
    clock.id = id;
    sc.setup();
    M.moveUnderline(false);
    var seq = sc.build();
    clock.tl = seq.tl.slice().sort(function (a, b) { return a.f - b.f; });
    clock.i = 0;
    clock.frame = 0;
    /* +0.6s tail so every in-flight transition settles before the loop point */
    clock.total = Math.max(sec(sc.dur), seq.f) + sec(.6);
    /* Phase-lock the 2s warning pulse to the clip length so an infinite
       animation cannot leave a seam at the loop point. */
    if (CAPT) {
      var clipMs = clock.total / FPS * 1000;
      var cycles = Math.max(1, Math.round(clipMs / 2000));
      document.documentElement.style.setProperty('--pulse-dur', (clipMs / cycles).toFixed(2) + 'ms');
      /* The 2s warning pulse is an infinite composited animation: it would
         both seam at the loop point and get left out of a frame grab. Under
         capture we drive it from the same clock instead, at a period that
         divides the clip exactly. */
      pulsePeriod = clock.total / cycles;
    }
    clock.onEnd = onEnd || null;
    clock.running = true;
    /* park the cursor invisibly; it fades in on its first move and fades
       back out before the last frame so the clip loops without a seam */
    cursorPut(window.innerWidth * 0.52, window.innerHeight * 0.78);
    cursorOff();
    if (CAPT) {
      /* Under frame-by-frame capture the fade is driven from the clock and
         the node is removed before the last frame, so the grabbed pixels
         always agree with the state — a CSS opacity transition can be left
         un-composited by a paused compositor. */
      clock.tl.push({ f: Math.max(1, clock.total - 26), fn: function () {
        var c = ensureCursor();
        clock.tweens.push({ t: 0, d: 16, step: function (p) { c.style.opacity = String(1 - p); } });
      } });
      clock.tl.push({ f: Math.max(2, clock.total - 8), fn: function () {
        if (cur && cur.parentNode) cur.parentNode.removeChild(cur);
        cur = null;
      } });
    } else {
      clock.tl.push({ f: Math.max(1, clock.total - 22), fn: cursorOff });
    }
    clock.tl.sort(function (a, b) { return a.f - b.f; });
    setCaption(CAPTION[id]);
    var b = $('.demo__btn[data-sc="' + id + '"]');
    $$('.demo__btn').forEach(function (x) { x.dataset.active = ''; });
    if (b) b.dataset.active = '1';
    if (!CAPT) requestAnimationFrame(tick);
    return true;
  }
  M.runScenario = run;

  /* --------------------------------------------------------- caption */
  function setCaption(text) {
    if (!CAPT) return;
    var c = $('#capstrip');
    if (!c) {
      c = el('<div class="capstrip" id="capstrip"></div>');
      document.body.appendChild(c);
    }
    c.textContent = text || '';
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = '';
  }

  /* ------------------------------------------------------------ panel */
  var Q = new URLSearchParams(location.search);
  var DEMO = Q.get('demo') === '1';
  var CAPT = Q.get('capture') === '1';
  M.capture = CAPT;

  M.initDemo = function () {
    if (CAPT) {
      document.documentElement.dataset.capture = '1';
      var st = document.createElement('style');
      /* Frame-by-frame capture paints on the main thread: promoted layers
         would keep compositor-driven transitions out of the grabbed frame. */
      st.textContent = '.proto-ctl,.proto-ctl-mobile,.demo{display:none!important}' +
        'html,body{overflow-x:hidden}' +
        '::-webkit-scrollbar{width:0;height:0}' +
        '*{will-change:auto!important}';
      document.head.appendChild(st);
    }

    if (DEMO) {
      var p = el('<aside class="demo" id="demo" aria-label="Demo kontrolleri">' +
        '<h3>Demo senaryoları</h3><div class="demo__grid">' +
        M.scenarios.map(function (id, i) {
          return '<button class="demo__btn" type="button" data-sc="' + id + '">' +
            (i + 1) + '. ' + id + ' · ' + SCEN[id].dur.toFixed(1) + 's</button>';
        }).join('') +
        '</div><div class="demo__hr"></div><div class="demo__grid">' +
        '<button class="demo__btn" type="button" data-demo="reset">Sıfırla</button>' +
        '<button class="demo__btn" type="button" data-demo="rec">WebM kaydını başlat</button>' +
        '<button class="demo__btn" type="button" data-demo="recall">Tüm klipleri kaydet</button>' +
        '</div><div class="demo__hr"></div>' +
        '<p class="demo__note">Sanal saat: rAF kare sayacı. Aynı senaryo her çalıştırmada kare kare aynıdır.</p>' +
        '</aside>');
      document.body.appendChild(p);
      p.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sc]');
        if (b) { run(b.dataset.sc); return; }
        var d = e.target.closest('[data-demo]');
        if (!d) return;
        if (d.dataset.demo === 'reset') { stop(false); resetAll(); }
        if (d.dataset.demo === 'rec') M.recordCurrent();
        if (d.dataset.demo === 'recall') M.recordAll();
      });
    }

    var auto = Q.get('scenario');
    if (auto && SCEN[auto]) {
      window.__MIHENK_READY = false;
      setTimeout(function () {
        SCEN[auto].setup();
        setCaption(CAPTION[auto]);
        window.__MIHENK_READY = true;
        if (!CAPT) run(auto);
      }, 120);
    } else {
      window.__MIHENK_READY = true;
    }

    /* headless capture API */
    window.__mihenk = {
      run: function (id) { return run(id); },
      step: function () { tick(); return clock.frame; },
      reset: resetAll,
      frame: function () { return clock.frame; },
      total: function () { return clock.total; },
      running: function () { return clock.running; },
      scenarios: M.scenarios,
      dur: function (id) { return SCEN[id] ? SCEN[id].dur : 0; },
      caption: function (id) { return CAPTION[id]; },
      setup: function (id) { if (SCEN[id]) { SCEN[id].setup(); setCaption(CAPTION[id]); } }
    };
  };

})(window.MIHENK = window.MIHENK || {});
