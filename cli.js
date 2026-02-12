#!/usr/bin/env node

import { hexToHsl, hslToHex, hexToOklch, oklchToHex, hexToRgb } from './lib/color.js';
import { generateHues, STRATEGY_NAMES } from './lib/strategies.js';
import { generateShades } from './lib/shades.js';
import { assignNames } from './lib/names.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function colorize(text, hex) {
  if (!useColor) return text;
  const [r, g, b] = hexToRgb(hex);
  const [L] = hexToOklch(hex);
  const fg = L > 0.6 ? '30' : '97'; // black or bright white
  return `\x1b[${fg};48;2;${r};${g};${b}m${text}\x1b[0m`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const colors = [];
  let count = null;
  let strategy = 'evenly-spaced';
  let help = false;
  let raw = false;
  let mood = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--raw' || arg === '-r') {
      raw = true;
    } else if (arg === '--vibrant') {
      mood = 'vibrant';
    } else if (arg === '--pastel') {
      mood = 'pastel';
    } else if (arg === '--count' || arg === '-c') {
      count = parseInt(args[++i], 10);
    } else if (arg === '--strategy' || arg === '-s') {
      strategy = args[++i];
    } else if (arg.startsWith('#')) {
      colors.push(arg);
    } else if (/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(arg)) {
      colors.push('#' + arg);
    }
  }

  if (count === null) count = Math.max(colors.length, 3);
  count = Math.max(count, colors.length);

  return { colors, count, strategy, help, raw, mood };
}

function printUsage() {
  console.log(`Usage: palette [colors...] [options]

Arguments:
  colors                One or more hex colors (e.g. #aa5420 #9b2010)
                        If omitted, a random color is generated.

Options:
  -c, --count N         Total number of base colors (default: max(inputs, 3))
  -s, --strategy NAME   Color strategy (default: evenly-spaced)
  -r, --raw             Skip normalization, use input colors exactly as given
  --vibrant             High saturation, punchy colors
  --pastel              Soft, light, desaturated colors
  -h, --help            Show this help message

Strategies:
  analogous             Adjacent colors on the wheel (±30°)
  complementary         Opposite colors (180°)
  split-complementary   Split complement (150° and 210°)
  triadic               Three-way split (120°)
  tetradic              Four-way split (90°)
  evenly-spaced         Equal spacing (360°/count)

Color output:
  Each base color produces 11 Tailwind-scale shades (50–950) using the
  OKLCH color space. Shade 500 is the base color. Colors are named
  semantically: primary, secondary, tertiary, accent, neutral.

  By default, all colors are normalized to the first input color's
  lightness and chroma (in OKLCH), so the palette looks cohesive.
  Use --raw to skip this and keep input colors exactly as given.
  Use --vibrant or --pastel to override the target lightness/chroma.

  ANSI color output is used automatically when printing to a terminal.
  Set NO_COLOR=1 to disable.

Examples:
  palette                                           Random 3-color palette
  palette #aa5420                                   3 colors from anchor
  palette #aa5420 --count 5 --strategy triadic      5 triadic colors
  palette #aa5420 #9b2010 --count 5                 2 inputs + 3 generated
  palette #aa5420 --vibrant                         Vibrant mood
  palette #aa5420 --pastel                          Pastel mood
  palette #aa5420 #3366ff --raw                     Keep exact input colors`);
}

function fillLargestGaps(existingHues, needed) {
  const hues = [...existingHues];
  const result = [];
  for (let n = 0; n < needed; n++) {
    const sorted = [...hues].sort((a, b) => a - b);
    let maxGap = 0, bestMid = 0;
    for (let i = 0; i < sorted.length; i++) {
      const next = sorted[(i + 1) % sorted.length];
      const gap = i + 1 < sorted.length ? next - sorted[i] : 360 - sorted[i] + sorted[0];
      if (gap > maxGap) {
        maxGap = gap;
        bestMid = (sorted[i] + gap / 2) % 360;
      }
    }
    result.push(bestMid);
    hues.push(bestMid);
  }
  return result;
}

function isValidHex(hex) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

function main() {
  const { colors, count, strategy, help, raw, mood } = parseArgs(process.argv);

  const MOODS = {
    vibrant: { L: 0.55, C: 0.22 },
    pastel:  { L: 0.82, C: 0.07 },
  };

  if (help) {
    printUsage();
    process.exit(0);
  }

  if (colors.length === 0) {
    const m = mood ? MOODS[mood] : { L: 0.55, C: 0.15 };
    colors.push(oklchToHex(m.L, m.C, Math.random() * 360));
  }

  for (const c of colors) {
    if (!isValidHex(c)) {
      console.error(`Error: Invalid hex color "${c}". Use format #rgb or #rrggbb.`);
      process.exit(1);
    }
  }

  if (!STRATEGY_NAMES.includes(strategy)) {
    console.error(`Error: Unknown strategy "${strategy}".\nValid strategies: ${STRATEGY_NAMES.join(', ')}`);
    process.exit(1);
  }

  // Anchor color determines HSL properties for generated colors
  const [anchorH, anchorS, anchorL] = hexToHsl(colors[0]);

  // Generate missing hues
  let fillHues;
  if (colors.length >= 2 && count > colors.length) {
    // Multiple inputs: fill gaps between existing input hues
    const inputHues = colors.map(c => hexToHsl(c)[0]);
    fillHues = fillLargestGaps(inputHues, count - colors.length);
  } else {
    // Single input: use strategy
    const allHues = generateHues(anchorH, count, strategy);
    fillHues = allHues.slice(colors.length);
  }

  // Build base colors: inputs first, then generated fills
  const baseColors = [
    ...colors,
    ...fillHues.map(hue => hslToHex(hue, anchorS, anchorL)),
  ];

  // Normalize colors: mood overrides L/C for all, otherwise anchor's L/C for non-anchors
  if (!raw) {
    const [anchorOL, anchorOC] = hexToOklch(baseColors[0]);
    const targetL = mood ? MOODS[mood].L : anchorOL;
    const targetC = mood ? MOODS[mood].C : anchorOC;
    const start = mood ? 0 : 1; // mood adjusts anchor too
    for (let i = start; i < baseColors.length; i++) {
      const [, , h] = hexToOklch(baseColors[i]);
      baseColors[i] = oklchToHex(targetL, targetC, h);
    }
  }

  // Assign semantic names and generate shades
  const names = assignNames(count);

  // Find longest label for consistent padding
  const maxLabel = Math.max(...names.map((n, i) => `${n}-950: #000000`.length));

  for (let i = 0; i < baseColors.length; i++) {
    const shades = generateShades(baseColors[i]);
    for (const { shade, hex } of shades) {
      const marker = (i < colors.length && shade === 500) ? '  \u2190 input' : '';
      const label = `${names[i]}-${shade}: ${hex}`;
      const padded = label.padEnd(maxLabel + 2);
      console.log(colorize(` ${padded}`, hex) + marker);
    }
    if (i < baseColors.length - 1) console.log('');
  }
}

main();
