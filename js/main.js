import { GameData } from "./gameData.js";
import { renderFactionSelect } from "./ui/factionSelect.js";
import { startCampaignMap } from "./ui/campaignMap.js";

const app = document.getElementById("app");

renderFactionSelect(app, (factionId) => {
  GameData.playerFactionId = factionId;
  startCampaignMap(app);
});
