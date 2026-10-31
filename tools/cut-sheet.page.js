// Runs inside headless Chrome (see cut-sheet.js). Finds the tiles by their
// gaps, keys out each tile's flat background by flood fill, and gives the
// anti-aliased edge partial alpha. Returns [{ name, dataUrl, debugUrl, bg, noise, box }].
async function cut(b64, cols, rows, size, names) {
  const STRICT = 14; // flood tolerance for flat backgrounds; textured ones widen it (see tol below)
  const MAX_TOL = 40;
  const SHADOW = 60; // looser tolerance for tinted drop shadows (a little darker than the tile, never outline-dark)
  const LOOSE = 50; // smudges, tinted shadows and tile frames: this far from a background colour...
  const MAX_BLOB = 2500; // ...but only in blobs up to this many pixels, so a pink pig on a pink tile survives,
  const THIN = 6; // ...or in blobs that are thin: every pixel this close to background already found
  const BAND = 3; // anti-aliased edge pixels next to the background get partial alpha
  const LO = 8, HI = 70; // colour distance mapped to alpha 0..1 inside the band
  const MARGIN = 10; // page pixels kept around each tile
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const dist = (x, y, c) => { const i = (y * W + x) * 4; return Math.hypot(data[i] - c[0], data[i + 1] - c[1], data[i + 2] - c[2]); };
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  // Distance from a colour to the nearest point on a segment between two colours.
  const segDist = (p, a, b) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const t = vv ? Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / vv)) : 0;
    const q = [a[0] + t * v[0], a[1] + t * v[1], a[2] + t * v[2]];
    return { d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), q };
  };
  // Page colour: median along three lines just inside the sheet's edge (a
  // sheet may carry a decorative border; corner ornaments are a minority of
  // the samples). Its texture sets the page flood tolerance.
  const lineSamples = [];
  const yTop = Math.round(H * 0.03), xL = Math.round(W * 0.03), xR = W - 1 - xL;
  for (let x = Math.round(W * 0.05); x < W * 0.95; x += 2) lineSamples.push(px(x, yTop));
  for (let y = Math.round(H * 0.05); y < H * 0.95; y += 2) lineSamples.push(px(xL, y), px(xR, y));
  const page = [0, 1, 2].map((k) => median(lineSamples.map((p) => p[k])));
  const pageDists = lineSamples.map((p) => Math.hypot(p[0] - page[0], p[1] - page[1], p[2] - page[2])).sort((a, b) => a - b);
  const pageNoise = pageDists[Math.floor(pageDists.length * 0.9)];
  const pageTol = Math.min(MAX_TOL, Math.max(STRICT, pageNoise * 1.6));
  // Tiles: runs of rows/columns that are mostly not page-coloured.
  const bands = (length, count, probe) => {
    const out = [];
    let start = -1;
    for (let i = 0; i <= length; i++) {
      const on = i < length && probe(i) > count * 0.3;
      if (on && start < 0) start = i;
      if (!on && start >= 0) { if (i - start > 20) out.push([start, i]); start = -1; }
    }
    return out;
  };
  const rowBands = bands(H, W, (y) => { let n = 0; for (let x = 0; x < W; x += 2) if (dist(x, y, page) > 25) n += 2; return n; });
  const colBands = bands(W, H, (x) => { let n = 0; for (let y = 0; y < H; y += 2) if (dist(x, y, page) > 25) n += 2; return n; });
  if (rowBands.length !== rows || colBands.length !== cols) throw new Error(`found ${colBands.length}x${rowBands.length} tiles, expected ${cols}x${rows}`);
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const name = names[r * cols + c];
    if (!name) continue;
    const x0 = Math.max(0, colBands[c][0] - MARGIN), x1 = Math.min(W, colBands[c][1] + MARGIN);
    const y0 = Math.max(0, rowBands[r][0] - MARGIN), y1 = Math.min(H, rowBands[r][1] + MARGIN);
    const cw = x1 - x0, ch = y1 - y0;
    // Tile colour: the flattest 12px patch among several inset points that is not page-coloured.
    let bg = null, noise = Infinity;
    const seeds = [];
    const points = [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85], [0.5, 0.08], [0.5, 0.92], [0.08, 0.5], [0.92, 0.5],
      [0.3, 0.08], [0.7, 0.08], [0.3, 0.92], [0.7, 0.92], [0.08, 0.3], [0.08, 0.7], [0.92, 0.3], [0.92, 0.7]];
    for (const [fx, fy] of points) {
      const ox = x0 + Math.round(cw * fx) - 6, oy = y0 + Math.round(ch * fy) - 6;
      const patch = [[], [], []];
      for (let dy = 0; dy < 12; dy++) for (let dx = 0; dx < 12; dx++) px(ox + dx, oy + dy).forEach((v, k) => patch[k].push(v));
      const col = patch.map(median);
      let n = 0;
      for (let dy = 0; dy < 12; dy++) for (let dx = 0; dx < 12; dx++) n = Math.max(n, dist(ox + dx, oy + dy, col));
      if (Math.hypot(col[0] - page[0], col[1] - page[1], col[2] - page[2]) < 30) continue;
      if (n < noise) { noise = n; bg = col; }
      seeds.push([ox - x0 + 6, oy - y0 + 6, n, col]);
    }
    const luma = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
    // Tiles may carry a gentle gradient, so the tile colour is the segment
    // between the lightest and darkest flat patches that match it (bgA..bgB),
    // extended towards black for plain shadows. The animal itself is never
    // reached by the floods below unless it touches the background, so a face
    // close to the tile colour is safe behind its outline.
    // A checkered or grainy tile has a higher "noise" on its flattest patch; the
    // tolerance follows it. Outlines keep the floods out of the animal regardless.
    const tol = Math.min(MAX_TOL, Math.max(STRICT, noise * 1.8));
    const tilePatches = seeds.filter(([, , n, col]) => n <= tol && Math.hypot(col[0] - bg[0], col[1] - bg[1], col[2] - bg[2]) <= 60).map(([, , , col]) => col).sort((p, q) => luma(p) - luma(q));
    const bgA = tilePatches[tilePatches.length - 1] || bg; // lightest
    const bgB = tilePatches[0] || bg; // darkest
    const dark = bgB.map((v) => v * 0.45);
    const bgLuma = luma(bgB);
    const tileDist = (p) => Math.min(segDist(p, bgA, bgB).d, segDist(p, bgB, dark).d);
    // Distance to the nearest background colour, for the edge band.
    const near = (x, y) => { const p = px(x, y); return [segDist(p, bgA, bgB), segDist(p, bgB, dark), segDist(p, bg, page)].reduce((m, c) => (c.d < m.d ? c : m)); };
    const d = (x, y) => near(x, y).d;
    const depth = new Int16Array(cw * ch).fill(-1);
    const flood = (seedList, accept) => {
      let queue = seedList;
      while (queue.length) {
        const next = [];
        for (let i = 0; i < queue.length; i += 2) {
          const x = queue[i], y = queue[i + 1];
          if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
          const k = y * cw + x;
          if (depth[k] !== -1 || !accept(x0 + x, y0 + y)) continue;
          depth[k] = 0;
          next.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        }
        queue = next;
      }
    };
    // 1. The page, from the cell border: only page-coloured pixels, so a white
    //    animal inside the tile is never reached.
    const edge = [];
    for (let x = 0; x < cw; x++) edge.push(x, 0, x, ch - 1);
    for (let y = 0; y < ch; y++) edge.push(0, y, cw - 1, y);
    flood(edge, (x, y) => dist(x, y, page) <= pageTol);
    // 2. The tile, from the sample points: tile colour and its plain shadows.
    const inner = [];
    for (const [sx, sy, n, col] of seeds) if (n <= tol && tileDist(col) <= tol) inner.push(sx, sy);
    const innerSeeds = inner.length / 2;
    // Also from wherever the page touches the tile, so a pocket of tile colour
    // enclosed by the animal and the tile's edge is still found.
    for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) { const x = k % cw, y = (k / cw) | 0; inner.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
    const pagePx = depth.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
    flood(inner, (x, y) => tileDist(px(x, y)) <= tol);
    const tilePx = depth.reduce((n, v) => n + (v === 0 ? 1 : 0), 0) - pagePx;
    // 3. Tinted drop shadows: darker than the tile and loosely on its shadow
    //    line, growing out of the background already found. Dropped entirely;
    //    the app adds its own shadow in CSS.
    const grow = [];
    for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) { const x = k % cw, y = (k / cw) | 0; grow.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
    flood(grow, (x, y) => { const p = px(x, y); const l = luma(p); return l < bgLuma - 3 && l > bgLuma - 45 && tileDist(p) <= SHADOW; });

    // 4. Smudges, leftover shadow and a tile's own thin frame: a looser flood
    //    from the background, kept only where it forms small or thin blobs.
    //    Large solid regions (an animal whose body is close to the tile
    //    colour) are put back.
    const loose = new Uint8Array(cw * ch);
    {
      const nearBg = new Uint8Array(cw * ch);
      let ring = [];
      for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) { nearBg[k] = 1; ring.push(k); }
      for (let step = 0; step < THIN; step++) {
        const next = [];
        for (const k of ring) {
          const x = k % cw, y = (k / cw) | 0;
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const nk = ny * cw + nx;
            if (!nearBg[nk]) { nearBg[nk] = 1; next.push(nk); }
          }
        }
        ring = next;
      }
      let queue = [];
      for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) { const x = k % cw, y = (k / cw) | 0; queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
      while (queue.length) {
        const next = [];
        for (let i = 0; i < queue.length; i += 2) {
          const x = queue[i], y = queue[i + 1];
          if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
          const k = y * cw + x;
          if (depth[k] !== -1 || loose[k] || d(x0 + x, y0 + y) > LOOSE) continue;
          loose[k] = 1;
          next.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        }
        queue = next;
      }
      const label = new Int32Array(cw * ch).fill(-1);
      for (let k = 0; k < cw * ch; k++) {
        if (!loose[k] || label[k] !== -1) continue;
        const blob = [k];
        label[k] = k;
        for (let i = 0; i < blob.length; i++) {
          const x = blob[i] % cw, y = (blob[i] / cw) | 0;
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const nk = ny * cw + nx;
            if (loose[nk] && label[nk] === -1) { label[nk] = k; blob.push(nk); }
          }
        }
        if (blob.length <= MAX_BLOB || blob.every((b) => nearBg[b])) for (const b of blob) depth[b] = 0;
      }
    }
    // 5. Whatever is left that is thin and detached (a tile's own frame line,
    //    a stray fleck) goes too, whatever its colour: a connected piece whose
    //    every pixel lies within THIN of the background. The animal always has
    //    an interior farther away than that, so it is never touched.
    {
      const nearBg = new Uint8Array(cw * ch);
      let ring = [];
      for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) { nearBg[k] = 1; ring.push(k); }
      for (let step = 0; step < THIN; step++) {
        const next = [];
        for (const k of ring) {
          const x = k % cw, y = (k / cw) | 0;
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const nk = ny * cw + nx;
            if (!nearBg[nk]) { nearBg[nk] = 1; next.push(nk); }
          }
        }
        ring = next;
      }
      const seen = new Uint8Array(cw * ch);
      for (let k = 0; k < cw * ch; k++) {
        if (depth[k] !== -1 || seen[k]) continue;
        const piece = [k];
        seen[k] = 1;
        let thin = true;
        for (let i = 0; i < piece.length; i++) {
          const x = piece[i] % cw, y = (piece[i] / cw) | 0;
          if (!nearBg[piece[i]]) thin = false;
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const nk = ny * cw + nx;
            if (depth[nk] === -1 && !seen[nk]) { seen[nk] = 1; piece.push(nk); }
          }
        }
        if (thin) for (const p of piece) depth[p] = 0;
      }
    }
    let frontier = [];
    for (let k = 0; k < cw * ch; k++) if (depth[k] === 0) frontier.push(k);
    for (let step = 1; step <= BAND && frontier.length; step++) {
      const next = [];
      for (const k of frontier) {
        const x = k % cw, y = (k / cw) | 0;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const nk = ny * cw + nx;
          if (depth[nk] !== -1 || d(x0 + nx, y0 + ny) >= HI) continue;
          depth[nk] = step;
          next.push(nk);
        }
      }
      frontier = next;
    }
    const cell = ctx.createImageData(cw, ch);
    let minX = cw, minY = ch, maxX = -1, maxY = -1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const k = y * cw + x, si = ((y0 + y) * W + (x0 + x)) * 4, di = k * 4;
      let a = 1;
      if (depth[k] === 0) a = 0;
      else if (depth[k] > 0) a = Math.min(1, Math.max(0, (d(x0 + x, y0 + y) - LO) / (HI - LO)));
      if (a <= 0.02) continue;
      const key = near(x0 + x, y0 + y).q;
      for (let i = 0; i < 3; i++) {
        const v = a < 1 ? (data[si + i] - (1 - a) * key[i]) / a : data[si + i];
        cell.data[di + i] = Math.max(0, Math.min(255, Math.round(v)));
      }
      cell.data[di + 3] = Math.round(a * 255);
      if (a > 0.08) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
    tmp.getContext('2d').putImageData(cell, 0, 0);
    const bw = maxX - minX + 1, bh = maxY - minY + 1, box = Math.max(bw, bh) * 1.06;
    const sx = minX + bw / 2 - box / 2, sy = minY + bh / 2 - box / 2;
    const o = document.createElement('canvas'); o.width = size; o.height = size;
    const octx = o.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(tmp, sx, sy, box, box, 0, 0, size, size);
    const dbg = ctx.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const k = y * cw + x, v = d(x0 + x, y0 + y); const g = depth[k] === 0 ? 255 : v >= HI ? 0 : 60 + Math.round(v / HI * 150); dbg.data[k * 4] = g; dbg.data[k * 4 + 1] = depth[k] > 0 ? 0 : g; dbg.data[k * 4 + 2] = g; dbg.data[k * 4 + 3] = 255; }
    const dc = document.createElement('canvas'); dc.width = cw; dc.height = ch; dc.getContext('2d').putImageData(dbg, 0, 0);
    out.push({ name, dataUrl: o.toDataURL('image/png'), debugUrl: dc.toDataURL('image/png'), bg, bgA, bgB, noise, tol, pageTol, box: [x0 + minX, y0 + minY, bw, bh], innerSeeds, tilePx, seeds: seeds.map(([, , n, col]) => [Math.round(n), col]) });
  }
  return out;
}
