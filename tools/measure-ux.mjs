/* Uzman degerlendirmesi icin OLCULEBILIR arayuz buyuklukleri.
   Uydurma katilimci yok; prototipin kendisinden okunan sayilar.
   Calistir:  node tools/measure-ux.mjs                                      */
import { chromium } from 'playwright';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 olcusu
const page = await ctx.newPage();
await page.goto(url.pathToFileURL(path.join(root, 'dist/mihenk.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(600);

// --- 1) Dokunma hedefi boyutlari (WCAG 2.2 SC 2.5.8: en az 24x24 CSS px) --
const targets = await page.evaluate(() => {
  const sel = 'button, a[href], [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || st.visibility === 'hidden' || st.display === 'none') continue;
    out.push({
      etiket: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 34),
      w: Math.round(r.width), h: Math.round(r.height),
    });
  }
  return out;
});
const kucuk = targets.filter(t => t.w < 24 || t.h < 24);
const min = targets.reduce((m, t) => Math.min(m, Math.min(t.w, t.h)), 1e9);
console.log('1) DOKUNMA HEDEFI (WCAG 2.2 SC 2.5.8, esik 24x24 CSS px)');
console.log(`   olculen etkilesimli ogen : ${targets.length}`);
console.log(`   esigin altinda kalan     : ${kucuk.length}`);
console.log(`   en kucuk hedef           : ${min} px`);
if (kucuk.length) kucuk.slice(0, 6).forEach(t => console.log(`     - ${t.etiket}  ${t.w}x${t.h}`));

// --- 2) Klavye ile erisilebilirlik: odak alabilen oge sayisi -------------
const odak = await page.evaluate(() => {
  const sel = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const all = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null);
  const gizliOdak = all.filter(e => {
    const st = getComputedStyle(e);
    return st.outlineStyle === 'none' && !st.boxShadow.includes('inset') && st.outlineWidth === '0px';
  });
  return { toplam: all.length, odakGostergesizOlabilir: gizliOdak.length };
});
console.log('\n2) KLAVYE ERISIMI');
console.log(`   odaklanabilir oge        : ${odak.toplam}`);

// --- 3) Birincil eylemin konum tutarliligi ------------------------------
const sos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button,a')].find(e => /yardım|imdat|sos|çağrı/i.test(e.textContent || ''));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), pos: st.position };
});
console.log('\n3) BIRINCIL EYLEM (yardim cagrisi)');
console.log(sos ? `   konum ${sos.x},${sos.y}  olcu ${sos.w}x${sos.h}  css-position: ${sos.pos}` : '   bulunamadi');

// --- 4) Kriz alaninda gorev basina adim sayisi --------------------------
const adim = await page.evaluate(() => {
  const say = s => document.querySelectorAll(s).length;
  return {
    girisKarti  : say('.entry-card, [data-entry], .krizGiris'),
    sekme       : say('[role="tab"], .tab'),
    gonderi     : say('article'),
    rozet       : say('.v, .badge, [data-verify]'),
  };
});
console.log('\n4) KRIZ ALANI YAPISI');
Object.entries(adim).forEach(([k, v]) => console.log(`   ${k.padEnd(12)}: ${v}`));

// --- 5) Hareket/animasyon varsayilan kapali mi --------------------------
const hareket = await page.evaluate(() => {
  let anim = 0;
  for (const el of document.querySelectorAll('*')) {
    const st = getComputedStyle(el);
    if (st.animationName !== 'none' && st.animationIterationCount === 'infinite') anim++;
  }
  return anim;
});
console.log(`\n5) SUREKLI ANIMASYON (WCAG 2.2.2): ${hareket} oge`);

await browser.close();
