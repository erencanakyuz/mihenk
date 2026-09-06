import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

async function run() {
  console.log('Connecting to Colab MCP bridge...');
  const client = new Client({ name: 'antigravity-colab-bridge', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: 'C:/Users/dasda/AppData/Roaming/uv/tools/colab-mcp/Scripts/python.exe',
    args: ['.rehearsal/colab-mcp-launch.py'],
    stderr: 'pipe',
    env: { ...process.env, PYTHONUTF8: '1', RUST_LOG: 'error' }
  });

  transport.stderr?.on('data', data => process.stderr.write(data));
  await client.connect(transport);
  console.log('MCP connected. Initial tools:', (await client.listTools()).tools.map(t => t.name));

  console.log('Opening browser connection to Colab...');
  const connectRes = await client.callTool({ name: 'open_colab_browser_connection', arguments: {} }, undefined, { timeout: 90000 });
  console.log('Browser connection result:', JSON.stringify(connectRes));

  const tools = (await client.listTools()).tools.map(t => t.name);
  console.log('Unlocked tools:', tools);

  if (!tools.includes('add_code_cell')) {
    throw new Error('Colab UI is not connected yet. Please click Connect in the Colab browser tab!');
  }

  const action = process.argv[2] || 'launch';
  if (action === 'launch') {
    console.log('Sending 20-participant stress test request to Colab...');
    const req = JSON.parse(await readFile(path.join(root, '.rehearsal/colab-stress-20-request.json'), 'utf8'));
    const result = await client.callTool({ name: req.name, arguments: req.arguments }, undefined, { timeout: 120000 });
    await writeFile(path.join(root, '.rehearsal/colab-stress-20-output.json'), JSON.stringify(result, null, 2));
    console.log('Launch output:', JSON.stringify(result, null, 2));
  } else if (action === 'status') {
    console.log('Checking 20-participant stress test status on Colab...');
    const req = JSON.parse(await readFile(path.join(root, '.rehearsal/colab-stress-20-status-request.json'), 'utf8'));
    const result = await client.callTool({ name: req.name, arguments: req.arguments }, undefined, { timeout: 120000 });
    await writeFile(path.join(root, '.rehearsal/colab-stress-20-status.json'), JSON.stringify(result, null, 2));
    console.log('Status output:', JSON.stringify(result, null, 2));
  }

  await client.close();
}

run().catch(err => {
  console.error('Colab runner error:', err);
  process.exit(1);
});
