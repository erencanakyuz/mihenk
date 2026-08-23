/* ==========================================================================
   MİHENK — headless clip generation
   Loads ?demo=1&scenario=<id>&capture=1, advances a *virtual* clock one
   rAF frame at a time via CDP (Emulation.setVirtualTimePolicy) and grabs a
   PNG per output frame. Same script + same scenario ⇒ identical frames.
   Then ffmpeg writes an animated GIF and a WebM/MP4 per scenario.

   Usage:  node tools/capture.mjs [--only=id,id] [--size=1080x1350] [--fps=30]
   ========================================================================== */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'clips');
const TMP = path.join(ROOT, '.frames');
let PORT = 0;   // 0 = let the OS pick a free port

const argv = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));

const FPS = Number(argv.fps || 30);
const STEP_MS = 1000 / 60;              // one rAF frame of virtual time
const STEPS_PER_FRAME = Math.round(60 / FPS);

const SIZES = (argv.size ? [argv.size] : ['1080x1350', '1280x720'])
  .map(s => { const [w, h] = s.split('x').map(Number); return { w, h, tag: `${w}x${h}` }; });

fs.mkdirSync(OUT, { recursive: true });

const server = await serve(PORT);
PORT = server.port;
const LAUNCH = {
  args: ['--force-color-profile=srgb', '--font-render-hinting=none',
         '--disable-lcd-text', '--hide-scrollbars', '--mute-audio',
         '--run-all-compositor-stages-before-draw',
         '--disable-new-content-rendering-timeout',
         '--disable-threaded-animation', '--disable-threaded-scrolling',
         '--disable-checker-imaging']
};
const launch = () => chromium.launch(LAUNCH);
let browser = await launch();

const page0 = await browser.newPage();
await page0.goto(`http://localhost:${PORT}/?demo=1`, { waitUntil: 'load' });
await page0.waitForFunction('window.__MIHENK_READY === true');
let ALL = await page0.evaluate(() => window.__mihenk.scenarios);
await page0.close();
if (argv.only) { const want = argv.only.split(','); ALL = ALL.filter(id => want.includes(id)); }

const manifest = [];

async function capture(id, size) {
    const label = `${id}@${size.tag}`;
    const dir = path.join(TMP, `${id}-${size.tag}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const ctx = await browser.newContext({
      viewport: { width: size.w, height: size.h },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark'
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`http://localhost:${PORT}/?demo=1&capture=1&scenario=${id}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__MIHENK_READY === true');
    await page.waitForTimeout(200);           // let fonts/layout settle


    const client = await ctx.newCDPSession(page);
    let virtualTime = true;
    try {
      await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    } catch (e) { virtualTime = false; }

    /* Advance document time by exactly one rAF frame. CSS transitions,
       animations and setTimeout all move with it. */
    const advance = async (ms) => {
      const expired = new Promise(res => client.once('Emulation.virtualTimeBudgetExpired', res));
      await client.send('Emulation.setVirtualTimePolicy', {
        policy: 'pauseIfNetworkFetchesPending', budget: ms,
        maxVirtualTimeTaskStarvationCount: 100000
      });
      await expired;
    };

    await page.evaluate(i => window.__mihenk.run(i), id);
    /* the scripted timeline, not the nominal duration, is the source of truth */
    const total = await page.evaluate(() => window.__mihenk.total());
    const frames = Math.ceil(total / STEPS_PER_FRAME);

    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        if (virtualTime) await advance(STEP_MS);
        else await page.waitForTimeout(STEP_MS);
        await page.evaluate(() => window.__mihenk.step());
      }
      const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'));
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const endFrame = await page.evaluate(() => window.__mihenk.frame());

    /* loop seam: the last frame must land on the opening frame */
    const first = path.join(dir, 'f00000.png');
    const last = path.join(dir, `f${String(frames - 1).padStart(5, '0')}.png`);
    let seam = 'n/a';
    try {
      const crop = `crop=iw:ih-96:0:0`;   // exclude the caption strip, which is meant to fade in
      const { stderr } = await run('ffmpeg', ['-v', 'info', '-i', first, '-i', last,
        '-lavfi', `[0:v]${crop}[a];[1:v]${crop}[b];[a][b]psnr`, '-f', 'null', '-']);
      const m = /average:([0-9.]+|inf)/.exec(stderr);
      if (m) seam = m[1] === 'inf' ? 'identical' : (Number(m[1]).toFixed(1) + ' dB');
    } catch (e) { /* ffmpeg missing */ }

    console.log(`· ${label.padEnd(26)} ${frames} frames  vt=${virtualTime}  clock=${endFrame}/${total}  ` +
      `seam ${String(seam).padStart(9)}  ${secs}s` +
      (errors.length ? `  ERRORS: ${errors.join(' | ')}` : ''));

    await ctx.close();
    return { id, size, dir, frames };
}

for (const size of SIZES) {
  for (const id of ALL) {
    let res = null;
    for (let attempt = 1; attempt <= 2 && !res; attempt++) {
      try { res = await capture(id, size); }
      catch (e) {
        console.log(`! ${id}@${size.tag} attempt ${attempt} failed: ${e.message.split('\n')[0]}`);
        try { await browser.close(); } catch (_) {}
        browser = await launch();
      }
    }
    if (res) manifest.push(res);
    else console.log(`! ${id}@${size.tag} SKIPPED`);
  }
  /* recycle the browser between sizes to keep memory flat */
  try { await browser.close(); } catch (_) {}
  browser = await launch();
}

await browser.close();
server.close();

/* ---------------------------------------------------------------- encode */
console.log('\nencoding…');
for (const m of manifest) {
  const base = path.join(OUT, `mihenk-${m.id}-${m.size.tag}`);
  const input = ['-y', '-framerate', String(FPS), '-i', path.join(m.dir, 'f%05d.png')];

  // WebM (VP9) — loops cleanly, small, alpha-free
  await run('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30',
    '-pix_fmt', 'yuv420p', '-row-mt', '1', '-an', `${base}.webm`], { maxBuffer: 1 << 28 });

  // MP4 (H.264) — for slides and social
  await run('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', `${base}.mp4`], { maxBuffer: 1 << 28 });

  // GIF — half scale, 15 fps, per-clip palette
  const gw = Math.round(m.size.w / 2 / 2) * 2;
  const pal = path.join(m.dir, 'palette.png');
  await run('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(m.dir, 'f%05d.png'),
    '-vf', `fps=15,scale=${gw}:-2:flags=lanczos,palettegen=stats_mode=diff`, pal], { maxBuffer: 1 << 28 });
  await run('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(m.dir, 'f%05d.png'), '-i', pal,
    '-lavfi', `fps=15,scale=${gw}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
    '-loop', '0', `${base}.gif`], { maxBuffer: 1 << 28 });

  const sz = f => (fs.statSync(f).size / 1048576).toFixed(1) + ' MB';
  console.log(`· ${path.basename(base).padEnd(34)} webm ${sz(base + '.webm').padStart(8)}` +
    `  mp4 ${sz(base + '.mp4').padStart(8)}  gif ${sz(base + '.gif').padStart(8)}`);
}

if (!argv.keep) fs.rmSync(TMP, { recursive: true, force: true });
console.log('\nclips → ./clips');
