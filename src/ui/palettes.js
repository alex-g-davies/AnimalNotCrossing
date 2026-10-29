// Region color palettes: 12 colors each (enough for 12x12), with a light and
// a dark variant. The lists were produced by a small search that maximises
// the smallest pairwise CIE76 difference within each palette's mood (hue
// list) and a calm saturation/lightness band; test/palette.test.js keeps
// every pair above the threshold. Thick borders are always drawn as well,
// so color is never the only cue.
//
// "Valley" is the Stardew-inspired farm theme: it also switches the whole
// look to pixel art (see style.css, html[data-palette="valley"]).

export const PALETTES = {
  meadow: {
    name: 'Meadow',
    light: ['#e6a3aa', '#a1eca1', '#edc79c', '#9ec9ed', '#eea0dd', '#9eedcd', '#eaf1cb', '#dcc6f5', '#efd5d1', '#c9f3f4', '#e2ee9c', '#a5a1ec'],
    dark: ['#8f323d', '#328d33', '#8d5f33', '#32628e', '#873470', '#328662', '#4e572a', '#402c54', '#55352d', '#265c5d', '#7e8b32', '#3e368c'],
  },
  sorbet: {
    name: 'Sorbet',
    light: ['#ed9c9d', '#9beddd', '#edcc9c', '#9ec1ed', '#e7c9f1', '#a3eeb0', '#e7ed9c', '#eac8c5', '#cee7ef', '#ed9cd2', '#b2a0ee', '#dff0cd'],
    dark: ['#532e31', '#328e7e', '#74542b', '#3b5987', '#7a338f', '#2b592b', '#8c8a33', '#8e3232', '#2e5254', '#8c3362', '#28225f', '#488b31'],
  },
  ocean: {
    name: 'Ocean',
    light: ['#d3eaec', '#ede49e', '#9db3ec', '#aee6c1', '#edaaa3', '#9deeea', '#f3efcc', '#cdcded', '#edc59e', '#9cd3ed', '#a1e9a3', '#a39ced'],
    dark: ['#2a5356', '#554e2c', '#364c8b', '#2b704d', '#603329', '#328b8a', '#70792c', '#2d3652', '#8e5e33', '#32698f', '#357d31', '#41328d'],
  },
  dusk: {
    name: 'Dusk',
    light: ['#e6a3ba', '#a1b6ec', '#e6d1a3', '#b4e3d5', '#e7cbf2', '#edb09e', '#eded9c', '#c6dff5', '#eddad3', '#b4f0b8', '#eaa3e6', '#b09fee'],
    dark: ['#8d345d', '#33518f', '#7c6d44', '#348972', '#4d275a', '#8c3733', '#8d8d32', '#2d4257', '#56392d', '#358a41', '#89338e', '#3c328d'],
  },
  valley: {
    name: 'Valley (farm)',
    light: ['#f4f0cc', '#cde8b1', '#edb1b0', '#cfe0ec', '#eebe9e', '#a9d1bd', '#cdbbec', '#f0c5de', '#edee9d', '#a6ea9f', '#a1c6ee', '#edd59c'],
    dark: ['#595427', '#45682a', '#6a2b2b', '#2d4754', '#543e2f', '#865032', '#493271', '#7e365b', '#8d8d33', '#3b8933', '#33628e', '#8f7133'],
  },
};

export const DEFAULT_PALETTE = 'meadow';

export function paletteColors(id, isDark) {
  const palette = PALETTES[id] || PALETTES[DEFAULT_PALETTE];
  return isDark ? palette.dark : palette.light;
}

export function applyPalette(id, isDark) {
  const root = document.documentElement;
  paletteColors(id, isDark).forEach((color, i) => root.style.setProperty(`--region-${i}`, color));
}

export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
