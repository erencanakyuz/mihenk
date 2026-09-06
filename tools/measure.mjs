/* Ölçüm: tam sürüm vs düz HTML modu — ham ve gzip'li transfer boyutu.
   Çalıştır:  node tools/measure.mjs                                        */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f));
const gz = b => zlib.gzipSync(b, { level: 9 }).length;
const kb = n => (n / 1024).toFixed(1);

// --- Tam sürümün istemciye indirdiği her şey ---------------------------
const FULL = [
  'index.html',
  'styles/tokens.css', 'styles/base.css', 'styles/feed.css',
  'styles/crisis.css', 'styles/plain.css',
  'data/seed.js',
  'scripts/app.js', 'scripts/feed.js', 'scripts/crisis.js',
  'scripts/imdat.js', 'scripts/demo.js',
  'assets/img/template-a.jpg', 'assets/img/template-b.jpg',
];

let rawFull = 0, gzFull = 0;
console.log('--- Tam surum (istek basina) ---');
for (const f of FULL) {
  const b = rd(f);
  const g = /\.(jpg|png|webp)$/.test(f) ? b.length : gz(b);  // görsel zaten sıkışık
  rawFull += b.length; gzFull += g;
  console.log(`  ${f.padEnd(30)} ham ${kb(b.length).padStart(7)} KB   transfer ${kb(g).padStart(7)} KB`);
}

// --- Düz HTML modu: noscript blogu + plain.css ------------------------
const idx = rd('index.html').toString('utf8');
const m = idx.match(/<!-- STATIC:BEGIN -->([\s\S]*?)<!-- STATIC:END -->/);
if (!m) { console.error('noscript blogu bulunamadi'); process.exit(1); }
const plainHtml = Buffer.from(m[1], 'utf8');
const plainCss = rd('styles/plain.css');
const rawPlain = plainHtml.length + plainCss.length;
const gzPlain = gz(plainHtml) + gz(plainCss);

console.log('\n--- Duz HTML modu ---');
console.log(`  noscript blogu                 ham ${kb(plainHtml.length).padStart(7)} KB   transfer ${kb(gz(plainHtml)).padStart(7)} KB`);
console.log(`  styles/plain.css               ham ${kb(plainCss.length).padStart(7)} KB   transfer ${kb(gz(plainCss)).padStart(7)} KB`);

console.log('\n=== SONUC ===');
console.log(`  Tam surum   : ${kb(rawFull)} KB ham / ${kb(gzFull)} KB transfer / ${FULL.length} istek`);
console.log(`  Duz mod     : ${kb(rawPlain)} KB ham / ${kb(gzPlain)} KB transfer / 2 istek`);
console.log(`  Oran (transfer): ${(gzFull / gzPlain).toFixed(1)}x kucuk`);
console.log(`  Oran (ham)     : ${(rawFull / rawPlain).toFixed(1)}x kucuk`);
console.log(`  Istek azalmasi : ${FULL.length} -> 2`);

// --- 2G / EDGE üzerinde indirme süresi --------------------------------
// ITU/GSMA pratik EDGE verimi ~ 40 kbit/s = 5 KB/s; 3G ~ 384 kbit/s = 48 KB/s
for (const [ad, kbps] of [['EDGE/2G  40 kbit/s', 5], ['3G      384 kbit/s', 48]]) {
  console.log(`  ${ad}: tam ${(gzFull / 1024 / kbps).toFixed(1)} sn  ·  duz ${(gzPlain / 1024 / kbps).toFixed(1)} sn`);
}
