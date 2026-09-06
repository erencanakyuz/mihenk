/* Calisma zamani olcumu:
   A) dist/mihenk.html file:// uzerinden -> hic ag istegi yapiyor mu?
   B) JavaScript kapaliyken duz HTML modu geliyor mu, ne kadar icerik gosteriyor?
   Calistir:  node tools/measure-runtime.mjs                                 */
import { chromium } from 'playwright';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const fileUrl = f => url.pathToFileURL(path.join(root, f)).href;

const browser = await chromium.launch();

// --- A) tek dosyalik derleme, file://, ag istegi sayimi -----------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const external = [];
  page.on('request', r => { if (!r.url().startsWith('file://')) external.push(r.url()); });
  const t0 = Date.now();
  await page.goto(fileUrl('dist/mihenk.html'), { waitUntil: 'load' });
  const t1 = Date.now();
  const nodes = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log('A) dist/mihenk.html  file:// uzerinden');
  console.log('   harici ag istegi : ' + external.length + (external.length ? ' -> ' + external.join(', ') : '  (SIFIR)'));
  console.log('   yuklenme         : ' + (t1 - t0) + ' ms');
  console.log('   DOM dugumu       : ' + nodes);
  await ctx.close();
}

// --- B) JavaScript kapali -> duz HTML modu ------------------------------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
  const t1 = Date.now();
  const r = await page.evaluate(() => {
    const ns = document.querySelector('noscript');
    // noscript icerigi JS kapaliyken dogrudan render edilir
    const txt = document.body.innerText || '';
    return {
      makale : document.querySelectorAll('article').length,
      basliklar: [...document.querySelectorAll('h1,h2')].map(h => h.textContent.trim()).slice(0, 4),
      karakter : txt.replace(/\s+/g, ' ').trim().length,
      krizVar  : /KRİZ VAR/.test(txt),
      dogrulama: [...document.querySelectorAll('.v')].length,
    };
  });
  console.log('\nB) index.html  JavaScript KAPALI (duz HTML modu)');
  console.log('   render suresi     : ' + (t1 - t0) + ' ms');
  console.log('   gosterilen gonderi: ' + r.makale + ' adet <article>');
  console.log('   dogrulama rozeti  : ' + r.dogrulama + ' adet');
  console.log('   KRIZ VAR basligi  : ' + (r.krizVar ? 'VAR' : 'YOK'));
  console.log('   okunabilir metin  : ' + r.karakter + ' karakter');
  console.log('   basliklar         : ' + r.basliklar.join(' | '));
  await ctx.close();
}

await browser.close();
