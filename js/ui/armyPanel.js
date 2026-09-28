import { GameData, UNIT_ROSTERS } from "../gameData.js";
import { drawCampaignMinimap } from "./minimap.js";
import { MAP_SCALE } from "../worldConstants.js";

function generalPortrait(color) {
  const fill = `#${color.toString(16).padStart(6, "0")}`;
  return `<svg viewBox="0 0 140 160" role="img" aria-label="将军肖像">
    <defs><linearGradient id="portrait-bg" x2="0" y2="1"><stop stop-color="#8f9f91"/><stop offset="1" stop-color="#394537"/></linearGradient></defs>
    <rect width="140" height="160" fill="url(#portrait-bg)"/>
    <path d="M0 138 29 105l27 10 28-15 56 28v32H0z" fill="#28312e"/>
    <path d="M35 160q2-35 24-43l11-5 12 0 19 9q12 8 15 39" fill="${fill}" stroke="#c6a15d" stroke-width="3"/>
    <path d="m54 98 16 18 16-18 8 15-24 20-25-20z" fill="#e2c894"/>
    <ellipse cx="70" cy="69" rx="25" ry="31" fill="#c99470"/>
    <path d="M43 61q1-36 28-38 26 2 29 39l-8 7-5-25q-16 9-42 4l-1 25z" fill="#745439" stroke="#c39b5b" stroke-width="4"/>
    <path d="M57 39q7-23 21-29 1 17 19 27" fill="none" stroke="#a53627" stroke-width="9" stroke-linecap="round"/>
    <path d="M55 68h9m17 0h9" stroke="#302820" stroke-width="3"/><path d="M64 88q7 5 14 0" fill="none" stroke="#633c31" stroke-width="2"/>
    <path d="m47 107 23 21 22-21" fill="none" stroke="#d5b66e" stroke-width="2"/>
  </svg>`;
}

export function renderArmyPanel(container, army, { onClose, isSelected = false, cameraRig = null }) {
  const faction = GameData.factions[army.factionId];
  const roster = UNIT_ROSTERS[army.factionId];
  const general = army.general ?? { name: "无名军士", rank: "行伍出身", level: 1, recoveryBonus: 0, isFamous: false };
  const panel = document.createElement("div");
  panel.className = "army-hud side-panel-card";
  panel.innerHTML = `
    <section class="army-commander-column">
      <div class="hud-heading">${general.isFamous ? "名将" : "军团将领"}</div>
      <div class="general-portrait" style="--general-color:#${faction.color.toString(16).padStart(6, "0")}">${generalPortrait(faction.color)}<span class="general-level">Lv.${general.level}</span></div>
      <h2>${general.name}</h2><div class="general-rank">${general.rank} · ${faction.name}</div>
      <div class="general-effect"><span>驻地缺员恢复</span><b>${Math.round((army.baseRecoveryRate + (general.recoveryBonus ?? 0)) * 100)}%/回合</b></div>
      <button class="close-btn">收起</button>
    </section>
    <section class="army-roster-column">
      <div class="roster-heading"><div><span class="hud-heading">${army.name}</span><h2>军团编制</h2></div>
        <div class="roster-health"><b>${army.units.reduce((sum, unit) => sum + unit.soldiers, 0).toLocaleString()}</b> 当前兵员<span>/ ${army.units.reduce((sum, unit) => sum + (roster.find((item) => item.id === unit.unitId)?.size ?? 0), 0).toLocaleString()} 编制</span></div>
      </div>
      <div class="army-meters"><span>战力 <b>${army.strength}</b></span><span>士气 <b>${army.morale}%</b></span><span>经验 <b>${army.experience}</b></span></div>
      <div class="unit-card-rail"></div>
      <div class="movement-panel"><div><b>本回合行动点</b><strong>${army.movementPoints} <small>/ ${army.movementPointsMax}</small></strong></div>
        <div class="movement-bar"><i style="width:${Math.round(army.movementPoints / Math.max(1, army.movementPointsMax) * 100)}%"></i></div>
        ${army.routeTargetId ? `<span class="route-destination">行军目的地：${GameData.getStrategicLocation(army.routeTargetId)?.name ?? "未知"}${army.routeDistance ? ` · 路线进度 ${Math.floor(army.routeProgress / army.routeDistance * 100)}%` : ""}</span>` : ""}
        <small>${isSelected ? "已选中：地图高亮显示行军花费；将领会沿虚线路线行军" : `点击军团标记选中 · 每 ${Math.round(55 * MAP_SCALE)} 地图距离消耗 1 点`} · 兵员在己方城镇休整时恢复，行军/境外驻军不恢复</small></div>
    </section>
    <section class="army-minimap-column">
      <div class="hud-heading">战役地图 <small>当前镜头位置</small></div>
      <canvas class="campaign-minimap" aria-label="战役地图缩略图"></canvas>
      <div class="minimap-legend"><span><i class="city-dot"></i>城镇</span><span><i class="resource-dot"></i>资源</span><span><i class="camera-dot"></i>镜头</span></div>
    </section>`;

  const cards = panel.querySelector(".unit-card-rail");
  if (!army.units.length) cards.innerHTML = '<div class="empty-note">军团暂无可用部队</div>';
  for (const [index, unit] of army.units.entries()) {
    const data = roster.find((item) => item.id === unit.unitId);
    if (!data) continue;
    const fill = Math.max(0, Math.min(100, unit.soldiers / data.size * 100));
    const isCavalry = data.type.includes("骑");
    const symbol = data.type === "远程" ? "弩" : isCavalry ? "骑" : data.type === "战车" ? "车" : "戟";
    const card = document.createElement("article");
    card.className = "army-unit-card";
    card.style.setProperty("--faction-color", `#${faction.color.toString(16).padStart(6, "0")}`);
    card.innerHTML = `<div class="unit-card-art ${isCavalry ? "cavalry-art" : ""}"><span class="unit-card-type">${data.type}</span><b>${symbol}</b><small>${String(index + 1).padStart(2, "0")}</small></div>
      <strong>${data.name}</strong><span class="unit-card-count">${unit.soldiers.toLocaleString()} / ${data.size.toLocaleString()}</span>
      <div class="soldier-bar"><i style="width:${fill}%"></i></div>
      <div class="unit-card-stats"><span>攻 ${data.attack}</span><span>防 ${data.defense}</span></div>`;
    cards.appendChild(card);
  }
  panel.querySelector(".close-btn").addEventListener("click", onClose);
  container.replaceChildren(panel);
  drawCampaignMinimap(panel.querySelector(".campaign-minimap"), cameraRig);
}
