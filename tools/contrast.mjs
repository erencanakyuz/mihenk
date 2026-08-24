/* WCAG 2.2 contrast audit for both palettes. Run: node tools/contrast.mjs */
const hex = h => { h = h.replace('#',''); if (h.length===3) h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); };
const lin = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const L = rgb => 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2]);
const ratio = (a,b) => { const l1=L(hex(a)), l2=L(hex(b)); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1];
  return (hi+0.05)/(lo+0.05); };

const N = { bg:'#121516', bg2:'#1a1e20', bg3:'#232829', border:'#2a3032',
  text:'#e5eaea', text2:'#8fa0a3', accent:'#2fa8a0', fill:'#228177', ink:'#ffffff',
  like:'#e8577a', repost:'#2f9e6e' };
const C = { bg:'#17110d', bg2:'#241a13', bg3:'#32241a', border:'#3c2c1f',
  text:'#f3ece3', text2:'#ab998a', accent:'#d98a3a', fill:'#c07728', ink:'#1a1006' };
const V = { verified:'#7fbf8f', official:'#7fa8cf', unverified:'#d9ab4a', disputed:'#e0604a' };

let fails = 0;
const rows = [];
function chk(label, fg, bg, need) {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) fails++;
  rows.push([label, fg, bg, r.toFixed(2)+':1', need+':1', ok?'PASS':'FAIL']);
}

// --- normal palette
chk('normal · gövde metni (15px)',            N.text,   N.bg, 4.5);
chk('normal · meta metni (13px)',             N.text2,  N.bg, 4.5);
chk('normal · meta metni / kart yüzeyi',      N.text2,  N.bg2, 4.5);
chk('normal · bağlantı & vurgu metni',        N.accent, N.bg, 4.5);
chk('normal · buton yazısı / dolgu',          N.ink,    N.fill, 4.5);
chk('normal · dolgu yüzeyi (grafik)',         N.fill,   N.bg, 3);
chk('normal · beğeni ikonu (grafik)',         N.like,   N.bg, 3);
chk('normal · yeniden gönder ikonu (grafik)', N.repost, N.bg, 3);
chk('normal · sekme alt çizgisi (grafik)',    N.accent, N.bg, 3);
chk('normal · ayırıcı çizgi (dekoratif)',     N.border, N.bg, 1.0);

// --- crisis palette
chk('kriz · gövde metni (15px)',              C.text,   C.bg, 4.5);
chk('kriz · meta metni (13px)',               C.text2,  C.bg, 4.5);
chk('kriz · meta metni / kart yüzeyi',        C.text2,  C.bg2, 4.5);
chk('kriz · vurgu metni',                     C.accent, C.bg, 4.5);
chk('kriz · SOS buton yazısı / dolgu',        C.ink,    C.fill, 4.5);
chk('kriz · sekme alt çizgisi (grafik)',      C.accent, C.bg, 3);

// --- verification pills: SOLID fill (no tint/translucency), shared dark ink
const PILL_INK = '#12130f';
for (const [k, c] of Object.entries(V)) {
  chk(`kriz · ${k} · rozet yazısı+ikon`, PILL_INK, c, 4.5);
  chk(`kriz · ${k} · sol şerit (grafik)`, c, C.bg, 3);
}

// --- plain mode (pure #000 / #fff, monospace)
chk('düz mod · metin', '#ffffff', '#000000', 4.5);
chk('düz mod · ikincil metin', '#bbbbbb', '#000000', 4.5);
chk('düz mod · çerçeve (grafik)', '#666666', '#000000', 3);

const w = rows.reduce((m,r)=>Math.max(m,r[0].length),0);
for (const r of rows) console.log(r[0].padEnd(w), r[1].padEnd(8), 'on', r[2].padEnd(8), r[3].padStart(8), 'need', r[4].padStart(6), ' ', r[5]);
console.log('\n' + (fails ? fails + ' FAIL(S)' : 'ALL PASS — WCAG 2.2 AA'));
process.exit(fails ? 1 : 0);
