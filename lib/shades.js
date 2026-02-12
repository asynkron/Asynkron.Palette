// Tailwind-scale shade generation using OKLCH color space

import { hexToOklch, oklchToHex } from './color.js';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// How far to interpolate toward the light/dark end (0 = base, 1 = extreme)
const LIGHTER_T = { 50: 0.92, 100: 0.80, 200: 0.62, 300: 0.42, 400: 0.18 };
const DARKER_T  = { 600: 0.18, 700: 0.38, 800: 0.56, 900: 0.76, 950: 0.92 };

const LIGHT_END = 0.98;
const DARK_END  = 0.10;

export function generateShades(hex) {
  const [baseL, baseC, baseH] = hexToOklch(hex);

  return SHADES.map(shade => {
    if (shade === 500) return { shade, hex };

    let L, cScale;

    if (shade < 500) {
      const t = LIGHTER_T[shade];
      L = baseL + (LIGHT_END - baseL) * t;
      // Reduce chroma toward white (near-zero at lightest)
      cScale = 1 - t * 0.95;
    } else {
      const t = DARKER_T[shade];
      L = baseL - (baseL - DARK_END) * t;
      // Keep more chroma in darks than in lights
      cScale = 1 - t * 0.65;
    }

    return { shade, hex: oklchToHex(L, baseC * Math.max(0, cScale), baseH) };
  });
}
