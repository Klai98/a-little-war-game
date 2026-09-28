import * as THREE from "three";
import { makeNoise2D } from "../noise.js";
import { MAP_SCALE, MAP_SPREAD } from "../worldConstants.js?v=20260928";
import { GameData } from "../gameData.js";

// Procedural heightmap terrain matching GameData world coordinates (x: 0-2000, z: 0-1640).

export const MAP_WIDTH = 2000 * MAP_SPREAD * MAP_SCALE;
export const MAP_DEPTH = 1640 * MAP_SPREAD * MAP_SCALE;
const CELL = 18 * MAP_SCALE;
const HEIGHT_SCALE = 55 * MAP_SCALE;
const RIVER_RADIUS = 42 * MAP_SCALE;
const RIVER_DEPTH = 18 * MAP_SCALE;

// Stylized outline of the China campaign theater, normalized to the expanded map.
export const LAND_OUTLINE = [
  [0.1, 0.08], [0.22, 0.04], [0.36, 0.1], [0.51, 0.06], [0.6, 0.04], [0.7, 0.05], [0.76, 0.03], [0.84, 0.04], [0.9, 0.09], [0.93, 0.18], [0.94, 0.3],
  [0.91, 0.42], [0.97, 0.53], [0.86, 0.63], [0.89, 0.73], [0.96, 0.78],
  [0.93, 0.84], [0.87, 0.82], [0.83, 0.91], [0.76, 0.92], [0.64, 0.91], [0.57, 0.99], [0.45, 0.96], [0.38, 0.99], [0.29, 0.94],
  [0.24, 0.98], [0.22, 0.99], [0.17, 0.85], [0.13, 0.98], [0.1, 0.96], [0.08, 0.86], [0.08, 0.76], [0.04, 0.8], [0.12, 0.61], [0.05, 0.51],
  [0.12, 0.38], [0.06, 0.26],
];

const BASE_RIVER_PATHS = [
  // Yellow River: bends around the northern plains before entering the Bohai coast.
  [[100, 460], [250, 410], [420, 350], [600, 300], [760, 250], [900, 170], [1050, 170], [1200, 200], [1350, 250], [1500, 300], [1650, 290], [1800, 260], [1900, 250]],
  // Yangtze River crosses the southern states from Shu toward the eastern sea.
  [[100, 1400], [330, 1360], [560, 1320], [790, 1280], [1020, 1260], [1250, 1240], [1480, 1220], [1700, 1210], [1900, 1180]],
];
export const RIVER_PATHS = BASE_RIVER_PATHS.map((river) => river.map(([x, z]) => [x * MAP_SPREAD * MAP_SCALE, z * MAP_SPREAD * MAP_SCALE]));

const MOUNTAIN_PEAKS = [
  { x: 455, z: 825, radiusX: 70, radiusZ: 112, height: 98 }, // Hua Mountain
  { x: 1505, z: 690, radiusX: 72, radiusZ: 96, height: 92 }, // Mount Tai
  { x: 1050, z: 1240, radiusX: 210, radiusZ: 150, height: 62 }, // Dabie range
];

const sampleNoise = makeNoise2D(20260926, 4, 0.006 / MAP_SCALE);
const sampleAridity = makeNoise2D(87651234, 3, 0.004 / MAP_SCALE);

function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  let t = 0;
  if (lenSq > 0.0001) {
    t = ((px - ax) * abx + (pz - az) * abz) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projx = ax + abx * t;
  const projz = az + abz * t;
  const dx = px - projx;
  const dz = pz - projz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function riverInfluence(x, z) {
  let minDist = Infinity;
  for (const path of RIVER_PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      const d = pointSegmentDistance(x, z, ax, az, bx, bz);
      if (d < minDist) minDist = d;
    }
  }
  if (minDist >= RIVER_RADIUS) return 0;
  return 1 - minDist / RIVER_RADIUS;
}

export function isRiver(x, z) {
  return riverInfluence(x, z) > 0.35;
}

export function mountainInfluence(x, z) {
  const baseX = x / (MAP_SCALE * MAP_SPREAD);
  const baseZ = z / (MAP_SCALE * MAP_SPREAD);
  let influence = 0;
  for (const peak of MOUNTAIN_PEAKS) {
    const distance = Math.pow((baseX - peak.x) / peak.radiusX, 2) + Math.pow((baseZ - peak.z) / peak.radiusZ, 2);
    influence = Math.max(influence, Math.exp(-distance));
  }
  const qinlingLine = 610 + baseX * 0.48;
  if (baseX > 140 && baseX < 1000) {
    influence = Math.max(influence, Math.exp(-Math.pow((baseZ - qinlingLine) / 62, 2)));
  }
  return influence;
}

export function isMountain(x, z) {
  return mountainInfluence(x, z) > 0.78;
}

export function isWalkable(x, z) {
  return isLand(x, z) && !isRiver(x, z) && !isMountain(x, z);
}

export function isLand(x, z) {
  const px = x / MAP_WIDTH;
  const pz = z / MAP_DEPTH;
  let inside = false;
  for (let i = 0, j = LAND_OUTLINE.length - 1; i < LAND_OUTLINE.length; j = i++) {
    const [xi, zi] = LAND_OUTLINE[i];
    const [xj, zj] = LAND_OUTLINE[j];
    const crosses = (zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function getRawHeight(x, z) {
  if (!isLand(x, z)) return -14 * MAP_SCALE;
  const base = (sampleNoise(x, z) + 1) * 0.5;
  const baseX = x / (MAP_SCALE * MAP_SPREAD);
  const baseZ = z / (MAP_SCALE * MAP_SPREAD);
  let h = base * HEIGHT_SCALE;
  const qinling = Math.exp(-Math.pow((baseZ - (610 + baseX * 0.48)) / 125, 2));
  const taihang = Math.exp(-Math.pow((baseX - 720) / 95, 2)) * Math.exp(-Math.pow((baseZ - 540) / 430, 2));
  const daba = Math.exp(-Math.pow((baseX - 360) / 240, 2) - Math.pow((baseZ - 1260) / 180, 2));
  const peaks = MOUNTAIN_PEAKS.reduce((height, peak) => {
    const distance = Math.pow((baseX - peak.x) / peak.radiusX, 2) + Math.pow((baseZ - peak.z) / peak.radiusZ, 2);
    return height + peak.height * Math.exp(-distance * 0.78);
  }, 0);
  const ridgeNoise = Math.abs(sampleNoise(x * 1.7, z * 1.7));
  h += (qinling * (28 + ridgeNoise * 34) + taihang * (34 + ridgeNoise * 40) + daba * 27 + peaks) * MAP_SCALE;
  h -= riverInfluence(x, z) * RIVER_DEPTH;
  return Math.max(h, -6);
}

export function getHeight(x, z) {
  let height = getRawHeight(x, z);
  const innerRadius = 34 * MAP_SCALE;
  const outerRadius = 78 * MAP_SCALE;
  for (const city of Object.values(GameData.cities)) {
    const distance = Math.hypot(x - city.position.x, z - city.position.z);
    if (distance >= outerRadius) continue;
    const blend = 1 - THREE.MathUtils.smoothstep(distance, innerRadius, outerRadius);
    height = THREE.MathUtils.lerp(height, getRawHeight(city.position.x, city.position.z), blend);
  }
  return height;
}

// Western Qin frontier (低x) blends toward dry/desert tones when aridity noise is high.
function aridityFactor(x, z) {
  if (x > 700 * MAP_SPREAD * MAP_SCALE) return 0;
  const dryness = (sampleAridity(x, z) + 1) * 0.5;
  const westFalloff = 1 - Math.min(1, x / (700 * MAP_SPREAD * MAP_SCALE));
  return Math.max(0, dryness * westFalloff - 0.15);
}

function heightColor(h, x, z) {
  let color;
  if (h < 0.5 * MAP_SCALE) {
    color = new THREE.Color(0.16, 0.32, 0.55);
  } else if (h < 18 * MAP_SCALE) {
    color = new THREE.Color(0.36, 0.48, 0.27);
  } else if (h < 34 * MAP_SCALE) {
    color = new THREE.Color(0.39, 0.43, 0.3);
  } else {
    const alpine = THREE.MathUtils.smoothstep(h, 34 * MAP_SCALE, 118 * MAP_SCALE);
    color = new THREE.Color(0.39, 0.43, 0.3).lerp(new THREE.Color(0.66, 0.65, 0.59), alpine);
  }
  const arid = aridityFactor(x, z);
  if (arid > 0) {
    const sand = new THREE.Color(0.76, 0.68, 0.48);
    color = color.clone().lerp(sand, Math.min(1, arid * 1.4));
  }
  return color;
}

function buildGroundTexture() {
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const broad = Math.sin(x * 0.027 + Math.sin(y * 0.019)) * 5 + Math.sin(y * 0.031 + x * 0.009) * 4;
      const fine = Math.sin(x * 1.71 + y * 2.31) * Math.sin(y * 1.13 - x * 0.67) * 9;
      const shade = 224 + broad + fine;
      data[index] = Math.max(0, Math.min(255, shade + 5));
      data[index + 1] = Math.max(0, Math.min(255, shade + 8));
      data[index + 2] = Math.max(0, Math.min(255, shade - 2));
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function buildTerrainMesh() {
  const cols = Math.ceil(MAP_WIDTH / CELL);
  const rows = Math.ceil(MAP_DEPTH / CELL);
  const colCount = cols + 1;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const x = Math.min(c * CELL, MAP_WIDTH);
      const z = Math.min(r * CELL, MAP_DEPTH);
      const h = getHeight(x, z);
      positions.push(x, h, z);
      uvs.push(x / MAP_WIDTH, 1 - z / MAP_DEPTH);
      const col = heightColor(h, x, z);
      colors.push(col.r, col.g, col.b);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * colCount + c;
      const b = a + 1;
      const cIdx = a + colCount;
      const d = cIdx + 1;
      indices.push(a, cIdx, b);
      indices.push(b, cIdx, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ map: buildGroundTexture(), vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
