// Generates the app icons (home screen, PWA, maskable) from the cat portrait
// in img/animals on a warm rounded background, using headless Chrome's
// canvas. No dependencies. Run: node tools/make-icons.js

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'img/animals/cat.png';
const OUT = 'icons';
// [file, size, maskable]: maskable icons keep the art inside the central 80% safe zone.
const ICONS = [['icon-180.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-512-maskable.png', 512, true]];

const b64 = readFileSync(SOURCE).toString('base64');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'anc-icons-'));
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

const PAGE = String.raw`
async function make(b64, icons) {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const out = [];
  for (const [file, size, maskable] of icons) {
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    // Warm cream background; a full square for maskable icons (the OS rounds it),
    // a rounded square otherwise.
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#fff3e4'); g.addColorStop(1, '#f6d9c4');
    ctx.fillStyle = g;
    if (maskable) ctx.fillRect(0, 0, size, size);
    else { const r = size * 0.22; ctx.beginPath(); ctx.roundRect(0, 0, size, size, r); ctx.fill(); }
    const art = size * (maskable ? 0.66 : 0.8);
    const x = (size - art) / 2, y = (size - art) / 2 + size * 0.02;
    ctx.shadowColor = 'rgba(80, 40, 20, 0.25)'; ctx.shadowBlur = size * 0.04; ctx.shadowOffsetY = size * 0.02;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, art, art);
    out.push({ file, dataUrl: c.toDataURL('image/png') });
  }
  return out;
}
`;

await send('Page.enable');
await send('Page.navigate', { url: 'about:blank' });
await new Promise((r) => setTimeout(r, 300));
const res = await send('Runtime.evaluate', { expression: `${PAGE}; make(${JSON.stringify(b64)}, ${JSON.stringify(ICONS)})`, awaitPromise: true, returnByValue: true });
if (!res.result || !res.result.result || res.result.result.value === undefined) {
  console.error('page script failed', JSON.stringify(res).slice(0, 800));
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
for (const icon of res.result.result.value) {
  writeFileSync(join(OUT, icon.file), Buffer.from(icon.dataUrl.split(',')[1], 'base64'));
  console.log(`wrote ${join(OUT, icon.file)}`);
}
ws.close();
proc.kill();
setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
