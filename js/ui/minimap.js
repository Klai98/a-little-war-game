import { GameData } from "../gameData.js";
import { MAP_WIDTH, MAP_DEPTH, RIVER_PATHS, LAND_OUTLINE } from "../world3d/terrain.js";

export function drawCampaignMinimap(canvas, cameraRig) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#14252c";
  context.fillRect(0, 0, width, height);
  const padding = 8;
  const mapWidth = width - padding * 2;
  const mapHeight = height - padding * 2;
  const xy = ([x, z]) => [padding + x * mapWidth, padding + z * mapHeight];

  context.beginPath();
  LAND_OUTLINE.forEach((point, index) => {
    const [x, y] = xy(point);
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = "#62644b";
  context.strokeStyle = "#b49b68";
  context.lineWidth = 1.5;
  context.fill();
  context.stroke();

  const worldPoint = (x, z) => [padding + x / MAP_WIDTH * mapWidth, padding + z / MAP_DEPTH * mapHeight];
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#568e9d";
  context.lineWidth = 1.5;
  for (const river of RIVER_PATHS) {
    context.beginPath();
    river.forEach(([x, z], index) => {
      const point = worldPoint(x, z);
      if (index === 0) context.moveTo(...point); else context.lineTo(...point);
    });
    context.stroke();
  }

  for (const site of Object.values(GameData.resourceSites ?? {})) {
    const [x, y] = worldPoint(site.position.x, site.position.z);
    context.fillStyle = site.ownerId ? `#${GameData.factions[site.ownerId].color.toString(16).padStart(6, "0")}` : "#e7c36c";
    context.beginPath();
    context.moveTo(x, y - 3.2);
    context.lineTo(x + 3.2, y);
    context.lineTo(x, y + 3.2);
    context.lineTo(x - 3.2, y);
    context.closePath();
    context.fill();
  }
  for (const city of Object.values(GameData.cities)) {
    const [x, y] = worldPoint(city.position.x, city.position.z);
    context.fillStyle = city.ownerId ? `#${GameData.factions[city.ownerId].color.toString(16).padStart(6, "0")}` : "#d3c9ac";
    context.beginPath();
    context.arc(x, y, city.isCapital ? 2.6 : 1.7, 0, Math.PI * 2);
    context.fill();
  }
  for (const army of Object.values(GameData.armies)) {
    if (!army.routePath) continue;
    context.beginPath();
    army.routePath.forEach((point, index) => {
      const [x, y] = worldPoint(point.x, point.z);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.setLineDash([3, 2]);
    context.strokeStyle = `#${GameData.factions[army.factionId].color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 1;
    context.stroke();
    context.setLineDash([]);
  }

  for (const army of Object.values(GameData.armies)) {
    const [x, y] = worldPoint(army.position.x, army.position.z);
    context.fillStyle = `#${GameData.factions[army.factionId].color.toString(16).padStart(6, "0")}`;
    context.strokeStyle = "#f1dfad";
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(x, y, 2.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  if (cameraRig) {
    const viewportDepth = 2 * cameraRig.distance * Math.tan(Math.PI / 8) / Math.sin(Math.abs(cameraRig.pitch));
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const viewportWidth = viewportDepth * aspect;
    const [cx, cy] = worldPoint(cameraRig.target.x, cameraRig.target.z);
    const w = viewportWidth / MAP_WIDTH * mapWidth;
    const h = viewportDepth / MAP_DEPTH * mapHeight;
    context.strokeStyle = "#fff0c5";
    context.lineWidth = 1.5;
    context.setLineDash([4, 2]);
    context.strokeRect(cx - w / 2, cy - h / 2, w, h);
    context.setLineDash([]);
  }
}
