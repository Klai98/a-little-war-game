import * as THREE from "three";
import { MAP_SCALE } from "../worldConstants.js";

function piece(group, geometry, material, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
  group.add(mesh);
  return mesh;
}

// A readable campaign-scale commander: lamellar armor, plume, sword and the faction's banner.
export function buildArmyGeneral(factionColor) {
  const root = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x604832, metalness: 0.52, roughness: 0.45 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xc59a4c, metalness: 0.58, roughness: 0.34 });
  const cloth = new THREE.MeshStandardMaterial({ color: factionColor, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252321, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc99570, roughness: 0.88 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9e3126, roughness: 0.84 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xbac5c8, metalness: 0.82, roughness: 0.24 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b321f, roughness: 0.8 });
  const legs = [];
  const arms = [];

  legs.push(piece(root, new THREE.BoxGeometry(2.4, 5.2, 2.8), dark, [-1.1, 3, 0]));
  legs.push(piece(root, new THREE.BoxGeometry(2.4, 5.2, 2.8), dark, [1.1, 3, 0]));
  piece(root, new THREE.BoxGeometry(5.4, 6.6, 3.4), cloth, [0, 8.6, 0]);
  piece(root, new THREE.BoxGeometry(5.8, 5.2, 3.9), armor, [0, 9, 0.25]);
  for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) {
    piece(root, new THREE.BoxGeometry(1.55, 0.75, 0.25), bronze,
      [col * 1.65, 10.4 - row * 1.4, 2.25]);
  }
  for (const side of [-1, 1]) {
    piece(root, new THREE.SphereGeometry(1.2, 8, 6), armor, [side * 3.1, 10.8, 0]);
    arms.push(piece(root, new THREE.CylinderGeometry(0.75, 0.62, 5.4, 7), armor,
      [side * 3.35, 8, 0.25], [0, 0, side * 0.24]));
    piece(root, new THREE.SphereGeometry(0.72, 7, 6), skin, [side * 3.55, 5.2, 0.55]);
  }
  piece(root, new THREE.CylinderGeometry(0.68, 0.8, 2.1, 8), skin, [0, 13, 0]);
  piece(root, new THREE.SphereGeometry(1.6, 9, 7), skin, [0, 15.1, 0.1]);
  piece(root, new THREE.SphereGeometry(2, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2), armor, [0, 16.2, 0]);
  piece(root, new THREE.BoxGeometry(3.8, 0.65, 3.1), armor, [0, 14.9, 0.1]);
  piece(root, new THREE.ConeGeometry(0.8, 3.5, 6), red, [0, 18.2, -0.15], [0.15, 0, 0.32]);

  // The left hand carries a tall standard with a cloth panel bearing a simple gold device.
  piece(root, new THREE.CylinderGeometry(0.22, 0.28, 30, 7), wood, [-4.8, 16.2, -0.2], [0, 0, -0.1]);
  const flag = piece(root, new THREE.PlaneGeometry(7.2, 5.2), cloth, [-8.1, 25.6, -0.2]);
  flag.material = cloth.clone();
  flag.material.side = THREE.DoubleSide;
  flag.userData.baseRotation = flag.rotation.y;
  piece(root, new THREE.BoxGeometry(0.75, 3.5, 0.3), bronze, [-8.1, 25.6, 0.05]);
  piece(root, new THREE.BoxGeometry(3.5, 0.7, 0.3), bronze, [-8.1, 25.6, 0.05]);
  const pennantTip = piece(root, new THREE.ConeGeometry(0.55, 1.7, 5), bronze, [-4.8, 32, -0.2]);

  // The right hand holds a bright, upswept sword so it remains legible at campaign zoom.
  piece(root, new THREE.CylinderGeometry(0.28, 0.32, 2, 7), wood, [4.1, 5.1, 1.2], [0, 0, -0.35]);
  piece(root, new THREE.BoxGeometry(3.4, 0.55, 0.7), bronze, [4.1, 6.4, 1.2], [0, 0, -0.35]);
  piece(root, new THREE.BoxGeometry(0.72, 8.2, 0.34), steel, [5, 10.4, 1.2], [0, 0, -0.35]);
  piece(root, new THREE.ConeGeometry(0.48, 2.5, 4), steel, [6.45, 14.4, 1.2], [0, 0, -0.35]);

  root.userData.flag = flag;
  root.userData.pennantTip = pennantTip;
  root.userData.legs = legs;
  root.userData.arms = arms;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.scale.setScalar(0.8 * MAP_SCALE);
  return root;
}

export function animateArmyGeneral(model, timeSeconds, isMoving) {
  const phase = timeSeconds * (isMoving ? 5.5 : 1.6) + model.userData.phase;
  model.userData.flag.rotation.y = Math.sin(phase) * 0.13;
  model.userData.flag.rotation.z = Math.sin(phase * 0.75) * 0.045;
  model.userData.pennantTip.rotation.z = Math.sin(phase * 0.75) * 0.025;
  model.userData.legs.forEach((leg, index) => {
    leg.rotation.x = isMoving ? Math.sin(phase * 2 + index * Math.PI) * 0.22 : 0;
  });
  model.userData.arms.forEach((arm, index) => {
    arm.rotation.x = isMoving ? Math.sin(phase * 2 + index * Math.PI + 0.5) * 0.1 : 0;
  });
  model.position.y = model.userData.baseY + Math.sin(phase * 2) * (isMoving ? 0.12 : 0.025);
}
