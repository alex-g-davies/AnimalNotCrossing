// Runs inside headless Chrome (see cut-decor.js). Cuts one rectangle out of a
// sheet, keys out the page colour reachable from the rectangle's border, and
// returns a PNG scaled by `scale`.
async function cutRect(b64, x0, y0, w, h, scale, edges, pageHex) {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  // Page colour: median along the chosen edges of the rectangle.
  const samples = [];
  if (edges.includes('top')) for (let x = 0; x < w; x += 2) samples.push(px(x, 0), px(x, 1));
  if (edges.includes('bottom')) for (let x = 0; x < w; x += 2) samples.push(px(x, h - 1), px(x, h - 2));
  if (edges.includes('left')) for (let y = 0; y < h; y += 2) samples.push(px(0, y), px(1, y));
  if (edges.includes('right')) for (let y = 0; y < h; y += 2) samples.push(px(w - 1, y), px(w - 2, y));
  const given = pageHex && [1, 3, 5].map((i) => parseInt(pageHex.slice(i, i + 2), 16));
  const page = given || [0, 1, 2].map((k) => median(samples.map((p) => p[k])));
  const dist = (p) => Math.hypot(p[0] - page[0], p[1] - page[1], p[2] - page[2]);
  const ds = samples.map(dist).sort((a, b) => a - b);
  const tol = given ? 40 : Math.min(40, Math.max(14, ds[Math.floor(ds.length * 0.9)] * 1.6));
  const HI = tol + 40;
  const depth = new Int16Array(w * h).fill(-1);
  let queue = [];
  for (let x = 0; x < w; x++) queue.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y++) queue.push(0, y, w - 1, y);
  while (queue.length) {
    const next = [];
    for (let i = 0; i < queue.length; i += 2) {
      const x = queue[i], y = queue[i + 1];
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = y * w + x;
      if (depth[k] !== -1 || dist(px(x, y)) > tol) continue;
      depth[k] = 0;
      next.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    queue = next;
  }
  // Two-pixel soft edge next to the keyed page.
  let frontier = [];
  for (let k = 0; k < w * h; k++) if (depth[k] === 0) frontier.push(k);
  for (let step = 1; step <= 2 && frontier.length; step++) {
    const next = [];
    for (const k of frontier) {
      const x = k % w, y = (k / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (depth[nk] !== -1 || dist(px(nx, ny)) >= HI) continue;
        depth[nk] = step;
        next.push(nk);
      }
    }
    frontier = next;
  }
  let removed = 0;
  for (let k = 0; k < w * h; k++) {
    const i = k * 4;
    if (depth[k] === 0) { d[i + 3] = 0; removed++; continue; }
    if (depth[k] > 0) {
      const a = Math.min(1, Math.max(0, (dist([d[i], d[i + 1], d[i + 2]]) - 8) / (HI - 8)));
      for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(a < 1 ? (d[i + c] - (1 - a) * page[c]) / Math.max(a, 0.02) : d[i + c])));
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(im, 0, 0);
  const o = document.createElement('canvas'); o.width = Math.round(w * scale); o.height = Math.round(h * scale);
  const octx = o.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(cv, 0, 0, o.width, o.height);
  return { dataUrl: o.toDataURL('image/png'), page, tol, removed, total: w * h };
}
