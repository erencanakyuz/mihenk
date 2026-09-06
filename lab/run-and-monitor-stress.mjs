import { chromium } from 'playwright';
import fs from 'node:fs';

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  console.log('>>> [1/4] Chrome CDP bağlantısı kuruluyor...');
  const content = fs.readFileSync('C:\\Users\\dasda\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort', 'utf8').trim().split(/\r?\n/);
  const wsEndpoint = 'ws://127.0.0.1:' + content[0] + content[1];
  const browser = await chromium.connectOverCDP(wsEndpoint);

  let colabPage = null;
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes('1ckUq1MY4ny1wF6jdBTFkHtnFC4t1Fn2a')) {
        colabPage = p;
        break;
      }
    }
  }

  if (!colabPage) throw new Error('Colab sayfası bulunamadı!');
  console.log('>>> Colab sayfası bağlandı:', await colabPage.title());

  console.log('>>> [2/4] Hücre parametreleri kontrol edilip güncelleniyor (timeout: 60s)...');
  await colabPage.evaluate(() => {
    const models = window.monaco.editor.getModels();
    for (const m of models) {
      const val = m.getValue();
      if (val.includes('requestTimeoutSeconds')) {
        m.setValue(val.replace(/'requestTimeoutSeconds':\s*\d+/, "'requestTimeoutSeconds': 60").replace(/"requestTimeoutSeconds":\s*\d+/, '"requestTimeoutSeconds": 60'));
      }
    }
  });

  console.log('>>> [3/4] 20 Ajanlık Stres Testi Hücresi (cell-En-8M2lSabXm) Çalıştırılıyor...');
  const launchBtn = colabPage.locator('#cell-En-8M2lSabXm colab-run-button');
  await launchBtn.scrollIntoViewIfNeeded();
  await launchBtn.click();
  console.log('>>> ÇALIŞTIR BUTONUNA TIKLANDI!');

  // Wait 4 seconds for execution output to appear
  await sleep(4000);

  const launchOutput = await colabPage.evaluate(() => {
    const cell = document.querySelector('#cell-En-8M2lSabXm');
    const output = cell?.querySelector('.output_text, .stream, colab-output-cell');
    return output ? output.innerText : 'Henüz çıktı yok';
  });

  console.log('>>> Başlatma Hücresi Çıktısı:\n' + launchOutput);

  // Now monitor with the status cell (cell-rfyMykGYa5ET)
  console.log('>>> [4/4] Canlı Durum Takibi Başlatıldı (cell-rfyMykGYa5ET)...');
  const statusBtn = colabPage.locator('#cell-rfyMykGYa5ET colab-run-button');

  for (let i = 1; i <= 40; i++) {
    await sleep(15000);
    console.log(`\n--- Durum Kontrolü #${i} (+${i * 15} sn) ---`);
    await statusBtn.scrollIntoViewIfNeeded();
    await statusBtn.click();
    await sleep(3000);

    const statusOutput = await colabPage.evaluate(() => {
      const cell = document.querySelector('#cell-rfyMykGYa5ET');
      const output = cell?.querySelector('.output_text, .stream, colab-output-cell');
      return output ? output.innerText : 'Çıktı bekleniyor...';
    });

    console.log(statusOutput);

    if (statusOutput.includes('Stress exit code: 0')) {
      console.log('>>> 20 Ajanlık Test Başarıyla Tamamlandı!');
      break;
    } else if (statusOutput.includes('Stress exit code:') && !statusOutput.includes('Stress exit code: None')) {
      console.log('>>> Test tamamlandı (kod: ' + statusOutput.match(/Stress exit code:\s*(\d+)/)?.[1] + ')');
      break;
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('HATA:', err);
  process.exit(1);
});
