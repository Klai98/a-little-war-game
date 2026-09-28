import * as THREE from "three";
import { getHeight, isRiver, isLand, MAP_WIDTH, MAP_DEPTH } from "./terrain.js";
import { GameData } from "../gameData.js";
import { MAP_SCALE } from "../worldConstants.js";
import { makeNoise2D } from "../noise.js";

// Scatters simple procedural trees (trunk + foliage) across plains/hill terrain,
// avoiding rivers and staying clear of city sites. Uses InstancedMesh for performance.

function mulberry32(seed) {
  let s = seed;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tooCloseToCity(x, z) {
  for (const city of Object.values(GameData.cities)) {
    const dx = x - city.position.x;
    const dz = z - city.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 55 * MAP_SCALE) return true;
  }
  return false;
}

export function buildTrees(count = 12000) {
  const rng = mulberry32(777);
  const forestDensity = makeNoise2D(445801, 3, 0.0024 / MAP_SCALE);

  const trunkGeo = new THREE.CylinderGeometry(1.2 * MAP_SCALE, 1.6 * MAP_SCALE, 6 * MAP_SCALE, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24 });
  const leavesGeo = new THREE.SphereGeometry(4.2 * MAP_SCALE, 9, 7);
  const pineGeo = new THREE.ConeGeometry(4.6 * MAP_SCALE, 12 * MAP_SCALE, 7, 2);
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });

  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const leavesMesh = new THREE.InstancedMesh(leavesGeo, leavesMat, count);
  const pineMesh = new THREE.InstancedMesh(pineGeo, leavesMat, count);
  leavesMesh.count = 0;
  pineMesh.count = 0;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = 10 + rng() * (MAP_WIDTH - 20);
    const z = 10 + rng() * (MAP_DEPTH - 20);
    if (!isLand(x, z)) continue;
    if (isRiver(x, z)) continue;
    if (rng() > 0.3 + (forestDensity(x, z) + 1) * 0.35) continue;
    const h = getHeight(x, z);
    if (h < 3 * MAP_SCALE || h > 46 * MAP_SCALE) continue;
    if (tooCloseToCity(x, z)) continue;

    const rotY = rng() * Math.PI * 2;
    const scale = 0.8 + rng() * 0.5;
    const isPine = rng() < 0.32;
    const crownMesh = isPine ? pineMesh : leavesMesh;
    const crownIndex = crownMesh.count;

    dummy.position.set(x, h + 3 * MAP_SCALE * scale, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(placed, dummy.matrix);

    dummy.position.set(x, h + (isPine ? 8 : 9) * MAP_SCALE * scale, z);
    dummy.rotation.set(0, rotY, isPine ? 0 : (rng() - 0.5) * 0.12);
    dummy.scale.set(scale * (0.88 + rng() * 0.24), scale * (isPine ? 1 : 0.78 + rng() * 0.34), scale * (0.88 + rng() * 0.24));
    dummy.updateMatrix();
    crownMesh.setMatrixAt(crownIndex, dummy.matrix);
    crownMesh.setColorAt(crownIndex, new THREE.Color().setHSL(0.27 + rng() * 0.045, 0.38 + rng() * 0.18, 0.24 + rng() * 0.12));
    crownMesh.count++;

    placed++;
  }
  trunkMesh.count = placed;
  trunkMesh.instanceMatrix.needsUpdate = true;
  leavesMesh.instanceMatrix.needsUpdate = true;
  pineMesh.instanceMatrix.needsUpdate = true;
  if (leavesMesh.instanceColor) leavesMesh.instanceColor.needsUpdate = true;
  if (pineMesh.instanceColor) pineMesh.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.add(trunkMesh, leavesMesh, pineMesh);
  return group;
}
