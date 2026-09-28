import * as THREE from "three";
import { RIVER_PATHS, getHeight } from "./terrain.js";
import { MAP_SCALE } from "../worldConstants.js";

// Builds animated, terrain-following water ribbons along the major river courses.

function buildWaterTexture() {
  const width = 128;
  const height = 32;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(y * 0.72 + Math.sin(x * 0.13) * 1.6) * 18;
      const glint = Math.max(0, Math.sin(x * 0.24 + y * 0.55)) * 34;
      const shade = 116 + wave + glint;
      const index = (y * width + x) * 4;
      data[index] = Math.max(20, shade * 0.55);
      data[index + 1] = Math.min(210, shade + 28);
      data[index + 2] = Math.min(240, shade + 62);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function buildRiverMeshes() {
  const group = new THREE.Group();
  const waterTexture = buildWaterTexture();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: waterTexture,
    emissive: 0x102b38,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.96,
    roughness: 0.22,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  for (let riverIndex = 0; riverIndex < RIVER_PATHS.length; riverIndex++) {
    const anchors = RIVER_PATHS[riverIndex].map(([x, z]) => new THREE.Vector3(x, getHeight(x, z), z));
    const curve = new THREE.CatmullRomCurve3(anchors, false, "centripetal", 0.35);
    const path = curve.getPoints((anchors.length - 1) * 10);
    const widths = [72, 42, 86];
    const baseWidth = widths[riverIndex] * MAP_SCALE;
    const positions = [];
    const uvs = [];
    const indices = [];
    let distance = 0;
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      const previous = path[Math.max(0, i - 1)];
      const next = path[Math.min(path.length - 1, i + 1)];
      const dx = next.x - previous.x;
      const dz = next.z - previous.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const t = i / (path.length - 1);
      const width = baseWidth * (0.72 + 0.34 * t + 0.12 * Math.sin(Math.PI * t));
      const lx = point.x + nx * width * 0.5;
      const lz = point.z + nz * width * 0.5;
      const rx = point.x - nx * width * 0.5;
      const rz = point.z - nz * width * 0.5;
      const leftHeight = getHeight(lx, lz) - 0.7 * MAP_SCALE;
      const rightHeight = getHeight(rx, rz) - 0.7 * MAP_SCALE;
      positions.push(lx, leftHeight, lz, rx, rightHeight, rz);
      uvs.push(distance / (52 * MAP_SCALE), 0, distance / (52 * MAP_SCALE), 1);
      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
      distance += Math.hypot(next.x - point.x, next.z - point.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  group.userData.update = (elapsed) => {
    waterTexture.offset.x = -elapsed * 0.055;
  };
  return group;
}
