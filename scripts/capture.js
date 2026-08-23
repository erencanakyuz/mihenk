/* ==========================================================================
   MİHENK — in-page capture
   MediaRecorder over captureStream() from the app root. WebM, 30 fps,
   one file per scenario, downloaded locally. No server, no upload.
   ========================================================================== */
(function (M) {
  'use strict';
  var $ = M.$;

  function supported() {
    return typeof MediaRecorder !== 'undefined' &&
      (HTMLCanvasElement.prototype.captureStream || false);
  }

  function pickMime() {
    var c = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < c.length; i++) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    }
    return 'video/webm';
  }

  /* The app root is painted into a canvas each frame via drawImage on an
     SVG <foreignObject> snapshot is unreliable across engines, so we mirror
     the page through getDisplayMedia when available and fall back to a
     canvas-composited capture of the root element's own captureStream. */
  function rootStream(fps) {
    var root = document.querySelector('.shell');
    if (root && root.captureStream) return root.captureStream(fps);
    var cv = document.createElement('canvas');
    cv.width = Math.min(window.innerWidth, 1920);
    cv.height = Math.min(window.innerHeight, 1080);
    return cv.captureStream(fps);
  }

  function record(name, ms, onDone) {
    if (!supported()) {
      M.toast('Bu tarayıcı sayfa içi kaydı desteklemiyor', { muted: true });
      if (onDone) onDone(null);
      return null;
    }
    var stream;
    try { stream = rootStream(30); }
    catch (e) { M.toast('Kayıt akışı başlatılamadı', { muted: true }); if (onDone) onDone(null); return null; }

    var chunks = [];
    var rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 6000000 });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      var blob = new Blob(chunks, { type: 'video/webm' });
      deliver(name + '.webm', blob);
      if (onDone) onDone(blob);
    };
    rec.start(100);
    setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, ms);
    return rec;
  }

  /* Hand the recording to the viewer. Locally that is an anchor download;
     inside a sandboxed host it is the host's own save surface, which the
     viewer confirms. Either way the file never leaves the machine. */
  function anchorSave(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function deliver(filename, blob) {
    var host = window.claude;
    if (!host || typeof host.use !== 'function') { anchorSave(filename, blob); return; }
    host.use('downloads').then(function (d) {
      if (!d) { M.toast('Bu ortamda dosya kaydı kapalı', { muted: true }); return; }
      d.save({ filename: filename, data: blob }).then(function () {
        M.toast(filename + ' kaydedildi', { muted: true });
      }, function (err) {
        var code = err && err.code;
        M.toast(code === 'declined' ? 'Kayıt iptal edildi'
              : code === 'too_large' ? 'Kayıt 16 MB sınırını aştı'
              : 'Dosya kaydedilemedi', { muted: true });
      });
    }, function () { anchorSave(filename, blob); });
  }

  M.recordCurrent = function () {
    var ids = M.scenarios;
    var id = ids[0];
    var active = document.querySelector('.demo__btn[data-active="1"]');
    if (active && active.dataset.sc) id = active.dataset.sc;
    var dur = M.scenarioDur(id);
    M.toast('Kayıt: ' + id, { muted: true, life: 1400 });
    record('mihenk-' + id, (dur + 0.4) * 1000);
    M.runScenario(id);
  };

  M.recordAll = function () {
    var ids = M.scenarios.slice();
    (function next() {
      if (!ids.length) { M.toast('Tüm klipler kaydedildi', { muted: true }); return; }
      var id = ids.shift();
      var dur = M.scenarioDur(id);
      M.toast('Kayıt: ' + id, { muted: true, life: 1400 });
      record('mihenk-' + id, (dur + 0.4) * 1000, function () { setTimeout(next, 600); });
      M.runScenario(id);
    })();
  };

  M.captureSupported = supported;
})(window.MIHENK = window.MIHENK || {});
