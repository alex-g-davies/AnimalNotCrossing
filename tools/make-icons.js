// Generates the app icons as PNG files with no dependencies: a warm rounded
// square with the cat silhouette from the game. Run: node tools/make-icons.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xf6, 0xf1, 0xe7];
const FG = [0xc8, 0x62, 0x3a];

function crc32(buf) {
  let crc = -1;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Shapes in a 64x64 design space (same as the in-game cat icon).
function inTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function inEllipse(px, py, cx, cy, rx, ry) {
  return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
}
function catAt(x, y) {
  // head + ears
  const head = inEllipse(x, y, 32, 36, 19, 19);
  const earL = inTriangle(x, y, [14, 34], [11, 8], [28, 20]);
  const earR = inTriangle(x, y, [50, 34], [53, 8], [36, 20]);
  if (!(head || earL || earR)) return 0;
  // eyes and nose cut out
  if (inEllipse(x, y, 24, 36, 3.2, 4) || inEllipse(x, y, 40, 36, 3.2, 4)) return 2;
  if (inTriangle(x, y, [29.5, 44], [34.5, 44], [32, 47])) return 2;
  return 1;
}
function inRoundedSquare(x, y, size, radius) {
  const dx = Math.max(radius - x, 0, x - (size - radius));
  const dy = Math.max(radius - y, 0, y - (size - radius));
  return dx * dx + dy * dy <= radius * radius;
}

function render(size, { maskable }) {
  const samples = 3;
  // Cat occupies the middle: 64 design units map to `scale` pixels.
  const catSize = maskable ? size * 0.52 : size * 0.68;
  const offset = (size - catSize) / 2;
  const radius = maskable ? 0 : size * 0.22;
  return png(size, (x, y) => {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = x + (sx + 0.5) / samples;
        const py = y + (sy + 0.5) / samples;
        let color = null;
        if (maskable || inRoundedSquare(px, py, size, radius)) {
          const ux = ((px - offset) / catSize) * 64;
          const uy = ((py - offset) / catSize) * 64;
          const hit = catAt(ux, uy);
          color = hit === 1 ? FG : BG;
        }
        if (color) { r += color[0]; g += color[1]; b += color[2]; a += 255; }
      }
    }
    const k = samples * samples;
    return a === 0 ? [0, 0, 0, 0] : [Math.round(r * 255 / a), Math.round(g * 255 / a), Math.round(b * 255 / a), Math.round(a / k)];
  });
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-180.png', render(180, { maskable: false }));
writeFileSync('icons/icon-192.png', render(192, { maskable: false }));
writeFileSync('icons/icon-512.png', render(512, { maskable: false }));
writeFileSync('icons/icon-512-maskable.png', render(512, { maskable: true }));
console.log('icons written');
