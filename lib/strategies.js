// Color wheel strategies for generating harmonious hue sets

function norm(h) {
  return ((h % 360) + 360) % 360;
}

function hueDistance(a, b) {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
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
  const fn = strategies[strategy];
  if (!fn) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }
  return fn(anchorHue, count);
}

function findBestTemplateMatch(inputHues, count, strategy) {
  if (inputHues.length === 0) {
    return { template: generateHues(0, count, strategy), matchedIndices: [] };
  }

  let best = { cost: Infinity, template: null, matchedIndices: [] };

  for (let anchor = 0; anchor < 360; anchor++) {
    const template = generateHues(anchor, count, strategy);
    const used = Array.from({ length: count }, () => false);
    const indices = Array.from({ length: inputHues.length }, () => -1);

    function dfs(inputIndex, cost) {
      if (cost >= best.cost) return;
      if (inputIndex === inputHues.length) {
        best = { cost, template, matchedIndices: [...indices] };
        return;
      }

      for (let templateIndex = 0; templateIndex < count; templateIndex++) {
        if (used[templateIndex]) continue;
        used[templateIndex] = true;
        indices[inputIndex] = templateIndex;
        const d = hueDistance(inputHues[inputIndex], template[templateIndex]);
        dfs(inputIndex + 1, cost + d);
        used[templateIndex] = false;
      }
    }

    dfs(0, 0);
  }

  return best;
}

export function generateFillHues(inputHues, count, strategy) {
  if (inputHues.length >= count) return [];

  const { template, matchedIndices } = findBestTemplateMatch(inputHues, count, strategy);
  const matched = new Set(matchedIndices);
  const fill = [];

  for (let i = 0; i < template.length; i++) {
    if (!matched.has(i)) fill.push(template[i]);
  }

  return fill;
}

export const STRATEGY_NAMES = Object.keys(strategies);
