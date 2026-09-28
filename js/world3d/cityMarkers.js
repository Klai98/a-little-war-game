import * as THREE from "three";
import { getHeight } from "./terrain.js";
import { GameData, UNIT_ROSTERS } from "../gameData.js";
import { MAP_SCALE } from "../worldConstants.js";

// Procedural "Chinese ancient city" markers that grow more elaborate as a city's level
// rises (1-10): more pagoda tiers, a defensive wall ring, corner watchtowers, and banners.
// Also renders farmland patches (from the 农田 building) and a few soldier tokens for
// stationed armies. Not interactive - the clickable UI markers are the 2D overlay
// buttons in campaignMap.js.

const WALL_MIN_LEVEL = 3;
const TOWER_LEVEL_STEP = 3;
const MAX_TOWERS = 4;
const MAX_BANNERS = 6;

function ownerColorOf(city) {
  return city.ownerId ? GameData.factions[city.ownerId].color : 0x8c8c8c;
}

function buildPlatform(city, h, baseRadius) {
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius, baseRadius * 1.08, 2, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a8272 })
  );
  platform.position.set(city.position.x, h + 1, city.position.z);
  return platform;
}

function buildWallRing(city, h, baseRadius) {
  const group = new THREE.Group();
  const segCount = 12;
  const wallRadius = baseRadius * 0.92;
  const wallHeight = 4 + city.level * 0.5;
  for (let i = 0; i < segCount; i++) {
    const angle = (i / segCount) * Math.PI * 2;
    if (Math.sin(angle) > 0.78 && Math.abs(Math.cos(angle)) < 0.58) continue;
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(5, wallHeight, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x6b5d4f })
    );
    seg.position.set(
      city.position.x + Math.cos(angle) * wallRadius,
      h + 2 + wallHeight / 2,
      city.position.z + Math.sin(angle) * wallRadius
    );
    seg.rotation.y = -angle;
    group.add(seg);
  }
  return group;
}

function buildWatchtowers(city, h, baseRadius) {
  const group = new THREE.Group();
  const count = Math.min(MAX_TOWERS, Math.floor(city.level / TOWER_LEVEL_STEP) + 1);
  const towerRadius = baseRadius * 0.95;
  const towerHeight = 10 + city.level * 1.2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / 4;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.8, towerHeight, 6),
      new THREE.MeshStandardMaterial({ color: 0x574a3c })
    );
    body.position.set(
      city.position.x + Math.cos(angle) * towerRadius,
      h + 2 + towerHeight / 2,
      city.position.z + Math.sin(angle) * towerRadius
    );
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x8c2823 })
    );
    roof.position.set(body.position.x, h + 2 + towerHeight + 1.5, body.position.z);
    group.add(body, roof);
  }
  return group;
}

function buildPagodaTower(city, h, ownerColor) {
  const group = new THREE.Group();
  const tiers = Math.max(1, Math.ceil(city.level / 2));
  let tierY = h + 2;
  let tierRadius = 6 + city.level * 0.55;
  for (let t = 0; t < tiers; t++) {
    const bodyHeight = 6;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(tierRadius * 0.85, tierRadius, bodyHeight, 8),
      new THREE.MeshStandardMaterial({ color: ownerColor })
    );
    body.position.set(city.position.x, tierY + bodyHeight / 2, city.position.z);
    group.add(body);

    const roofHeight = 3.2;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(tierRadius * 1.2, roofHeight, 8),
      new THREE.MeshStandardMaterial({ color: 0x8c2823 })
    );
    roof.position.set(city.position.x, tierY + bodyHeight + roofHeight / 2, city.position.z);
    group.add(roof);

    tierY += bodyHeight + roofHeight;
    tierRadius *= 0.8;
  }
  return group;
}

function buildBanners(city, h, baseRadius, ownerColor) {
  const group = new THREE.Group();
  const count = Math.min(MAX_BANNERS, city.level);
  const poleRadius = baseRadius * 0.68;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.3;
    const px = city.position.x + Math.cos(angle) * poleRadius;
    const pz = city.position.z + Math.sin(angle) * poleRadius;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 10, 6),
      new THREE.MeshStandardMaterial({ color: 0x3b2b1c })
    );
    pole.position.set(px, h + 2 + 5, pz);
    group.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 2),
      new THREE.MeshStandardMaterial({ color: ownerColor, side: THREE.DoubleSide })
    );
    flag.position.set(px + 1.5, h + 2 + 8, pz);
    flag.rotation.y = -angle;
    group.add(flag);
  }
  return group;
}

function buildFarmPatches(city) {
  const group = new THREE.Group();
  const count = city.buildings.farmland;
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 0.5 + (i - (count - 1) / 2) * 0.32;
    const dist = 24 + city.level * 2;
    const px = city.position.x + Math.cos(angle) * dist;
    const pz = city.position.z + Math.sin(angle) * dist;
    const ph = getHeight(px, pz);
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 9),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, side: THREE.DoubleSide })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(px, ph + 0.3, pz);
    group.add(patch);
  }
  return group;
}

function addPart(group, geometry, material, x, y, z, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  group.add(mesh);
  return mesh;
}

function buildGatehouse(city, h, baseRadius, ownerColor) {
  const group = new THREE.Group();
  const z = city.position.z + baseRadius * 0.9;
  const stone = new THREE.MeshStandardMaterial({ color: 0x81745d, roughness: 0.92 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x4b3020, roughness: 0.76 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x782b22, roughness: 0.62 });
  const flag = new THREE.MeshStandardMaterial({ color: ownerColor, side: THREE.DoubleSide, roughness: 0.85 });
  for (const side of [-1, 1]) {
    const x = city.position.x + side * baseRadius * 0.5;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.5, 12, 4), stone);
    pillar.position.set(x, h + 7, z);
    group.add(pillar);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), timber);
    tower.position.set(x, h + 15, z);
    group.add(tower);
    const eave = new THREE.Mesh(new THREE.ConeGeometry(6, 4, 4), roof);
    eave.position.set(x, h + 19.5, z);
    eave.rotation.y = Math.PI / 4;
    group.add(eave);
    const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 5), timber);
    bannerPole.position.set(x, h + 23, z + side * 1.4);
    group.add(bannerPole);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.5), flag);
    banner.position.set(x + 1.5, h + 27.8, z + side * 1.4);
    group.add(banner);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(baseRadius * 1.45, 2, 4.5), timber);
  lintel.position.set(city.position.x, h + 13.5, z);
  group.add(lintel);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(baseRadius * 0.48, 9, 1.3), timber);
  doors.position.set(city.position.x, h + 5.5, z - 1.8);
  group.add(doors);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(baseRadius * 0.28, 2.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xc3a05b, metalness: 0.42 }));
  plaque.position.set(city.position.x, h + 13.3, z + 2.2);
  group.add(plaque);
  return group;
}

function buildMarketHouses(city, h, baseRadius, ownerColor) {
  const group = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0x9b8562, roughness: 0.94 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x594338, roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.8 });
  const houseCount = Math.min(5, 2 + city.level);
  for (let index = 0; index < houseCount; index++) {
    const angle = index * Math.PI * 2 / houseCount + 0.1;
    const radius = baseRadius * (index % 2 ? 0.45 : 0.58);
    const x = city.position.x + Math.cos(angle) * radius;
    const z = city.position.z + Math.sin(angle) * radius;
    const size = 4 + (index % 3);
    const house = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.85, size), wall);
    house.position.set(x, h + size * 0.43 + 2, z);
    group.add(house);
    const eaves = new THREE.Mesh(new THREE.CylinderGeometry(0.6, size * 0.88, 2.7, 4), roof);
    eaves.position.set(x, h + size * 0.85 + 3.3, z);
    eaves.rotation.y = Math.PI / 4;
    group.add(eaves);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(size * 0.76, 0.7, 0.5), trim);
    awning.position.set(x, h + size * 0.6 + 2, z + size * 0.52);
    group.add(awning);
  }
  return group;
}

function buildHorse(group, materials) {
  const { horse, leather } = materials;
  addPart(group, new THREE.SphereGeometry(1, 9, 7), horse, 0, 5.2, -3, { z: Math.PI / 2 });
  const body = group.children[group.children.length - 1];
  body.scale.set(2.3, 1.8, 4.5);
  addPart(group, new THREE.CylinderGeometry(0.8, 1.2, 4.4, 7), horse, 0, 7.7, 1.2, { x: -0.18 });
  addPart(group, new THREE.SphereGeometry(1.15, 8, 7), horse, 0, 9.7, 3.2);
  addPart(group, new THREE.ConeGeometry(0.45, 1.7, 6), horse, -0.7, 10.7, 3.7, { z: -0.28 });
  addPart(group, new THREE.ConeGeometry(0.45, 1.7, 6), horse, 0.7, 10.7, 3.7, { z: 0.28 });
  for (const x of [-1.3, 1.3]) for (const z of [-5.7, -0.8]) {
    addPart(group, new THREE.CylinderGeometry(0.42, 0.32, 5, 6), horse, x, 2.8, z, { z: x * 0.04 });
    addPart(group, new THREE.BoxGeometry(1.05, 0.85, 1.6), leather, x, 0.65, z + 0.2);
  }
  addPart(group, new THREE.BoxGeometry(4.8, 0.7, 2), leather, 0, 8.1, -0.6);
}

function buildSoldierModel(x, z, h, factionColor, unit) {
  const group = new THREE.Group();
  const mounted = unit.type.includes("骑") || unit.type === "战车";
  const remote = unit.type === "远程";
  const materials = {
    cloth: new THREE.MeshStandardMaterial({ color: factionColor, roughness: 0.82 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x75543a, metalness: 0.58, roughness: 0.42 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xc49a4c, metalness: 0.55, roughness: 0.36 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x292522, roughness: 0.72 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd3a57e, roughness: 0.92 }),
    plume: new THREE.MeshStandardMaterial({ color: 0x9c3023, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x503522, roughness: 0.8 }),
    horse: new THREE.MeshStandardMaterial({ color: 0x624333, roughness: 0.9 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x38291e, roughness: 0.8 }),
  };

  if (mounted) buildHorse(group, materials);
  const riderLift = mounted ? 7 : 0;
  addPart(group, new THREE.BoxGeometry(5.3, 6.6, 3.3), materials.cloth, 0, 8.1 + riderLift, 0);
  addPart(group, new THREE.BoxGeometry(5.8, 5.2, 3.7), materials.armor, 0, 8.5 + riderLift, 0.3);
  // Layered lamellar plates and a bright center fastening make the cuirass read at map scale.
  for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) {
    addPart(group, new THREE.BoxGeometry(1.45, 0.72, 0.26), materials.trim,
      col * 1.55, 9.9 + riderLift - row * 1.45, 2.22);
  }
  addPart(group, new THREE.SphereGeometry(1.2, 8, 6), materials.armor, -3.25, 10.2 + riderLift, 0);
  addPart(group, new THREE.SphereGeometry(1.2, 8, 6), materials.armor, 3.25, 10.2 + riderLift, 0);
  addPart(group, new THREE.CylinderGeometry(0.62, 0.75, 2.1, 8), materials.skin, 0, 12.9 + riderLift, 0.1);
  addPart(group, new THREE.SphereGeometry(1.55, 9, 7), materials.skin, 0, 15 + riderLift, 0.15);
  addPart(group, new THREE.SphereGeometry(1.9, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), materials.armor, 0, 16.1 + riderLift, -0.05);
  addPart(group, new THREE.BoxGeometry(3.6, 0.6, 3.1), materials.armor, 0, 14.7 + riderLift, 0.1);
  addPart(group, new THREE.ConeGeometry(0.8, 3.6, 6), materials.plume, 0, 18.1 + riderLift, -0.2, { x: -0.2, z: 0.3 });
  for (const side of [-1, 1]) {
    addPart(group, new THREE.CylinderGeometry(0.72, 0.58, 5.2, 7), materials.armor,
      side * 3.4, 7.8 + riderLift, 0.3, { z: -side * 0.18 });
    addPart(group, new THREE.SphereGeometry(0.78, 7, 6), materials.skin, side * 3.55, 4.95 + riderLift, 0.4);
    addPart(group, new THREE.BoxGeometry(2.25, 4.5, 2.9), materials.cloth, side * 1.35, 3.1 + riderLift, 0);
    addPart(group, new THREE.BoxGeometry(2.5, 1, 3.1), materials.dark, side * 1.35, 0.65 + riderLift, 0.4);
  }
  for (let panel = -1; panel <= 1; panel++) {
    addPart(group, new THREE.BoxGeometry(1.55, 4.1, 0.65), materials.armor, panel * 1.8, 4.5 + riderLift, 1.85,
      { z: panel * 0.12 });
  }

  if (remote) {
    addPart(group, new THREE.BoxGeometry(0.7, 0.7, 5.3), materials.wood, 3.5, 9.3 + riderLift, 0.8, { y: 0.25 });
    addPart(group, new THREE.BoxGeometry(0.5, 3.1, 0.5), materials.trim, 3.5, 9.3 + riderLift, 0.8, { z: Math.PI / 2 });
    addPart(group, new THREE.CylinderGeometry(0.2, 0.2, 10, 6), materials.wood, -3.8, 13 + riderLift, 0.2,
      { z: 0.12 });
  } else {
    addPart(group, new THREE.CylinderGeometry(0.24, 0.34, 15, 7), materials.wood, 4.05, 12 + riderLift, 0.4,
      { z: -0.17 });
    addPart(group, new THREE.ConeGeometry(0.72, 2.8, 6), materials.trim, 5.3, 20 + riderLift, 0.4,
      { z: -0.17 });
    addPart(group, new THREE.CylinderGeometry(0.65, 0.65, 2.2, 6), materials.armor, 4.8, 19.6 + riderLift, 0.4,
      { z: -0.17 });
  }

  group.position.set(x, h, z);
  group.rotation.y = -0.25;
  return group;
}

function buildSoldierTokens(city, h, baseRadius) {
  const group = new THREE.Group();
  const stacks = Object.values(GameData.armies).filter((a) => a.cityId === city.id && !a.isMarching).slice(0, 3);
  stacks.forEach((army, i) => {
    const angle = -Math.PI * 0.5 + (i - (stacks.length - 1) / 2) * 0.5;
    const dist = baseRadius * 0.7;
    const color = GameData.factions[army.factionId].color;
    const roster = UNIT_ROSTERS[army.factionId];
    for (let soldier = 0; soldier < 3; soldier++) {
      const entry = army.units[soldier % Math.max(army.units.length, 1)];
      const unit = roster.find((item) => item.id === entry?.unitId) ?? roster[0];
      const lateral = (soldier - 1) * 9;
      const px = city.position.x + Math.cos(angle) * dist + lateral * Math.cos(angle + Math.PI / 2);
      const pz = city.position.z + Math.sin(angle) * dist + lateral * Math.sin(angle + Math.PI / 2);
      group.add(buildSoldierModel(px, pz, h, color, unit));
    }
  });
  return group;
}

function buildCityGroup(city) {
  const group = new THREE.Group();
  const h = getHeight(city.position.x, city.position.z);
  const ownerColor = ownerColorOf(city);
  const baseRadius = 8 + city.level * 1.8;

  group.add(buildPlatform(city, h, baseRadius));
  if (city.level >= WALL_MIN_LEVEL) {
    group.add(buildWallRing(city, h, baseRadius));
    group.add(buildWatchtowers(city, h, baseRadius));
  }
  group.add(buildPagodaTower(city, h, ownerColor));
  group.add(buildMarketHouses(city, h, baseRadius, ownerColor));
  if (city.level >= 2) group.add(buildGatehouse(city, h, baseRadius, ownerColor));
  group.add(buildBanners(city, h, baseRadius, ownerColor));
  group.add(buildFarmPatches(city));
  group.add(buildSoldierTokens(city, h, baseRadius));
  group.scale.setScalar(MAP_SCALE);
  group.position.set(
    city.position.x * (1 - MAP_SCALE),
    h * (1 - MAP_SCALE),
    city.position.z * (1 - MAP_SCALE)
  );

  return group;
}

export function buildCityTowers() {
  const group = new THREE.Group();
  for (const city of Object.values(GameData.cities)) {
    group.add(buildCityGroup(city));
  }
  return group;
}
