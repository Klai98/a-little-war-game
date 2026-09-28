import { GameData } from "../gameData.js";
import { MAP_WIDTH, MAP_DEPTH, LAND_OUTLINE, RIVER_PATHS } from "../world3d/terrain.js";

const PROVINCES = [
  ["凉州", 210, 500], ["并州", 610, 440], ["幽州", 1110, 190], ["冀州", 1010, 480],
  ["青州", 1580, 560], ["兖州", 1320, 790], ["徐州", 1570, 940], ["豫州", 1110, 990],
  ["司隶", 770, 790], ["荆州", 790, 1240], ["扬州", 1450, 1300], ["益州", 360, 1220], ["交州", 1170, 1530],
];

function factionColor(factionId) {
  return GameData.factions[factionId]?.color ?? 0x8b8374;
}

function clipByBisector(polygon, site, other) {
  const dx = other.x - site.x;
  const dz = other.z - site.z;
  const limit = other.x * other.x + other.z * other.z - site.x * site.x - site.z * site.z;
  const result = [];
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const currentSide = 2 * (current.x * dx + current.z * dz) - limit;
    const nextSide = 2 * (next.x * dx + next.z * dz) - limit;
    const currentInside = currentSide <= 0;
    const nextInside = nextSide <= 0;
    if (currentInside) result.push(current);
    if (currentInside !== nextInside) {
      const t = currentSide / (currentSide - nextSide);
      result.push({ x: current.x + (next.x - current.x) * t, z: current.z + (next.z - current.z) * t });
    }
  }
  return result;
}

function polygonAreaAndCenter(polygon) {
  let twiceArea = 0;
  let centerX = 0;
  let centerZ = 0;
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const cross = current.x * next.z - next.x * current.z;
    twiceArea += cross;
    centerX += (current.x + next.x) * cross;
    centerZ += (current.z + next.z) * cross;
  }
  if (Math.abs(twiceArea) < 1e-8) return { area: 0, x: 0, z: 0 };
  return { area: Math.abs(twiceArea) * 0.5, x: centerX / (3 * twiceArea), z: centerZ / (3 * twiceArea) };
}

export function createStrategicMapView(container) {
  const canvas = document.createElement("canvas");
  canvas.className = "strategic-map-canvas";
  container.appendChild(canvas);
  const context = canvas.getContext("2d");
  let dirty = true;
  let regions = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let mapBounds = { x: 0, y: 0, width: 0, height: 0 };

  function rebuildTerritories() {
    const cities = Object.values(GameData.cities);
    regions = cities.map((city, cityIndex) => {
      const site = { x: city.position.x / MAP_WIDTH, z: city.position.z / MAP_DEPTH };
      let polygon = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 1 }, { x: 0, z: 1 }];
      for (let otherIndex = 0; otherIndex < cities.length && polygon.length; otherIndex++) {
        if (otherIndex === cityIndex) continue;
        const otherCity = cities[otherIndex];
        const other = { x: otherCity.position.x / MAP_WIDTH, z: otherCity.position.z / MAP_DEPTH };
        polygon = clipByBisector(polygon, site, other);
      }
      return { city, polygon, ...polygonAreaAndCenter(polygon) };
    });
    dirty = true;
  }

  function resize() {
    const bounds = container.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    dirty = true;
  }

  function render() {
    if (!dirty && mapImage.complete) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#abc8d1";
    context.fillRect(0, 0, width, height);
    const mapAspect = MAP_WIDTH / MAP_DEPTH;
    const mapWidth = Math.min(width, height * mapAspect);
    const mapHeight = mapWidth / mapAspect;
    const mapX = (width - mapWidth) * 0.5;
    const mapY = (height - mapHeight) * 0.5;
    mapBounds = { x: mapX, y: mapY, width: mapWidth, height: mapHeight };
    const pointOnMap = (point) => ({ x: mapX + point[0] * mapWidth, y: mapY + point[1] * mapHeight });
    context.save();
    context.beginPath();
    LAND_OUTLINE.forEach((point, index) => {
      const mapped = pointOnMap(point);
      if (index === 0) context.moveTo(mapped.x, mapped.y);
      else context.lineTo(mapped.x, mapped.y);
    });
    context.closePath();
    const landGradient = context.createLinearGradient(mapX, mapY, mapX + mapWidth, mapY + mapHeight);
    landGradient.addColorStop(0, "#ded5bb");
    landGradient.addColorStop(0.52, "#d5d0b7");
    landGradient.addColorStop(1, "#d7c9a7");
    context.fillStyle = landGradient;
    context.fill();
    context.strokeStyle = "#3c3b33";
    context.lineWidth = Math.max(1.4, mapWidth / 650);
    context.stroke();
    context.clip();

    for (const region of regions) {
      if (region.polygon.length < 3) continue;
      context.beginPath();
      region.polygon.forEach((point, index) => {
        const x = mapX + point.x * mapWidth;
        const y = mapY + point.z * mapHeight;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.fillStyle = region.city.ownerId
        ? `#${factionColor(region.city.ownerId).toString(16).padStart(6, "0")}88`
        : "rgba(139, 133, 115, 0.18)";
      context.fill();
      context.lineWidth = Math.max(0.7, mapWidth / 1100);
      context.strokeStyle = "rgba(43, 40, 33, 0.74)";
      context.stroke();

      const areaPixels = region.area * mapWidth * mapHeight;
      if (region.city.ownerId && areaPixels > 720) {
        const faction = GameData.factions[region.city.ownerId];
        const x = mapX + region.x * mapWidth;
        const y = mapY + region.z * mapHeight;
        context.font = `600 ${Math.max(8, Math.min(14, mapWidth / 88))}px 'Microsoft YaHei', sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineWidth = 3;
        context.strokeStyle = "rgba(242, 233, 211, 0.86)";
        context.strokeText(faction.name, x, y);
        context.fillStyle = `#${faction.color.toString(16).padStart(6, "0")}`;
        context.fillText(faction.name, x, y);
      }
    }

    for (const river of RIVER_PATHS) {
      context.beginPath();
      river.forEach(([x, z], index) => {
        const px = mapX + (x / MAP_WIDTH) * mapWidth;
        const py = mapY + (z / MAP_DEPTH) * mapHeight;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.lineWidth = Math.max(2, mapWidth / 170);
      context.strokeStyle = "rgba(83, 145, 166, 0.88)";
      context.stroke();
      context.lineWidth = Math.max(0.8, mapWidth / 700);
      context.strokeStyle = "rgba(220, 234, 220, 0.74)";
      context.stroke();
    }
    context.restore();

    for (const [name, baseX, baseZ] of PROVINCES) {
      const x = mapX + (baseX / 2000) * mapWidth;
      const y = mapY + (baseZ / 1640) * mapHeight;
      context.font = `600 ${Math.max(11, Math.min(19, width / 72))}px 'Microsoft YaHei', sans-serif`;
      context.textAlign = "center";
      context.lineWidth = 3;
      context.strokeStyle = "rgba(241, 232, 210, 0.88)";
      context.strokeText(name, x, y);
      context.fillStyle = "#302b24";
      context.fillText(name, x, y);
    }

    const radius = Math.max(2.2, Math.min(5, mapWidth / 260));
    for (const city of Object.values(GameData.cities)) {
      const x = mapX + (city.position.x / MAP_WIDTH) * mapWidth;
      const y = mapY + (city.position.z / MAP_DEPTH) * mapHeight;
      const color = `#${factionColor(city.ownerId).toString(16).padStart(6, "0")}`;
      context.beginPath();
      context.arc(x, y, city.isCapital ? radius * 1.45 : radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = city.isCapital ? 2 : 1;
      context.strokeStyle = "#f3ead5";
      context.stroke();
      if (city.isCapital) {
        context.font = `600 ${Math.max(10, Math.min(15, width / 95))}px 'Microsoft YaHei', sans-serif`;
        context.textAlign = "left";
        context.lineWidth = 3;
        context.strokeStyle = "rgba(244, 235, 214, 0.92)";
        context.strokeText(city.name, x + radius * 1.8, y - radius * 1.1);
        context.fillStyle = "#29251f";
        context.fillText(city.name, x + radius * 1.8, y - radius * 1.1);
      }
    }

    for (const army of Object.values(GameData.armies)) {
      const x = mapX + (army.position.x / MAP_WIDTH) * mapWidth;
      const y = mapY + (army.position.z / MAP_DEPTH) * mapHeight;
      const size = Math.max(7, radius * 2.2);
      context.fillStyle = `#${factionColor(army.factionId).toString(16).padStart(6, "0")}`;
      context.fillRect(x - size / 2, y - size / 2, size, size);
      context.strokeStyle = "#1e1b17";
      context.lineWidth = 1.5;
      context.strokeRect(x - size / 2, y - size / 2, size, size);
    }

    const factions = Object.values(GameData.factions);
    const columns = width < 620 ? 2 : 4;
    const itemWidth = Math.min(150, (width - 28) / columns);
    const legendY = height - 18 - Math.ceil(factions.length / columns) * 27;
    context.fillStyle = "rgba(31, 35, 33, 0.8)";
    context.fillRect(12, legendY - 36, Math.min(width - 24, itemWidth * columns + 20), Math.ceil(factions.length / columns) * 27 + 46);
    context.font = "600 13px 'Microsoft YaHei', sans-serif";
    context.textAlign = "left";
    context.fillStyle = "#f2e7cf";
    context.fillText("城镇分区 · 阵营控制", 22, legendY - 14);
    factions.forEach((faction, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 22 + col * itemWidth;
      const y = legendY + row * 27;
      context.fillStyle = `#${faction.color.toString(16).padStart(6, "0")}`;
      context.fillRect(x, y - 11, 13, 13);
      context.fillStyle = "#f2e7cf";
      context.font = "12px 'Microsoft YaHei', sans-serif";
      context.fillText(faction.name, x + 19, y);
    });
    dirty = false;
  }

  function hitTest(event) {
    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (localX < mapBounds.x || localX > mapBounds.x + mapBounds.width || localY < mapBounds.y || localY > mapBounds.y + mapBounds.height) return null;
    const position = {
      x: ((localX - mapBounds.x) / mapBounds.width) * MAP_WIDTH,
      z: ((localY - mapBounds.y) / mapBounds.height) * MAP_DEPTH,
    };
    let nearest = null;
    let nearestDistance = Infinity;
    for (const army of Object.values(GameData.armies)) {
      const dx = ((army.position.x - position.x) / MAP_WIDTH) * mapBounds.width;
      const dz = ((army.position.z - position.z) / MAP_DEPTH) * mapBounds.height;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearest = { armyId: army.id };
        nearestDistance = distance;
      }
    }
    if (nearest && nearestDistance <= 14) return nearest;
    for (const city of Object.values(GameData.cities)) {
      const dx = ((city.position.x - position.x) / MAP_WIDTH) * mapBounds.width;
      const dz = ((city.position.z - position.z) / MAP_DEPTH) * mapBounds.height;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearest = { locationId: city.id };
        nearestDistance = distance;
      }
    }
    if (nearest && nearestDistance <= 14) return nearest;
    for (const site of Object.values(GameData.resourceSites)) {
      const dx = ((site.position.x - position.x) / MAP_WIDTH) * mapBounds.width;
      const dz = ((site.position.z - position.z) / MAP_DEPTH) * mapBounds.height;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearest = { locationId: site.id };
        nearestDistance = distance;
      }
    }
    if (nearest && nearestDistance <= 14) return nearest;
    return { position };
  }

  rebuildTerritories();
  resize();
  window.addEventListener("resize", resize);

  return {
    element: canvas,
    refreshTerritories: rebuildTerritories,
    hitTest,
    resize,
    render,
    invalidate() { dirty = true; },
    get dirty() { return dirty; },
  };
}