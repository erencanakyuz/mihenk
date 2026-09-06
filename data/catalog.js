/* Public display vocabulary and avatar rendering. */
(function(root){
'use strict';
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function initials(name) {
    var parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : '?';
    var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toLocaleUpperCase('tr-TR');
  }

  /* Avatar template: one deterministic duotone-disc SVG reused for every
     account, hash-tinted per name so accounts stay visually distinct.
     Local only - no image files, no network request. */
  function avatar(name, opts) {
    opts = opts || {};
    var h = hash(name);
    var hue = h % 360;
    var hue2 = (hue + 38 + (h >> 9) % 40) % 360;
    var sat = 58 + (h >> 3) % 18;
    var l1 = 42 + (h >> 5) % 10;
    var l2 = 24 + (h >> 7) % 10;
    var id = 'g' + h.toString(36);
    var txt = opts.glyph || initials(name);
    var fs = txt.length > 2 ? 15 : 17;
    return '<svg viewBox="0 0 40 40" role="img" aria-label="' + esc(name) + '" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ' ' + sat + '% ' + l1 + '%)"/>' +
      '<stop offset="1" stop-color="hsl(' + hue2 + ' ' + sat + '% ' + l2 + '%)"/>' +
      '</linearGradient></defs>' +
      '<rect width="40" height="40" fill="url(#' + id + ')"/>' +
      '<ellipse cx="13" cy="11" rx="17" ry="10" fill="#fff" opacity=".13" transform="rotate(-20 13 11)"/>' +
      '<text x="20" y="20" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="system-ui, sans-serif" font-size="' + fs + '" font-weight="700" ' +
        'fill="rgba(255,255,255,.94)" letter-spacing=".5">' + esc(txt) + '</text>' +
      '</svg>';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var TAGS = [
    { id: 'yardim', label: 'Yardım Çağrısı' },
    { id: 'enkaz',  label: 'Enkaz Bildirimi' },
    { id: 'kayip',  label: 'Kayıp İlanı' },
    { id: 'nokta',  label: 'Yardım Noktası' },
    { id: 'resmi',  label: 'Resmî Duyuru' },
    { id: 'durum',  label: 'Durum Bilgisi' }
  ];

  var VER = {
    verified:   { label: 'Doğrulanmış',   icon: 'check-circle' },
    official:   { label: 'Resmî Kurum',   icon: 'shield' },
    unverified: { label: 'Doğrulanmamış', icon: 'question-circle' },
    disputed:   { label: 'Çelişkili',     icon: 'exclamation' }
  };


root.CATALOG={hash:hash,avatar:avatar,esc:esc,TAGS:TAGS,VER:VER,regions:['Afşin','Andırın','Çağlayancerit','Dulkadiroğlu','Ekinözü','Elbistan','Göksun','Kahramanmaraş','Nurhak','Onikişubat','Pazarcık','Türkoğlu']};
root.shared=typeof document!=='undefined'&&document.documentElement.dataset.shared==='1';
if(root.shared)root.SEED={users:[],orgs:[],me:{id:'me',name:'',handle:'',avatar:''},byId:{},forYou:[],following:[],crisis:[],TAGS:TAGS,VER:VER,hash:hash,avatar:avatar,esc:esc,media:function(){return '';}};
})(window.MIHENK=window.MIHENK||{});
