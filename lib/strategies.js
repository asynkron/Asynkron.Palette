// Color wheel strategies for generating harmonious hue sets

function norm(h) {
  return ((h % 360) + 360) % 360;
}

function fromKeyAngles(anchor, count, keyAngles) {
  const hues = keyAngles.slice(0, count).map(a => norm(anchor + a));
  // If count exceeds key angles, fill with evenly-spaced
  const step = 360 / count;
  for (let i = hues.length; i < count; i++) {
    hues.push(norm(anchor + i * step));
  }
  return hues;
}

const strategies = {
  'evenly-spaced'(anchor, count) {
    const step = 360 / count;
    return Array.from({ length: count }, (_, i) => norm(anchor + i * step));
  },

  analogous(anchor, count) {
    const step = 30;
    const hues = [anchor];
    for (let i = 1; hues.length < count; i++) {
      hues.push(norm(anchor + i * step));
      if (hues.length < count) hues.push(norm(anchor - i * step));
    }
    return hues;
  },

  complementary(anchor, count) {
    return fromKeyAngles(anchor, count, [0, 180]);
  },

  'split-complementary'(anchor, count) {
    return fromKeyAngles(anchor, count, [0, 150, 210]);
  },

  triadic(anchor, count) {
    return fromKeyAngles(anchor, count, [0, 120, 240]);
  },

  tetradic(anchor, count) {
    return fromKeyAngles(anchor, count, [0, 90, 180, 270]);
  },
};

export function generateHues(anchorHue, count, strategy) {
  const fn = strategies[strategy] || strategies['evenly-spaced'];
  return fn(anchorHue, count);
}

export const STRATEGY_NAMES = Object.keys(strategies);
