// Semantic naming for palette colors

const NAME_MAPS = {
  1: ['primary'],
  2: ['primary', 'secondary'],
  3: ['primary', 'secondary', 'accent'],
  4: ['primary', 'secondary', 'accent', 'neutral'],
  5: ['primary', 'secondary', 'tertiary', 'accent', 'neutral'],
};

export function assignNames(count) {
  if (count <= 5) return NAME_MAPS[count];

  const names = ['primary', 'secondary', 'tertiary', 'accent', 'neutral'];
  for (let i = 5; i < count; i++) {
    names.push(`accent-${i - 3}`);
  }
  return names;
}
