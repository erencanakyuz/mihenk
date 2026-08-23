/* ==========================================================================
   Inlines the multi-file source into a single self-contained document.
   Produces:
     dist/mihenk.html    full standalone page (open it with a double click)
     dist/artifact.html  body-level content only, for hosts that supply the
                         <!doctype>/<head>/<body> skeleton themselves
   No minification: the shipped file is the same code you can read in src.
   Run: node tools/bundle.mjs
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const CSS = ['styles/tokens.css', 'styles/base.css', 'styles/feed.css',
             'styles/crisis.css', 'styles/plain.css'];
const JS = ['data/seed.js', 'scripts/app.js', 'scripts/feed.js', 'scripts/crisis.js',
            'scripts/imdat.js', 'scripts/demo.js', 'scripts/capture.js'];

const css = CSS.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n');
const js  = JS.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n');

const html = read('index.html');
const noscript = /<noscript>[\s\S]*?<\/noscript>/.exec(html)[0];
const skip = '<a class="skip-link" href="#main">İçeriğe atla</a>';

const body = `${skip}\n\n${noscript}\n\n<style>\n${css}\n</style>\n\n<script>\n${js}\n</script>\n`;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });

fs.writeFileSync(path.join(ROOT, 'dist/artifact.html'),
  `<title>MİHENK</title>\n${body}`);

fs.writeFileSync(path.join(ROOT, 'dist/mihenk.html'),
`<!doctype html>
<html lang="tr" data-palette="" data-plain="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="description" content="MİHENK — kriz modu akış prototipi. Tamamen yerel, kurgusal veriyle çalışan bir UI/UX prototipi.">
<title>MİHENK</title>
</head>
<body>
${body}</body>
</html>
`);

const kb = p => (fs.statSync(path.join(ROOT, p)).size / 1024).toFixed(1) + ' KB';
console.log('dist/mihenk.html  ', kb('dist/mihenk.html'));
console.log('dist/artifact.html', kb('dist/artifact.html'));
