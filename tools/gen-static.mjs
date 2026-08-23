/* Generates the <noscript> fallback document inside index.html from data/seed.js.
   Run:  node tools/gen-static.mjs
   The output is committed into index.html so the page needs no build step. */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const seedSrc = fs.readFileSync(path.join(root, 'data/seed.js'), 'utf8');
const window = {};
new Function('window', seedSrc)(window);
const S = window.MIHENK.SEED;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TAG = Object.fromEntries(S.TAGS.map(t => [t.id, t.label]));

const crisis = S.crisis.map(p => {
  const u = S.byId[p.uid];
  return `      <article>
        <span class="v ${p.v}">${esc(S.VER[p.v].label)}</span>
        <div class="who"><b>${esc(u.name)}</b> @${esc(u.handle)} · ${esc(p.t)}</div>
        <p>${esc(p.text)}</p>
        <div class="meta">${esc(p.loc)} · ${esc(TAG[p.tag])}</div>
      </article>`;
}).join('\n');

const normal = S.forYou.slice(0, 10).map(p => {
  const u = S.byId[p.uid];
  return `      <article>
        <div class="who"><b>${esc(u.name)}</b> @${esc(u.handle)} · ${esc(p.t)}</div>
        <p>${esc(p.text)}</p>
      </article>`;
}).join('\n');

// measure the real payloads so the printed comparison is not a claim
const files = ['index.html','styles/tokens.css','styles/base.css','styles/feed.css',
  'styles/crisis.css','styles/plain.css','data/seed.js','scripts/app.js','scripts/feed.js',
  'scripts/crisis.js','scripts/imdat.js','scripts/demo.js','scripts/capture.js'];
const fullKB = Math.round(files.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0)/1024);

let plainKB = 12;
let block = `
    <h1>MİHENK</h1>
    <p class="nojs__note">Düz metin sürümü. JavaScript kapalı olduğu için yalnızca doğrulama durumu,
    metin, zaman ve konum gösteriliyor. Bu sürüm kasıtlı olarak sadedir ve tam olarak çalışır.<br>
    Tam sürüm: ~${fullKB} KB · Düz mod: ~${plainKB} KB</p>

    <h2>⚠ KRİZ VAR · Kahramanmaraş · 7.4 büyüklüğünde deprem</h2>
    <p class="nojs__note">Doğrulanmış bilgi ve yardım çağrıları. Doğrulanmamış içerik gizlenmez, işaretlenir.</p>
${crisis}

    <h2>Sana Özel</h2>
${normal}

    <p class="meta" style="margin-top:24px">Tüm hesaplar kurgusal şablon hesaplardır. Prototip.</p>
`;

plainKB = Math.round(Buffer.byteLength(block, 'utf8') / 1024);
block = block.replace(/~\d+ KB<\/b>|Düz mod: ~\d+ KB/g, m => m.replace(/~\d+ KB/, '~' + plainKB + ' KB'));

const idxPath = path.join(root, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
idx = idx.replace(/<!-- STATIC:BEGIN -->[\s\S]*?<!-- STATIC:END -->/,
  `<!-- STATIC:BEGIN -->${block}<!-- STATIC:END -->`);
fs.writeFileSync(idxPath, idx);
console.log('noscript block written:', block.length, 'chars');
