import { chromium } from 'playwright';
import path from 'node:path';
import url from 'node:url';
const root = path.resolve(import.meta.dirname, '..');
const U = url.pathToFileURL(path.join(root, 'dist/mihenk.html')).href;
const b = await chromium.launch();

async function bak(reduced) {
  const ctx = await b.newContext({ viewport:{width:390,height:844}, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(U, { waitUntil:'load' }); await p.waitForTimeout(500);
  // kriz moduna gec
  const gecti = await p.evaluate(() => {
    const el = [...document.querySelectorAll('button,a,[role="tab"],[data-tab]')]
      .find(e => /kriz/i.test(e.textContent||'') || /kriz/i.test(e.getAttribute('data-tab')||''));
    if (el) { el.click(); return el.textContent.trim().slice(0,40); }
    return null;
  });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    let sonsuz = 0; const ornek = [];
    for (const el of document.querySelectorAll('*')) {
      const st = getComputedStyle(el);
      if (st.animationName !== 'none' && st.animationIterationCount === 'infinite') {
        sonsuz++; if (ornek.length < 5) ornek.push(el.className.toString().slice(0,40) + ' :: ' + st.animationName);
      }
    }
    const sos = [...document.querySelectorAll('button,a')]
      .find(e => /yardım çağrısı|imdat|sos/i.test(e.textContent||''));
    const sr = sos ? sos.getBoundingClientRect() : null;
    return { sonsuz, ornek,
      sos: sr ? {x:Math.round(sr.x),y:Math.round(sr.y),w:Math.round(sr.width),h:Math.round(sr.height),
                 pos:getComputedStyle(sos).position, metin:sos.textContent.trim().slice(0,30)} : null,
      rozet: document.querySelectorAll('[class*="ver"],[data-v],.v').length,
      gonderi: document.querySelectorAll('article').length };
  });
  await ctx.close();
  return { gecti, ...r };
}

const normal = await bak(false);
const azalt  = await bak(true);
console.log('KRIZ MODU · hareket tercihi = varsayilan');
console.log('  kriz sekmesine gecis  :', normal.gecti ?? 'bulunamadi');
console.log('  sonsuz animasyon      :', normal.sonsuz);
normal.ornek.forEach(o => console.log('     -', o));
console.log('  yardim cagrisi butonu :', normal.sos ? `${normal.sos.metin} | ${normal.sos.w}x${normal.sos.h} @ ${normal.sos.x},${normal.sos.y} (${normal.sos.pos})` : 'bulunamadi');
console.log('  gonderi / rozet       :', normal.gonderi, '/', normal.rozet);
console.log('\nKRIZ MODU · prefers-reduced-motion: reduce');
console.log('  sonsuz animasyon      :', azalt.sonsuz);
console.log('\n=> WCAG 2.2.2 / rapor iddiasi:', azalt.sonsuz === 0 ? 'reduce ile TAMAMEN duruyor' : `reduce ile hala ${azalt.sonsuz} animasyon VAR`);
await b.close();
