import { GameData } from "../gameData.js";

function statusText(status) {
  if (status === "alliance") return "同盟";
  if (status === "war") return "交战中";
  return "和平";
}

export function renderDiplomacyPanel(container, playerFactionId, { onClose }) {
  function makeButton(label, handler) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  function setStatus(otherId, status) {
    GameData.setRelation(playerFactionId, otherId, status);
    build();
  }

  function build() {
    const panel = document.createElement("div");
    panel.className = "diplomacy-panel";
    panel.innerHTML = "<h2>外交关系</h2>";

    for (const faction of Object.values(GameData.factions)) {
      if (faction.id === playerFactionId) continue;
      const status = GameData.getRelation(playerFactionId, faction.id);

      const row = document.createElement("div");
      row.className = "diplomacy-row";
      row.style.setProperty("--faction-color", `#${faction.color.toString(16).padStart(6, "0")}`);
      row.innerHTML = `
        <h3>${faction.name}</h3>
        <p>邦交状态: ${statusText(status)}</p>
        <div class="row-buttons"></div>
      `;
      const buttons = row.querySelector(".row-buttons");
      if (status !== "alliance") buttons.appendChild(makeButton("结盟", () => setStatus(faction.id, "alliance")));
      if (status !== "war") buttons.appendChild(makeButton("宣战", () => setStatus(faction.id, "war")));
      if (status !== "peace") buttons.appendChild(makeButton("求和", () => setStatus(faction.id, "peace")));
      panel.appendChild(row);
    }

    panel.appendChild(makeButton("关闭", onClose));

    container.innerHTML = "";
    container.appendChild(panel);
  }

  build();
}
