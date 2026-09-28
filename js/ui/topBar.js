import { GameData } from "../gameData.js";

export function renderTopBar(container, { onDiplomacy, onEndTurn }) {
  container.innerHTML = `
    <div class="top-bar">
      <span class="faction-label"></span>
      <span class="date-label"></span>
      <span class="treasury-label"></span>
      <span class="upkeep-label"></span>
      <span class="resource-label"></span>
      <span class="population-label"></span>
      <span class="food-label"></span>
      <span class="spacer"></span>
      <button class="diplomacy-btn">外交</button>
      <button class="end-turn-btn">结束回合</button>
    </div>
  `;
  container.querySelector(".diplomacy-btn").addEventListener("click", onDiplomacy);
  container.querySelector(".end-turn-btn").addEventListener("click", onEndTurn);

  return {
    refresh() {
      const faction = GameData.factions[GameData.playerFactionId];
      const factionLabel = container.querySelector(".faction-label");
      factionLabel.textContent = faction.name;
      factionLabel.style.color = `#${faction.color.toString(16).padStart(6, "0")}`;
      container.querySelector(".date-label").textContent = GameData.getDateLabel();
      container.querySelector(".treasury-label").textContent = `府库: ${faction.treasury} 金`;
      container.querySelector(".upkeep-label").textContent = `军费: ${GameData.getFactionUpkeep(faction.id)} 金/回合`;
      container.querySelector(".resource-label").textContent = `资源: +${GameData.getFactionResourceIncome(faction.id)} 金/回合`;
      const population = GameData.getFactionPopulation(faction.id);
      container.querySelector(".population-label").textContent = `人口: ${population.toLocaleString()}`;
      const foodNet = GameData.getFactionFoodNet(faction.id);
      const foodLabel = container.querySelector(".food-label");
      foodLabel.textContent = `粮食: ${foodNet >= 0 ? "+" : ""}${foodNet}`;
      foodLabel.style.color = foodNet >= 0 ? "#8fd17a" : "#e07a6f";
    },
  };
}
