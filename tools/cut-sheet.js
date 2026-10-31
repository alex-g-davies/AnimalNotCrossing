// Cuts a grid of animal portraits out of one sheet into transparent PNGs,
// using headless Chrome's canvas (no dependencies). The page-side pixel work
// lives in cut-sheet.page.js.
//
//   node tools/cut-sheet.js art/sheet.png cols rows size outdir name1,name2,...
//
// Prints one line per tile: the sampled background colour, how flat it was,
// and the crop box. Look at the output before trusting it.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [sheet, cols, rows, size, outdir, nameList] = process.argv.slice(2);
if (!nameList) {
  console.error('usage: node tools/cut-sheet.js sheet.png cols rows size outdir name1,name2,...');
  process.exit(1);
}
const names = nameList.split(',');
const b64 = readFileSync(sheet).toString('base64');
const pageScript = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'cut-sheet.page.js'), 'utf8');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'anc-cut-'));
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
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Page.enable');
await send('Page.navigate', { url: 'about:blank' });
await new Promise((r) => setTimeout(r, 300));
const expression = `${pageScript}; cut(${JSON.stringify(b64)}, ${Number(cols)}, ${Number(rows)}, ${Number(size)}, ${JSON.stringify(names)})`;
const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
if (!res.result || !res.result.result || !Array.isArray(res.result.result.value)) {
  const ex = res.result && res.result.exceptionDetails;
  console.error('page script failed:', ex ? (ex.exception && ex.exception.description) || ex.text : JSON.stringify(res).slice(0, 800));
  process.exit(1);
}
mkdirSync(outdir, { recursive: true });
for (const tile of res.result.result.value) {
  const file = join(outdir, `${tile.name}.png`);
  writeFileSync(file, Buffer.from(tile.dataUrl.split(',')[1], 'base64'));
  if (process.env.CUT_DEBUG) writeFileSync(join(process.env.CUT_DEBUG, `${tile.name}-mask.png`), Buffer.from(tile.debugUrl.split(',')[1], 'base64'));
  console.log(`${tile.name.padEnd(9)} bg rgb(${tile.bgA.join(',')})..rgb(${tile.bgB.join(',')}) noise ${tile.noise.toFixed(0).padStart(2)} tol ${tile.tol.toFixed(0)}/${tile.pageTol.toFixed(0)}  seeds ${tile.innerSeeds}/${tile.seeds.length}  tile ${tile.tilePx}px  box ${tile.box.join('x')}  -> ${file}`);
  if (tile.tilePx < 1000 || process.env.CUT_DEBUG) console.log(`  ${tile.tilePx < 1000 ? "WARNING: almost no tile background removed. " : ""}Sample patches (noise:colour): ${tile.seeds.map(([n, c]) => `${n}:${c.join(',')}`).join(' ')}`);
}
ws.close();
proc.kill();
setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
