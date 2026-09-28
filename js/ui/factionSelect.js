import { GameData } from "../gameData.js";

function colorToCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export function renderFactionSelect(container, onSelect) {
  container.innerHTML = `
    <div class="faction-select">
      <h1>选择你的阵营</h1>
      <p class="subtitle">每个阵营拥有独特的军队、资源与外交立场</p>
      <div class="faction-grid"></div>
    </div>
  `;
  const grid = container.querySelector(".faction-grid");
  for (const faction of Object.values(GameData.factions)) {
    const card = document.createElement("div");
    card.className = "faction-card";
    card.style.setProperty("--faction-color", colorToCss(faction.color));
    card.innerHTML = `
      <div class="faction-banner"></div>
      <h2>${faction.name}</h2>
      <p class="faction-desc">${faction.description}</p>
      <p class="faction-buff">特色: ${faction.buffName}<br>${faction.buffDescription}</p>
      <p class="faction-unit">特色兵种: ${faction.signatureUnit}</p>
      <p class="faction-treasury">初始资金: ${faction.treasury} 金币</p>
      <button class="select-btn">选择此阵营</button>
    `;
    card.querySelector(".select-btn").addEventListener("click", () => onSelect(faction.id));
    grid.appendChild(card);
  }
}
