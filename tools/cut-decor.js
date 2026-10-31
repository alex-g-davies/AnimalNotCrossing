// Cuts one rectangle out of a sheet with the page colour keyed out, for
// decorations such as the Valley farm scene. Headless Chrome, no dependencies.
//
//   node tools/cut-decor.js sheet.png x y w h scale out.png [edges] [#page]
//
// The page colour is the median along the rectangle's edges (all four, or
// the comma list given, e.g. "top" when the bottom edge sits on a border),
// or the hex colour given when no edge is clean; everything of that colour
// reachable from the edges becomes transparent.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [sheet, x, y, w, h, scale, out, edges = 'top,bottom,left,right', pageHex = ''] = process.argv.slice(2);
if (!out) {
  console.error('usage: node tools/cut-decor.js sheet.png x y w h scale out.png [edges]');
  process.exit(1);
}
const b64 = readFileSync(sheet).toString('base64');
const pageScript = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'cut-decor.page.js'), 'utf8');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'anc-decor-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

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
  const msgId = ++id;
  pending.set(msgId, resolve);
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
await send('Page.enable');
await send('Page.navigate', { url: 'about:blank' });
await new Promise((r) => setTimeout(r, 300));
const expression = `${pageScript}; cutRect(${JSON.stringify(b64)}, ${Number(x)}, ${Number(y)}, ${Number(w)}, ${Number(h)}, ${Number(scale)}, ${JSON.stringify(edges.split(','))}, ${JSON.stringify(pageHex)})`;
const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
const value = res.result && res.result.result && res.result.result.value;
if (!value || !value.dataUrl) {
  const ex = res.result && res.result.exceptionDetails;
  console.error('page script failed:', ex ? (ex.exception && ex.exception.description) || ex.text : JSON.stringify(res).slice(0, 800));
  process.exit(1);
}
writeFileSync(out, Buffer.from(value.dataUrl.split(',')[1], 'base64'));
console.log(`page rgb(${value.page.join(',')}) tol ${value.tol.toFixed(0)}  removed ${value.removed}/${value.total} px  -> ${out}`);
ws.close();
proc.kill();
setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
