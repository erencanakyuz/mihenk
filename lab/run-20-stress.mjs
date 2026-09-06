import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  console.log('>>> [1/4] Colab MCP Bağlantısı Hazırlanıyor...');
  const client = new Client({ name: 'mihenk-stress-client', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: 'C:/Users/dasda/AppData/Roaming/uv/tools/colab-mcp/Scripts/python.exe',
    args: ['.rehearsal/colab-mcp-launch.py'],
    stderr: 'pipe',
    env: { ...process.env, PYTHONUTF8: '1', RUST_LOG: 'error' }
  });

  transport.stderr?.on('data', d => process.stderr.write(d));
  await client.connect(transport);

  let unlockedTools = (await client.listTools()).tools.map(t => t.name);
  console.log('>>> Başlangıç araçları:', unlockedTools);

  let onConnectedResolve;
  const onConnectedPromise = new Promise(res => { onConnectedResolve = res; });

  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    unlockedTools = (await client.listTools()).tools.map(t => t.name);
    console.log('>>> [Araçlar Güncellendi]:', unlockedTools);
    if (unlockedTools.includes('run_code_cell')) {
      onConnectedResolve();
    }
  });

  console.log('>>> [2/4] Colab oturumu yeniden bağlanıyor...');
  const browserCall = client.callTool({ name: 'open_colab_browser_connection', arguments: {} }, undefined, { timeout: 300000 });

  await Promise.race([browserCall, onConnectedPromise]);
  await sleep(1500);

  unlockedTools = (await client.listTools()).tools.map(t => t.name);
  if (!unlockedTools.includes('run_code_cell')) {
    console.log('>>> run_code_cell bekleniyor...');
    await onConnectedPromise;
  }

  console.log('>>> [3/4] BAĞLANTI AKTİF! 20 Ajanlık Stres Testi Hücresi Eklenip Çalıştırılıyor...');
  const launchReq = JSON.parse(await readFile(path.join(root, '.rehearsal/colab-stress-20-request.json'), 'utf8'));
  
  // 1. Add launch cell
  const addLaunchRes = await client.callTool(
    { name: 'add_code_cell', arguments: launchReq.arguments },
    undefined,
    { timeout: 120000 }
  );
  console.log('add_code_cell sonucu:', JSON.stringify(addLaunchRes));
  
  let launchCellId = addLaunchRes?.structuredContent?.newCellId;
  if (!launchCellId && addLaunchRes?.content?.[0]?.text) {
    try {
      launchCellId = JSON.parse(addLaunchRes.content[0].text).newCellId;
    } catch {}
  }

  console.log('Oluşturulan hücre ID:', launchCellId);

  // 2. Run launch cell
  console.log('Hücre çalıştırılıyor...');
  const runLaunchRes = await client.callTool(
    { name: 'run_code_cell', arguments: { cellId: launchCellId } },
    undefined,
    { timeout: 120000 }
  );
  await writeFile(path.join(root, '.rehearsal/colab-stress-20-launch-output.json'), JSON.stringify(runLaunchRes, null, 2));
  console.log('>>> Test Başlatma Çıktısı:\n', JSON.stringify(runLaunchRes?.structuredContent || runLaunchRes?.content || runLaunchRes, null, 2));

  // 3. Add status check cell once
  console.log('>>> [4/4] Durum Takip Hücresi Ekleniyor...');
  const statusReq = JSON.parse(await readFile(path.join(root, '.rehearsal/colab-stress-20-status-request.json'), 'utf8'));
  const addStatusRes = await client.callTool(
    { name: 'add_code_cell', arguments: statusReq.arguments },
    undefined,
    { timeout: 120000 }
  );
  
  let statusCellId = addStatusRes?.structuredContent?.newCellId;
  if (!statusCellId && addStatusRes?.content?.[0]?.text) {
    try {
      statusCellId = JSON.parse(addStatusRes.content[0].text).newCellId;
    } catch {}
  }
  console.log('Durum kontrol hücre ID:', statusCellId);

  // 4. Poll status using run_code_cell on the status cell
  let completed = false;
  let pollCount = 0;
  while (!completed && pollCount < 60) {
    pollCount++;
    await sleep(15000);
    console.log(`\n--- Durum Kontrolü #${pollCount} (+${pollCount * 15} sn) ---`);
    try {
      const statusRes = await client.callTool(
        { name: 'run_code_cell', arguments: { cellId: statusCellId } },
        undefined,
        { timeout: 120000 }
      );
      await writeFile(path.join(root, '.rehearsal/colab-stress-20-status.json'), JSON.stringify(statusRes, null, 2));
      
      const outputs = statusRes?.structuredContent?.outputs || [];
      const text = outputs.map(o => (o.text || []).join('')).join('') || 
                   statusRes?.content?.[0]?.text || '';
      console.log(text || JSON.stringify(statusRes, null, 2));

      if (text.includes('Stress exit code: 0') || (text.includes('Stress exit code:') && !text.includes('None'))) {
        console.log('>>> 20 Ajanlık Stres Testi Başarıyla Tamamlandı!');
        completed = true;
      }
    } catch (err) {
      console.error('Durum okuma hatası:', err.message);
    }
  }

  console.log('>>> Tamamlandı.');
  await client.close();
}

main().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
