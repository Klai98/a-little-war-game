import * as THREE from "three";
import { GameData } from "../gameData.js";
import { World3D } from "../world3d/world3d.js";
import { renderTopBar } from "./topBar.js";
import { renderCityPanel } from "./cityPanel.js";
import { renderArmyPanel } from "./armyPanel.js";
import { renderDiplomacyPanel } from "./diplomacyPanel.js";
import { findTerrainPath, pointAlongPath } from "../world3d/pathfinding.js";
import { isWalkable } from "../world3d/terrain.js";
import { drawCampaignMinimap } from "./minimap.js";
import { createStrategicMapView } from "./strategicMap.js?v=20260927";
import { MAP_SCALE } from "../worldConstants.js";

function cssColor(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export function startCampaignMap(root) {
  root.innerHTML = `
    <div class="campaign-map">
      <div class="viewport-container"></div>
      <div class="strategic-map-view"></div>
      <div class="marker-layer"></div>
      <div class="top-bar-slot"></div>
      <div class="side-panel"></div>
    </div>
  `;
  const viewportContainer = root.querySelector(".viewport-container");
  const markerLayer = root.querySelector(".marker-layer");
  const topBarSlot = root.querySelector(".top-bar-slot");
  const sidePanel = root.querySelector(".side-panel");

  const world = new World3D(viewportContainer);
  const strategicMap = createStrategicMapView(root.querySelector(".strategic-map-view"));
  strategicMap.element.addEventListener("wheel", (event) => {
    event.preventDefault();
    world.cameraRig.zoomBy(event.deltaY);
  }, { passive: false });
  strategicMap.element.addEventListener("click", (event) => {
    const target = strategicMap.hitTest(event);
    if (!target) return;
    if (target.armyId) onArmyClicked(target.armyId);
    else if (target.locationId) onLocationClicked(target.locationId);
    else if (target.position) issueGroundMove(target.position);
  });
  world.renderer.domElement.addEventListener("pointermove", (event) => {
    const canvas = world.renderer.domElement;
    if (!world.movementRangeMesh) {
      canvas.style.cursor = "";
      return;
    }
    const hit = world.pickGround(event);
    const valid = hit && isWalkable(hit.x, hit.z) && world.canMoveTo(hit);
    canvas.style.cursor = `url("../Cursors/${valid ? "move.png" : "move_oor.png"}") 8 8, crosshair`;
  });

  const cityMarkerEls = {};
  const resourceMarkerEls = {};
  const armyMarkerEls = {};
  let selectedArmyId = "";

  function buildCityMarkers() {
    for (const city of Object.values(GameData.cities)) {
      const el = document.createElement("button");
      el.className = "city-marker";
      el.innerHTML = '<span class="marker-owner"></span><span class="marker-label"></span>';
      el.querySelector(".marker-label").textContent = city.name;
      el.querySelector(".marker-owner").textContent = city.ownerId ? GameData.factions[city.ownerId].name : "中立";
      el.addEventListener("click", () => onLocationClicked(city.id));
      markerLayer.appendChild(el);
      cityMarkerEls[city.id] = el;
    }
    for (const site of Object.values(GameData.resourceSites)) {
      const el = document.createElement("button");
      el.className = "resource-marker";
      el.innerHTML = '<span class="resource-icon"></span><span class="marker-label"></span>';
      el.querySelector(".marker-label").textContent = site.name;
      el.addEventListener("click", () => onLocationClicked(site.id));
      markerLayer.appendChild(el);
      resourceMarkerEls[site.id] = el;
    }
    refreshCityMarkerStyles();
  }

  function refreshCityMarkerStyles() {
    for (const city of Object.values(GameData.cities)) {
      const el = cityMarkerEls[city.id];
      if (!el) continue;
      const color = city.ownerId ? GameData.factions[city.ownerId].color : 0x666666;
      el.style.setProperty("--faction-color", cssColor(color));
      el.querySelector(".marker-owner").textContent = city.ownerId ? GameData.factions[city.ownerId].name : "中立";
    }
    for (const site of Object.values(GameData.resourceSites)) {
      const el = resourceMarkerEls[site.id];
      if (!el) continue;
      const color = site.ownerId ? cssColor(GameData.factions[site.ownerId].color) : "#c4a35c";
      const icon = el.querySelector(".resource-icon");
      icon.style.background = color;
      icon.textContent = site.icon;
    }
    strategicMap.refreshTerritories();
  }

  function buildArmyMarkers() {
    markerLayer.querySelectorAll(".army-marker").forEach((el) => el.remove());
    for (const key in armyMarkerEls) delete armyMarkerEls[key];
    for (const army of Object.values(GameData.armies)) {
      const el = document.createElement("button");
      el.className = "army-marker";
      if (army.id === selectedArmyId) el.classList.add("is-selected");
      el.innerHTML = '<span class="marker-icon">军</span><span class="marker-count"></span>';
      el.querySelector(".marker-count").textContent = String(army.unitCount);
      el.style.setProperty("--faction-color", cssColor(GameData.factions[army.factionId].color));
      el.addEventListener("click", () => onArmyClicked(army.id));
      markerLayer.appendChild(el);
      armyMarkerEls[army.id] = el;
    }
    updateReachableCityMarkers();
  }

  function updateReachableCityMarkers() {
    const army = GameData.armies[selectedArmyId];
    for (const location of [...Object.values(GameData.cities), ...Object.values(GameData.resourceSites)]) {
      const marker = cityMarkerEls[location.id] ?? resourceMarkerEls[location.id];
      if (!marker) continue;
      marker.classList.remove("is-reachable", "is-assault", "is-out-of-range");
      marker.removeAttribute("data-move-cost");
    }
    const canCommand = Boolean(army && army.factionId === GameData.playerFactionId && army.movementPoints > 0 && !army.isMarching);
    viewportContainer.classList.toggle("army-command-mode", canCommand);
    world.setMovementRange(canCommand ? army : null);
  }

  function showMoveError(message) {
    sidePanel.classList.remove("army-hud-active");
    sidePanel.innerHTML = `<div class="side-panel-card"><h2>无法行军</h2><p>${message}</p><button class="close-btn">关闭</button></div>`;
    sidePanel.querySelector(".close-btn").addEventListener("click", closePanel);
  }

  function issueGroundMove(target) {
    const army = GameData.armies[selectedArmyId];
    if (!army || army.factionId !== GameData.playerFactionId || army.isMarching) return;
    if (!isWalkable(target.x, target.z)) return;
    if (!world.canMoveTo(target)) {
      showMoveError("目标超出本回合行动范围，或被河流、山脉阻断。");
      return;
    }
    const path = findTerrainPath(army.position, target);
    if (path.length < 2) {
      showMoveError("目标被河流、山脉或不可通行地形阻断。");
      return;
    }
    const result = GameData.issueArmyRoute(army.id, path, target);
    if (!result.ok) {
      showMoveError(result.reason);
      return;
    }
    openArmyPanel(army.id);
    buildArmyMarkers();
    world.refreshArmyRoutes();
    world.refreshCities();
    topBar.refresh();
  }

  function onGroundClicked(event) {
    const hit = world.pickGround(event);
    if (hit) issueGroundMove({ x: hit.x, z: hit.z });
  }

  function placeMarker(el, worldPos, halfWidth, halfHeight) {
    const { x, y, behind } = world.projectToScreen(worldPos);
    if (behind) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${x - halfWidth}px`;
    el.style.top = `${y - halfHeight}px`;
  }

  function placeTownMarker(el, worldPos, occupiedLabels, isPriority) {
    const { x, y, behind } = world.projectToScreen(worldPos);
    const width = viewportContainer.clientWidth;
    const height = viewportContainer.clientHeight;
    if (behind || x < 0 || x > width || y < 0 || y > height) {
      el.style.display = "none";
      return;
    }

    el.style.display = "";
    const labelWidth = el.offsetWidth || 126;
    const labelHeight = el.offsetHeight || 34;
    const candidates = [
      [x - labelWidth / 2, y - labelHeight - 9],
      [x - labelWidth / 2, y + 9],
      [x - labelWidth - 10, y - labelHeight / 2],
      [x + 10, y - labelHeight / 2],
      [x - labelWidth - 7, y - labelHeight - 5],
      [x + 7, y - labelHeight - 5],
    ];
    let best = null;
    for (let index = 0; index < candidates.length; index++) {
      const left = Math.max(3, Math.min(width - labelWidth - 3, candidates[index][0]));
      const top = Math.max(3, Math.min(height - labelHeight - 3, candidates[index][1]));
      const right = left + labelWidth;
      const bottom = top + labelHeight;
      let overlap = 0;
      for (const placed of occupiedLabels) {
        const intersectionWidth = Math.max(0, Math.min(right, placed.right) - Math.max(left, placed.left));
        const intersectionHeight = Math.max(0, Math.min(bottom, placed.bottom) - Math.max(top, placed.top));
        overlap += intersectionWidth * intersectionHeight;
      }
      const score = overlap + index * 0.01;
      if (!best || score < best.score) best = { left, top, right, bottom, overlap, score };
    }

    if (!isPriority && best.overlap > labelWidth * labelHeight * 0.18) {
      el.style.display = "none";
      return;
    }
    el.style.left = `${best.left}px`;
    el.style.top = `${best.top}px`;
    occupiedLabels.push(best);
  }

  function updateMarkerPositions() {
    const hideDistantNames = world.cameraRig.distance >= 360 * MAP_SCALE;
    const occupiedLabels = [];
    const citiesByPriority = Object.values(GameData.cities).sort((a, b) => {
      const score = (city) => (city.isCapital ? 2 : 0) + (city.ownerId === GameData.playerFactionId ? 1 : 0);
      return score(b) - score(a);
    });
    for (const city of citiesByPriority) {
      const el = cityMarkerEls[city.id];
      el.classList.toggle("is-far", hideDistantNames);
      el.classList.toggle("is-capital", city.isCapital);
      if (hideDistantNames && !city.isCapital) {
        el.style.display = "none";
        continue;
      }
      const h = world.heightAt(city.position.x, city.position.z);
      const pagodaTop = 2 + Math.ceil(city.level / 2) * 9.2;
      const townTop = Math.max(pagodaTop, city.level >= 2 ? 27 : 0) + 5;
      const worldPos = new THREE.Vector3(city.position.x, h + townTop * MAP_SCALE, city.position.z);
      placeTownMarker(el, worldPos, occupiedLabels, city.isCapital || city.ownerId === GameData.playerFactionId);
    }
    for (const site of Object.values(GameData.resourceSites)) {
      const el = resourceMarkerEls[site.id];
      el.classList.toggle("is-far", hideDistantNames);
      const h = world.heightAt(site.position.x, site.position.z);
      placeMarker(el, new THREE.Vector3(site.position.x, h + 24 * MAP_SCALE, site.position.z), 35, 16);
    }
    const cityArmyIndex = {};
    for (const army of Object.values(GameData.armies)) {
      const el = armyMarkerEls[army.id];
      if (!el) continue;
      const idx = cityArmyIndex[army.cityId] || 0;
      cityArmyIndex[army.cityId] = idx + 1;
      const h = world.heightAt(army.position.x, army.position.z);
      const worldPos = new THREE.Vector3(
        army.position.x - 15 + idx * 15,
        h + 38 * MAP_SCALE,
        army.position.z
      );
      placeMarker(el, worldPos, 20, 15);
    }
  }

  function onLocationClicked(locationId) {
    if (selectedArmyId) {
      const army = GameData.armies[selectedArmyId];
      if (army && army.factionId === GameData.playerFactionId) {
        const target = GameData.getStrategicLocation(locationId);
        if (army.isMarching || !isWalkable(target.position.x, target.position.z) || !world.canMoveTo(target.position)) {
          showMoveError("该地点不在本回合绿色可达区域内，或当前军队正在行军。");
          return;
        }
        const path = findTerrainPath(army.position, target.position);
        const result = GameData.issueArmyRoute(army.id, path, locationId);
        if (!result.ok) {
          showMoveError(result.reason);
          return;
        }
        selectedArmyId = army.id;
        openArmyPanel(army.id);
        buildArmyMarkers();
        world.refreshArmyRoutes();
        world.refreshCities();
        topBar.refresh();
        return;
      }
    }
    if (GameData.cities[locationId]) openCityPanel(locationId);
    else openResourcePanel(locationId);
  }

  function openResourcePanel(siteId) {
    sidePanel.classList.remove("army-hud-active");
    const site = GameData.resourceSites[siteId];
    const owner = site.ownerId ? GameData.factions[site.ownerId].name : "中立";
    sidePanel.innerHTML = `<div class="side-panel-card resource-panel"><div class="panel-kicker">战略资源点 · ${site.resourceName}</div><h2>${site.name}</h2><p>控制方：${owner}</p><p>占领后每回合获得 <b class="resource-income">+${site.income} 金币</b></p><p class="hint">派遣军队行军至此即可接管资源。资源点不提供驻军补给。</p><button class="close-btn">关闭</button></div>`;
    sidePanel.querySelector(".close-btn").addEventListener("click", closePanel);
  }

  function showBattleResult(result) {
    sidePanel.classList.remove("army-hud-active");
    const title = result.attackerWon ? "攻城得胜" : "进攻受挫";
    const headline = result.attackerWon ? `${result.cityName} 已归我军控制` : `我军未能攻下${result.cityName}`;
    sidePanel.innerHTML = `<div class="side-panel-card battle-result ${result.attackerWon ? "victory" : "defeat"}">
      <div class="panel-kicker">战斗结报 · ${title}</div><h2>${headline}</h2>
      <div class="battle-clash"><span>⚔</span><i></i><b>${result.attackerWon ? "胜" : "败"}</b></div>
      <div class="battle-score"><span>我军战力 <b>${result.attackPower}</b></span><span>守军战力 <b>${result.defensePower}</b></span></div>
      <p>我军伤亡约 ${result.attackerLoss}% · 敌军伤亡约 ${result.defenderLoss}%</p>
      <p class="hint">将领记录了此战，残部已经${result.attackerWon ? "进驻城中" : "撤回己方城池"}。</p>
      <button class="close-btn">继续战役</button></div>`;
    sidePanel.querySelector(".close-btn").addEventListener("click", closePanel);
  }

  function onArmyClicked(armyId) {
    const army = GameData.armies[armyId];
    if (army.factionId === GameData.playerFactionId) {
      selectedArmyId = armyId;
      Object.values(armyMarkerEls).forEach((marker) => marker.classList.remove("is-selected"));
      armyMarkerEls[armyId]?.classList.add("is-selected");
    } else {
      selectedArmyId = "";
      Object.values(armyMarkerEls).forEach((marker) => marker.classList.remove("is-selected"));
    }
    updateReachableCityMarkers();
    openArmyPanel(armyId);
  }

  function closePanel() {
    sidePanel.classList.remove("army-hud-active");
    sidePanel.innerHTML = "";
  }

  function openCityPanel(cityId) {
    sidePanel.classList.remove("army-hud-active");
    renderCityPanel(sidePanel, GameData.cities[cityId], {
      onRecruit: (id, unitId) => {
        const result = GameData.recruitUnit(GameData.playerFactionId, id, unitId);
        if (!result.ok) {
          sidePanel.querySelector(".recruit-hint").textContent = result.reason;
          return;
        }
        buildArmyMarkers();
        world.refreshCities();
        topBar.refresh();
        openCityPanel(id);
      },
      onBuild: (id, type) => {
        GameData.buildBuilding(GameData.playerFactionId, id, type);
        world.refreshCities();
        topBar.refresh();
        openCityPanel(id);
      },
      onClose: closePanel,
    });
  }

  function openArmyPanel(armyId) {
    sidePanel.classList.add("army-hud-active");
    renderArmyPanel(sidePanel, GameData.armies[armyId], {
      onClose: closePanel,
      isSelected: selectedArmyId === armyId,
      cameraRig: world.cameraRig,
    });
  }

  function updateArmyTravel(delta) {
    for (const army of Object.values(GameData.armies)) {
      if (!army.routePath || !army.isMarching) continue;
      army.visualProgress = Math.min(army.routeProgress, army.visualProgress + delta * 58 * MAP_SCALE);
      army.position = pointAlongPath(army.routePath, army.visualProgress);
    }
  }

  function settleArmyArrivals() {
    let changed = false;
    for (const army of Object.values(GameData.armies)) {
      if (!army.routePath || army.routeProgress < army.routeDistance - 0.01 || army.visualProgress < army.routeDistance - 0.01) continue;
      const groundTarget = army.routeTargetId === "__ground__";
      const destination = groundTarget ? null : GameData.getStrategicLocation(army.routeTargetId);
      if (!destination && !groundTarget) continue;
      if (destination && GameData.cities[destination.id] && army.routeBattlePending && destination.ownerId && destination.ownerId !== army.factionId) {
        const result = GameData.resolveBattle(army.id, destination.id);
        if (result.ok && army.factionId === GameData.playerFactionId) showBattleResult(result);
      } else if (groundTarget) {
        army.position = { ...army.routeTargetPosition };
        army.cityId = "";
        army.locationId = "";
      } else {
        destination.ownerId = army.factionId;
        army.locationId = destination.id;
        if (GameData.cities[destination.id]) {
          army.cityId = destination.id;
          army.position = { ...destination.position };
        } else {
          army.cityId = "";
          army.position = { ...destination.position };
        }
      }
      const current = GameData.armies[army.id];
      if (current) {
        current.routePath = null;
        current.routeDistance = 0;
        current.routeProgress = 0;
        current.visualProgress = 0;
        current.routeTargetId = "";
        current.routeTargetPosition = null;
        current.routeBattlePending = false;
        current.isMarching = false;
      }
      changed = true;
    }
    if (!changed) return;
    buildArmyMarkers();
    refreshCityMarkerStyles();
    world.refreshArmyRoutes();
    world.refreshCities();
    topBar.refresh();
    if (selectedArmyId && GameData.armies[selectedArmyId] && sidePanel.querySelector(".army-panel-card")) {
      openArmyPanel(selectedArmyId);
    }
  }

  const topBar = renderTopBar(topBarSlot, {
    onDiplomacy: () => {
      sidePanel.classList.remove("army-hud-active");
      renderDiplomacyPanel(sidePanel, GameData.playerFactionId, { onClose: closePanel });
    },
    onEndTurn: () => {
      GameData.endTurn();
      topBar.refresh();
      refreshCityMarkerStyles();
      world.refreshCities();
      world.refreshArmyRoutes();
      buildArmyMarkers();
      if (selectedArmyId && sidePanel.querySelector(".army-panel-card")) openArmyPanel(selectedArmyId);
    },
  });

  buildCityMarkers();
  buildArmyMarkers();
  world.renderer.domElement.addEventListener("click", onGroundClicked);
  topBar.refresh();

  let lastTime = performance.now();
  let minimapElapsed = 0;
  let strategicMode = false;
  function loop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    updateArmyTravel(delta);
    settleArmyArrivals();
    world.update(delta);
    const showStrategicMap = world.cameraRig.isStrategicView;
    if (showStrategicMap !== strategicMode) {
      strategicMode = showStrategicMap;
      root.querySelector(".campaign-map").classList.toggle("is-strategic", strategicMode);
      if (strategicMode) strategicMap.resize();
      strategicMap.invalidate();
    }
    if (strategicMode && (minimapElapsed >= 0.2 || strategicMap.dirty)) {
      strategicMap.invalidate();
      strategicMap.render();
    }
    updateMarkerPositions();
    minimapElapsed += delta;
    if (minimapElapsed >= 0.2) {
      const minimap = sidePanel.querySelector(".campaign-minimap");
      if (minimap) drawCampaignMinimap(minimap, world.cameraRig);
      minimapElapsed = 0;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
