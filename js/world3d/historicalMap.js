import * as THREE from "three";
import { getHeight } from "./terrain.js";
import { MAP_SCALE, MAP_SPREAD } from "../worldConstants.js?v=20260928";

const PROVINCES = [
  { name: "凉州", x: 210, z: 500 },
  { name: "并州", x: 610, z: 440 },
  { name: "幽州", x: 1110, z: 190 },
  { name: "冀州", x: 1010, z: 480 },
  { name: "青州", x: 1580, z: 560 },
  { name: "兖州", x: 1320, z: 790 },
  { name: "徐州", x: 1570, z: 940 },
  { name: "豫州", x: 1110, z: 990 },
  { name: "司隶", x: 770, z: 790 },
  { name: "荆州", x: 790, z: 1240 },
  { name: "扬州", x: 1450, z: 1300 },
  { name: "益州", x: 360, z: 1220 },
  { name: "交州", x: 1170, z: 1530 },
];

const BORDERS = [
  [[185, 360], [330, 405], [470, 385], [590, 420], [735, 385], [875, 340]],
  [[220, 560], [365, 590], [495, 650], [610, 690], [735, 670], [845, 715]],
  [[590, 340], [620, 475], [680, 595], [650, 710], [700, 825], [665, 945]],
  [[755, 290], [820, 385], [895, 470], [875, 585], [930, 690], [895, 800]],
  [[875, 420], [1015, 400], [1150, 445], [1310, 430], [1480, 475], [1670, 450]],
  [[930, 690], [1050, 665], [1180, 700], [1310, 670], [1440, 720], [1580, 690]],
  [[1190, 700], [1215, 830], [1320, 920], [1410, 1015], [1490, 1110]],
  [[890, 800], [1005, 855], [1100, 920], [1220, 950], [1350, 930]],
  [[650, 945], [760, 930], [870, 980], [1005, 1015], [1100, 1075]],
  [[490, 1010], [625, 1025], [760, 1080], [890, 1115], [1020, 1150]],
  [[990, 1160], [1110, 1205], [1240, 1230], [1370, 1270], [1540, 1280], [1690, 1250]],
  [[280, 1050], [395, 1110], [505, 1180], [610, 1280], [700, 1390]],
  [[650, 1380], [820, 1420], [980, 1450], [1140, 1485], [1320, 1500], [1510, 1490]],
  [[1390, 500], [1435, 610], [1410, 710], [1480, 800], [1450, 900]],
];

function buildProvinceLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.font = "bold 48px 'STSong', 'SimSun', serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(245, 235, 208, 0.82)";
  context.lineWidth = 7;
  context.strokeText(name, 128, 48);
  context.fillStyle = "rgba(45, 39, 29, 0.78)";
  context.fillText(name, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    sizeAttenuation: true,
  }));
  sprite.scale.set(82 * MAP_SCALE, 31 * MAP_SCALE, 1);
  sprite.renderOrder = 5;
  return sprite;
}

export function buildHistoricalMapLayer() {
  const group = new THREE.Group();
  const borderMaterial = new THREE.LineBasicMaterial({
    color: 0x453c2e,
    transparent: true,
    opacity: 0.56,
    depthTest: false,
  });

  for (const border of BORDERS) {
    const points = border.map(([baseX, baseZ]) => {
      const x = baseX * MAP_SPREAD * MAP_SCALE;
      const z = baseZ * MAP_SPREAD * MAP_SCALE;
      return new THREE.Vector3(x, getHeight(x, z) + 2.5 * MAP_SCALE, z);
    });
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.35);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(points.length * 5));
    const line = new THREE.Line(geometry, borderMaterial);
    line.renderOrder = 4;
    group.add(line);
  }

  for (const province of PROVINCES) {
    const x = province.x * MAP_SPREAD * MAP_SCALE;
    const z = province.z * MAP_SPREAD * MAP_SCALE;
    const label = buildProvinceLabel(province.name);
    label.position.set(x, getHeight(x, z) + 48 * MAP_SCALE, z);
    group.add(label);
  }

  return group;
}
