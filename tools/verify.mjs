import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = path.join(os.tmpdir(), 'mihenk-verify');
fs.mkdirSync(TMP, { recursive: true });
const server = await serve(0);
const PORT = server.port;
const b = await chromium.launch();
const out = [];
function ok(t, cond, extra='') { out.push([cond ? 'PASS':'FAIL', t, extra].join(' · ')); if(!cond) process.exitCode = 1; }

/* ---- 1. multi-file app -------------------------------------------------- */
const ctx = await b.newContext({viewport:{width:1400,height:900}});
const page = await ctx.newPage();
const errs=[], reqs=[];
page.on('pageerror', e=>errs.push(e.message));
page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
page.on('request', r=>reqs.push(r.url()));
await page.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle'});
await page.waitForTimeout(300);
const initial = reqs.length;

// keyboard reachability: tab through and count focusables reached
const focusables = await page.evaluate(() => document.querySelectorAll(
  'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])').length);
ok('klavye: odaklanabilir öğe sayısı', focusables > 30, focusables + ' öğe');

// every interactive element must expose a visible focus ring
const noRing = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('a[href], button:not([disabled]), input, textarea').forEach(n => {
    if (n.offsetParent === null) return;
    n.focus();
    const cs = getComputedStyle(n);
    const w = parseFloat(cs.outlineWidth) || 0;
    if (w < 1.5 || cs.outlineStyle === 'none') bad.push(n.className || n.tagName);
  });
  document.activeElement.blur();
  return bad.slice(0, 5);
});
ok('klavye: her öğede görünür odak halkası', noRing.length === 0, noRing.join(', '));

await page.click('.side [data-ctl="crisis"]');
await page.waitForTimeout(1500);
ok('kriz sekmesi eklendi', await page.locator('.tab[data-tab="crisis"]').count() === 1);
ok('normal akışlar korunuyor', await page.locator('#panel-foryou .post').count() >= 30 &&
                               await page.locator('#panel-following .post').count() >= 12);
// scroll position retention (drive the app API so the assertion is not
// confused by the browser scrolling a hidden sticky header into view)
await page.evaluate(()=>window.scrollTo(0,900));
await page.waitForTimeout(150);
await page.evaluate(()=>window.MIHENK.setTab('crisis'));
await page.waitForTimeout(1100);
const yc = await page.evaluate(()=>window.scrollY);
await page.evaluate(()=>window.MIHENK.setTab('foryou'));
await page.waitForTimeout(1100);
const y = await page.evaluate(()=>window.scrollY);
ok('kaydırma konumu korunuyor', Math.abs(y-900) < 8 && yc === 0, 'foryou y=' + y + ', kriz y=' + yc);

// header hides on scroll down and returns on scroll up
await page.evaluate(()=>window.scrollTo(0,1400)); await page.waitForTimeout(260);
const hidden = await page.evaluate(()=>document.getElementById('topbar').dataset.hidden === '1');
await page.evaluate(()=>window.scrollTo(0,1100)); await page.waitForTimeout(260);
const shown = await page.evaluate(()=>document.getElementById('topbar').dataset.hidden !== '1');
ok('başlık aşağı kaydırınca gizleniyor, yukarı kaydırınca dönüyor', hidden && shown);
await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(200);

// keyboard walk: reach the crisis tab, move between tabs with arrows,
// operate the SOS button and a Doğrula button using the keyboard only
await page.evaluate(()=>window.MIHENK.setTab('foryou'));
await page.waitForTimeout(900);
let onTablist = false;
for (let i = 0; i < 400 && !onTablist; i++) {
  await page.keyboard.press('Tab');
  onTablist = await page.evaluate(()=>document.activeElement?.getAttribute('role') === 'tab');
}
ok('klavye: sekme çubuğuna Tab ile ulaşılıyor', onTablist,
   await page.evaluate(()=>document.activeElement?.dataset?.tab || '-'));
// ARIA tablist pattern: Tab enters the list, arrows move inside it
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1000);
const t1 = await page.evaluate(()=>window.MIHENK.state.tab);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1000);
const t2 = await page.evaluate(()=>window.MIHENK.state.tab);
ok('klavye: sekmeler ok tuşlarıyla geziliyor (kriz sekmesi dahil)',
   t1 === 'following' && t2 === 'crisis', t1 + ' → ' + t2);
await page.evaluate(()=>window.MIHENK.setTab('crisis'));
await page.waitForTimeout(1000);
await page.focus('#sos'); await page.keyboard.press('Enter');
await page.waitForTimeout(500);
ok('klavye: İmdat akışı Enter ile açılıyor', await page.locator('#modal').isVisible());
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
ok('klavye: modal Escape ile kapanıyor', await page.locator('#modal').isHidden());
const vbtn = page.locator('[data-verify]').nth(2);
await vbtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
ok('klavye: Doğrula Enter ile çalışıyor', await vbtn.getAttribute('data-done') === '1');

// url routing
await page.click('.tab[data-tab="crisis"]');
await page.waitForTimeout(1000);
ok('kriz sekmesinin kendi URL’si var', /kriz/.test(page.url()), page.url());

// byte chip is measured
const chip = await page.locator('#bytetext').innerText();
ok('bayt karşılaştırması ölçülmüş', /~\d+ KB.*~\d+ KB/.test(chip), chip);

// four verification states present and distinct
const states = await page.evaluate(()=>[...new Set([...document.querySelectorAll('.cpost')].map(n=>n.dataset.v))].sort());
ok('dört doğrulama durumu', states.join(',') === 'disputed,official,unverified,verified', states.join(','));

// interception only fires for crisis-relevant text
await page.click('.tab[data-tab="foryou"]'); await page.waitForTimeout(1000);
await page.fill('#ta', 'Bugün hava çok güzel, sahilde yürüdüm.');
await page.click('#postbtn'); await page.waitForTimeout(400);
ok('alakasız metin engellenmiyor', await page.locator('#modal').isHidden());
await page.fill('#ta', 'Enkaz altında ses var, yardım lazım.');
await page.click('#postbtn'); await page.waitForTimeout(400);
ok('krizle ilgili metinde araya giriliyor', await page.locator('#modal').isVisible());
await page.click('#stay-normal'); await page.waitForTimeout(500);
ok('modal paylaşımı engellemiyor', await page.locator('#panel-foryou .post').first().innerText().then(t=>t.includes('Enkaz altında')));

const postLoad = reqs.length - initial;
ok('ilk yüklemeden sonra sıfır ağ isteği', postLoad === 0, postLoad + ' istek');
ok('konsol hatası yok', errs.length === 0, errs.join(' | '));
await ctx.close();

/* ---- 2. no-JS plain document ------------------------------------------- */
const ctx2 = await b.newContext({javaScriptEnabled:false, viewport:{width:900,height:900}});
const p2 = await ctx2.newPage();
await p2.goto(`http://localhost:${PORT}/`, {waitUntil:'load'});
const njText = await p2.locator('.nojs').innerText();
ok('JS kapalıyken belge çalışıyor', njText.includes('KRİZ VAR') && njText.length > 2000, njText.length + ' karakter');
const njPosts = await p2.locator('.nojs article').count();
ok('JS kapalıyken tüm kriz gönderileri var', njPosts >= 24, njPosts + ' gönderi');
await p2.screenshot({path:path.join(TMP, 'nojs.png'), fullPage:false});
await ctx2.close();

/* ---- 3. single-file bundle --------------------------------------------- */
const ctx3 = await b.newContext({viewport:{width:1400,height:900}});
const p3 = await ctx3.newPage();
const e3=[], r3=[];
p3.on('pageerror', e=>e3.push(e.message));
p3.on('request', r=>r3.push(r.url()));
await p3.goto('file://' + path.join(ROOT,'dist/mihenk.html'), {waitUntil:'load'});
await p3.waitForTimeout(600);
await p3.click('.side [data-ctl="crisis"]');
await p3.waitForTimeout(1500);
await p3.click('.tab[data-tab="crisis"]');
await p3.waitForTimeout(1200);
ok('tek dosya paketi çalışıyor', await p3.locator('.cpost').count() === 24, await p3.locator('.cpost').count() + ' gönderi');
ok('tek dosya: hata yok', e3.length === 0, e3.join(' | '));
ok('tek dosya: tek istek', r3.length === 1, r3.length + ' istek');
await p3.screenshot({path:path.join(TMP, 'bundle-crisis.png')});
await ctx3.close();

await b.close(); server.close();
console.log(out.join('\n'));
