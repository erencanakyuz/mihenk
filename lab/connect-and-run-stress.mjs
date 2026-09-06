import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  console.log('=== Step 1: Connecting to Chrome via CDP ===');
  const portContent = fs.readFileSync('C:\\Users\\dasda\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort', 'utf8').trim().split(/\r?\n/);
  const wsEndpoint = 'ws://127.0.0.1:' + portContent[0].trim() + portContent[1].trim();
  console.log('Chrome CDP WebSocket:', wsEndpoint);

  const browser = await chromium.connectOverCDP(wsEndpoint);
  console.log('Successfully connected to Chrome over CDP.');

  console.log('=== Step 2: Connecting to Colab MCP Server ===');
  const client = new Client({ name: 'mihenk-stress-runner', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: 'C:/Users/dasda/AppData/Roaming/uv/tools/colab-mcp/Scripts/python.exe',
    args: ['.rehearsal/colab-mcp-launch.py'],
    stderr: 'pipe',
    env: { ...process.env, PYTHONUTF8: '1', RUST_LOG: 'error' }
  });

  transport.stderr?.on('data', d => process.stderr.write('[MCP stderr] ' + d.toString()));
  await client.connect(transport);

  let unlockedTools = (await client.listTools()).tools.map(t => t.name);
  console.log('Initial MCP tools:', unlockedTools);

  let toolsUnlockedResolve;
  const toolsUnlockedPromise = new Promise(resolve => { toolsUnlockedResolve = resolve; });

  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    unlockedTools = (await client.listTools()).tools.map(t => t.name);
    console.log('[Notification] Tools changed:', unlockedTools);
    if (unlockedTools.includes('add_code_cell')) {
      toolsUnlockedResolve(unlockedTools);
    }
  });

  console.log('=== Step 3: Starting Colab Dialog Auto-Clicker ===');
  let clickingActive = true;
  let clickedOnce = false;

  async function tryClickConnectOnPage(page) {
    try {
      const url = page.url();
      if (!url.includes('1ckUq1MY4ny1wF6jdBTFkHtnFC4t1Fn2a') && !url.includes('mcpProxyToken') && !url.includes('empty.ipynb')) {
        return false;
      }

      // Look for Connect button or dialog in page
      const clicked = await page.evaluate(() => {
        // Find buttons with 'Connect' or 'Bağlan'
        const buttons = Array.from(document.querySelectorAll('button, md-filled-button, paper-button, cr-button, [role="button"]'));
        for (const b of buttons) {
          const text = (b.innerText || b.textContent || '').trim().toLowerCase();
          // Avoid matching "connect to runtime" header button if looking for MCP modal connect button
          // MCP modal usually has text "Connect" or "Bağlan" inside a dialog or modal
          const parentDialog = b.closest('dialog, [role="dialog"], mwc-dialog, colab-dialog, .modal, md-dialog');
          if (text === 'connect' || text === 'bağlan') {
            b.click();
            return { text: b.textContent.trim(), inDialog: !!parentDialog };
          }
        }
        return null;
      });

      if (clicked) {
        console.log(`[Auto-Clicker] Clicked button "${clicked.text}" (inDialog: ${clicked.inDialog}) on page: ${url}`);
        return true;
      }
    } catch (e) {
      // ignore frame/page errors
    }
    return false;
  }

  const clickerInterval = setInterval(async () => {
    if (!clickingActive) return;
    try {
      for (const ctx of browser.contexts()) {
        for (const p of ctx.pages()) {
          const didClick = await tryClickConnectOnPage(p);
          if (didClick) clickedOnce = true;
        }
      }
    } catch (e) {
      // ignore
    }
  }, 1000);

  console.log('=== Step 4: Calling open_colab_browser_connection ===');
  const openCallPromise = client.callTool(
    { name: 'open_colab_browser_connection', arguments: {} },
    undefined,
    { timeout: 80000 }
  ).then(res => {
    console.log('open_colab_browser_connection result:', JSON.stringify(res));
    return res;
  }).catch(err => {
    console.error('open_colab_browser_connection caught error:', err.message);
    return null;
  });

  // Wait for either tools to unlock or openCallPromise to complete
  await Promise.race([
    toolsUnlockedPromise,
    openCallPromise,
    sleep(75000)
  ]);

  // Give 3 more seconds for notifications to settle
  await sleep(3000);
  clickingActive = false;
  clearInterval(clickerInterval);

  unlockedTools = (await client.listTools()).tools.map(t => t.name);
  console.log('Current tools available:', unlockedTools);

  if (!unlockedTools.includes('add_code_cell')) {
    throw new Error('add_code_cell is still not unlocked. Check Chrome browser tab.');
  }

  console.log('=== Step 5: Launching 20-Participant Stress Test ===');
  const launchReq = JSON.parse(fs.readFileSync(path.join(root, '.rehearsal/colab-stress-20-request.json'), 'utf8'));
  console.log('Executing stress test launch cell...');
  const launchResult = await client.callTool(
    { name: launchReq.name, arguments: launchReq.arguments },
    undefined,
    { timeout: 120000 }
  );

  console.log('Launch result:\n', JSON.stringify(launchResult, null, 2));
  fs.writeFileSync(path.join(root, '.rehearsal/colab-stress-20-output.json'), JSON.stringify(launchResult, null, 2));

  console.log('=== Step 6: Monitoring Stress Test Execution ===');
  const statusReq = JSON.parse(fs.readFileSync(path.join(root, '.rehearsal/colab-stress-20-status-request.json'), 'utf8'));

  let isDone = false;
  let iterations = 0;
  const maxIterations = 40; // ~10 minutes

  while (!isDone && iterations < maxIterations) {
    iterations++;
    await sleep(15000);
    console.log(`\n--- Polling status check #${iterations} (+${iterations * 15}s) ---`);
    try {
      const statusResult = await client.callTool(
        { name: statusReq.name, arguments: statusReq.arguments },
        undefined,
        { timeout: 120000 }
      );
      fs.writeFileSync(path.join(root, '.rehearsal/colab-stress-20-status.json'), JSON.stringify(statusResult, null, 2));

      // Extract stdout
      const stdout = statusResult?.structuredContent?.outputs?.[0]?.text?.join('') || 
                     statusResult?.content?.[0]?.text || '';
      console.log('Status stdout:\n', stdout);

      if (stdout.includes('Stress exit code: 0') || (stdout.includes('Stress exit code:') && !stdout.includes('Stress exit code: None'))) {
        console.log('Stress test process completed!');
        isDone = true;
      }
    } catch (e) {
      console.error('Status poll error:', e.message);
    }
  }

  console.log('=== Finished Stress Test Monitoring ===');
  await client.close();
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
