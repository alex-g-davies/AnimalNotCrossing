// Region color palettes: 12 colors each (enough for 12x12), with a light and
// a dark variant. Neighbouring ids alternate warm and cool and differ in
// lightness so two adjacent regions never look alike. Thick borders are
// always drawn as well, so color is never the only cue.

export const PALETTES = {
  meadow: {
    name: 'Meadow',
    light: ['#f7c5c5', '#bfe0b2', '#f9dca8', '#b6d3f3', '#f1c2e2', '#a9ddd2', '#f8eea4', '#cdc3f0', '#f0b89e', '#bde2ea', '#e1cfa6', '#d8d2c6'],
    dark: ['#7a3b3b', '#3d6b36', '#7d5a2a', '#2f4f7d', '#7a3a66', '#2f6a62', '#6f6a2a', '#4f4280', '#7a4a3a', '#2f6270', '#6a5a3a', '#55504a'],
  },
};

export const DEFAULT_PALETTE = 'meadow';

export function applyPalette(id, isDark) {
  const palette = PALETTES[id] || PALETTES[DEFAULT_PALETTE];
  const colors = isDark ? palette.dark : palette.light;
  const root = document.documentElement;
  colors.forEach((color, i) => root.style.setProperty(`--region-${i}`, color));
}
