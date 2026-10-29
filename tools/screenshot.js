// Phone-size screenshots of the running app via headless Chrome and the
// DevTools protocol. No dependencies (Node 22+ has a global WebSocket).
//
//   node tools/screenshot.js out.png "palette=valley&animal=cow&theme=dark" [width] [height] [actions]
//
// `actions` is optional JavaScript run in the page after the board appears
// (for example to place animals or open the menu) before the capture.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, query = '', width = '393', height = '852', actions = ''] = process.argv.slice(2);
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'anc-shot-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('chrome did not start');
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 2, mobile: true });
await send('Page.enable');
await send('Page.navigate', { url: `http://localhost:8080/?${query}` });
for (let i = 0; i < 200; i++) {
  if ((await evaluate('document.querySelectorAll(".cell").length')) > 0 && (await evaluate('document.getElementById("loading").hidden'))) break;
  await new Promise((r) => setTimeout(r, 100));
}
if (actions) await evaluate(`(async () => { ${actions} })()`);
await new Promise((r) => setTimeout(r, 400));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
ws.close();
proc.kill();
setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
console.log(`wrote ${out}`);
