import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, hexToRgb, paletteColors } from '../src/ui/palettes.js';

// CIE76 color difference in Lab. Below about 15 two colors start to look
// alike side by side; we demand more because the player may be color-blind
// and the board shows all twelve at once.
const MIN_DELTA = 16;

function rgbToLab([r, g, b]) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a, b) {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a));
  const [l2, a2, b2] = rgbToLab(hexToRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

for (const [id, palette] of Object.entries(PALETTES)) {
  for (const variant of ['light', 'dark']) {
    test(`${palette.name} ${variant}: twelve colors, every pair distinguishable`, () => {
      const colors = paletteColors(id, variant === 'dark');
      assert.equal(colors.length, 12);
      const weak = [];
      for (let i = 0; i < 12; i++) {
        for (let j = i + 1; j < 12; j++) {
          const d = deltaE(colors[i], colors[j]);
          if (d < MIN_DELTA) weak.push(`${i} ${colors[i]} vs ${j} ${colors[j]}: ${d.toFixed(1)}`);
        }
      }
      assert.deepEqual(weak, [], `pairs too close in ${id} ${variant}`);
    });
  }
}
