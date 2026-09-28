import { GameData, UNIT_ROSTERS } from "../gameData.js";

const BUILDING_LABELS = { farmland: "农田", barracks: "兵营" };

export function renderCityPanel(container, city, { onRecruit, onBuild, onClose }) {
  const owner = city.ownerId ? GameData.factions[city.ownerId].name : "无主之城";
  const isPlayerCity = city.ownerId === GameData.playerFactionId;
  const production = GameData.cityFoodProduction(city);
  const consumption = GameData.cityFoodConsumption(city);
  const net = production - consumption;
  const panel = document.createElement("div");
  panel.className = "side-panel-card city-panel-card";
  panel.innerHTML = `
    <div class="panel-kicker">战役据点</div><h2>${city.name}${city.isCapital ? "（首都）" : ""}</h2>
    <p>所属: ${owner}</p>
    <div class="city-stats"><span>城镇 <b>Lv.${city.level}/${city.maxLevel}</b></span><span>驻军 <b>${city.garrison}</b></span>
      <span>人口 <b>${city.population.toLocaleString()}</b></span><span>粮食 <b class="${net >= 0 ? "food-ok" : "food-bad"}">${net >= 0 ? "+" : ""}${net}/回合</b></span></div>
    ${city.isGrainRich ? '<p class="hint">鱼米之乡：粮食产出丰厚</p>' : ""}
    <h3 class="section-title">城镇建设</h3><div class="building-list"></div>
    <h3 class="section-title">征募兵种 <span>本城招募将加入驻扎军团</span></h3>
    <div class="recruit-list"></div><p class="hint recruit-hint"></p>
    <button class="close-btn">关闭</button>`;
  const buildingList = panel.querySelector(".building-list");
  for (const type of Object.keys(BUILDING_LABELS)) {
    const row = document.createElement("div");
    row.className = "building-row";
    const count = city.buildings[type];
    const cost = GameData.getBuildingCost(city, type);
    const maxed = count >= 5;
    row.innerHTML = `<span>${BUILDING_LABELS[type]} <b>Lv.${count}</b></span><button class="build-btn" ${isPlayerCity && !maxed ? "" : "disabled"}>${maxed ? "已满级" : `建造 ${cost} 金`}</button>`;
    row.querySelector("button").addEventListener("click", () => onBuild(city.id, type));
    buildingList.appendChild(row);
  }

  const recruitList = panel.querySelector(".recruit-list");
  const roster = city.ownerId ? (UNIT_ROSTERS[city.ownerId] ?? []) : [];
  if (!isPlayerCity) recruitList.innerHTML = '<div class="empty-note">只能在己方城池征募军队</div>';
  for (const unit of roster) {
    const eligibility = GameData.canRecruit(city.ownerId, city.id, unit.id);
    const cost = GameData.getRecruitCost(city.ownerId, city.id, unit.id);
    const row = document.createElement("div");
    row.className = `unit-recruit-card${eligibility.ok ? "" : " locked"}`;
    row.innerHTML = `<div class="unit-crest">${unit.type === "远程" ? "弩" : unit.type.includes("骑") || unit.type === "战车" ? "骑" : "戟"}</div>
      <div class="unit-recruit-info"><b>${unit.name}</b><span>${unit.type} · ${unit.size} 人</span><small>${unit.requirement}</small></div>
      <button ${eligibility.ok ? "" : "disabled"}>${cost} 金<br>征募</button>`;
    row.querySelector("button").addEventListener("click", () => onRecruit(city.id, unit.id));
    recruitList.appendChild(row);
  }
  panel.querySelector(".recruit-hint").textContent = isPlayerCity ? "兵营可降低招募花费 · 每支军队每回合支付维护费" : "";
  panel.querySelector(".close-btn").addEventListener("click", onClose);
  container.replaceChildren(panel);
}
