// Minimal deterministic 2D value-noise generator (no external dependency).
// Not a true Perlin/Simplex implementation, but good enough for a stylised terrain heightmap.

function hash(x, y, seed) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453123;
  return h - Math.floor(h);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise2D(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const v00 = hash(xi, yi, seed);
  const v10 = hash(xi + 1, yi, seed);
  const v01 = hash(xi, yi + 1, seed);
  const v11 = hash(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  const top = v00 + (v10 - v00) * u;
  const bottom = v01 + (v11 - v01) * u;
  return (top + (bottom - top) * v) * 2 - 1; // range -1..1
}

// Returns a fractal-noise sampling function fn(x, y) -> [-1, 1], seeded and reproducible.
export function makeNoise2D(seed, octaves = 4, frequency = 0.006) {
  return function sample(x, y) {
    let amp = 1;
    let sum = 0;
    let norm = 0;
    let freq = frequency;
    for (let i = 0; i < octaves; i++) {
      sum += valueNoise2D(x * freq, y * freq, seed) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum / norm;
  };
}
