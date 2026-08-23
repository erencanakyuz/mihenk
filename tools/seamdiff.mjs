/* Renders an amplified diff between the first and last frame of a clip. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import fs from 'node:fs'; import path from 'node:path';
import os from 'node:os';
const id = process.argv[2] || 'tab-switch';
const server = await serve(0); const PORT = server.port;
const b = await chromium.launch({args:['--hide-scrollbars','--run-all-compositor-stages-before-draw','--disable-new-content-rendering-timeout','--disable-threaded-animation','--disable-threaded-scrolling']});
const ctx = await b.newContext({viewport:{width:1280,height:720}, deviceScaleFactor:1});
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/?demo=1&capture=1&scenario=${id}`,{waitUntil:'load'});
await page.waitForFunction('window.__MIHENK_READY === true');
const client = await ctx.newCDPSession(page);
await client.send('Emulation.setVirtualTimePolicy',{policy:'pause'});
const adv = async ms => { const e=new Promise(r=>client.once('Emulation.virtualTimeBudgetExpired',r));
  await client.send('Emulation.setVirtualTimePolicy',{policy:'pauseIfNetworkFetchesPending',budget:ms,maxVirtualTimeTaskStarvationCount:100000}); await e; };
await page.evaluate(i=>window.__mihenk.run(i), id);
const total = await page.evaluate(()=>window.__mihenk.total());
const shot = async f => { await client.send('Page.captureScreenshot',{format:'png'});
  const s = await client.send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(f, Buffer.from(s.data,'base64')); };
const out = path.join(os.tmpdir(), 'mihenk-seam');
fs.mkdirSync(out,{recursive:true});
for (let i=0;i<Math.ceil(total/2);i++){ for(let s=0;s<2;s++){ await adv(1000/60); await page.evaluate(()=>window.__mihenk.step()); }
  if (i===0) { await shot(path.join(out, 'first.png')); console.log('frame0', JSON.stringify(await page.evaluate(()=>{
    const c=document.querySelector('.cursor'), u=document.getElementById('underline');
    const t=document.querySelector('.tab--crisis .ic');
    return {cursor:c?getComputedStyle(c).opacity:'none', uw:u.style.width, ut:u.style.transform,
      uwc:getComputedStyle(u).width, pulse:t?getComputedStyle(t).opacity:'none', pd:getComputedStyle(document.documentElement).getPropertyValue('--pulse-dur')};
  }))); } }
await shot(path.join(out, 'last.png'));
console.log('frameN', JSON.stringify(await page.evaluate(()=>{
  const c=document.querySelector('.cursor'), u=document.getElementById('underline');
  const t=document.querySelector('.tab--crisis .ic');
  return {cursor:c?getComputedStyle(c).opacity:'none', on:c?c.dataset.on:'-', uw:u.style.width, ut:u.style.transform,
    uwc:getComputedStyle(u).width, pulse:t?getComputedStyle(t).opacity:'none'};
})));
await b.close(); server.close(); console.log('done', id, total);
