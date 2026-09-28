// Central game state: factions, cities and armies for the campaign map prototype.
// Theme: Warring States period (战国) - the Seven Warring States plus neutral minor states.
// This is a direct JavaScript port of the original Godot GameData.gd singleton.
import { MAP_SCALE, spreadMapPosition } from "./worldConstants.js?v=20260928";

const BASE_RECRUIT_COST = 200;
const POP_PER_LEVEL = 5000; // population capacity granted by each city level
const FOOD_CONSUMPTION_PER_LEVEL = 300;
const FOOD_PRODUCTION_PER_LEVEL = 260; // normal farmland yield per level
const FOOD_PRODUCTION_PER_LEVEL_GRAIN_RICH = 400; // "鱼米之乡" bonus
const FARMLAND_FOOD_BONUS = 220; // per farmland building level
const BARRACKS_RECRUIT_DISCOUNT = 0.05; // per barracks level, multiplicative
const MAX_BUILDING_LEVEL = 5;
const GROWTH_RATE = 0.02; // fraction of capacity gained per turn when food is sufficient
const START_YEAR_BC = 475; // Warring States period start
const DISTANCE_PER_MOVEMENT_POINT = 55 * MAP_SCALE;

function worldMapPosition(x, z) {
  const point = spreadMapPosition(x, z);
  return { x: point.x * MAP_SCALE, z: point.z * MAP_SCALE };
}

const GENERAL_SURNAMES = ["孟", "田", "屈", "廉", "蒙", "李", "乐", "魏", "韩", "赵", "燕", "司马"];
const GENERAL_GIVEN_NAMES = ["安", "平", "成", "武", "远", "信", "景", "昭", "勇", "宁", "毅", "衡"];
const GENERAL_RANKS = ["军司马", "校尉", "偏将", "行伍出身"];

const NEUTRAL_CITY_POSITIONS = {
  suiyang: [1220, 820], qufu: [1580, 590], puyang: [1030, 550], lingshou: [990, 320],
  jiangzhou: [360, 1210], chengdu: [210, 1260], luoyang: [760, 720], xuchang: [1220, 880],
  pengcheng: [1530, 940], xuzhou: [1580, 820], jiangdu: [1570, 1150], kuaiji: [1730, 1360],
  nanyang: [760, 940], shangcai: [1200, 990],
};

const FIXED_CITY_POSITIONS = {
  hanzhong: [520, 1030], liaoxi: [1750, 160], zhuo: [1365, 100],
};

function mapCityPosition(id, x, z, ownerId) {
  const fixedPosition = FIXED_CITY_POSITIONS[id];
  if (fixedPosition) return fixedPosition;
  const neutralPosition = NEUTRAL_CITY_POSITIONS[id];
  if (neutralPosition) return neutralPosition;
  const projections = {
    qin: [620 + (x - 300) * 1.45, 700 + (z - 920) * 0.95],
    chu: [1050 + (x - 760) * 0.85, 1080 + (z - 1440) * 0.95],
    qi: [1660 + (x - 1660) * 0.9, 500 + (z - 660) * 0.8],
    yan: [1320 + (x - 840) * 0.75, 150 + (z - 200) * 0.85],
    zhao: [980 + (x - 960) * 0.95, 430 + (z - 480) * 0.9],
    wei: [1140 + (x - 1040) * 0.85, 700 + (z - 840) * 0.9],
    han: [1070 + (x - 1000) * 0.9, 850 + (z - 1000) * 0.9],
  };
  const projected = projections[ownerId];
  if (!projected) return [x, z];
  return [projected[0], projected[1]];
}

const RESOURCE_SITE_POSITIONS = {
  hanguguan: [740, 720], hulaoguan: [1080, 740], jingxingguan: [870, 360], yiqueguan: [820, 800],
  taixinguan: [960, 540], wuguan: [610, 930], aocang: [1100, 720], qin_tieshan: [500, 790],
  dali_salt: [520, 440], zhao_horse: [1320, 160], qi_salt: [1760, 520], nanyang_jade: [780, 950],
  chu_shipyard: [1200, 1170], jiangling_grain: [1000, 1170], yue_salt: [1750, 1280], ba_iron: [250, 1220],
};

function createNpcGeneral() {
  return {
    name: `${GENERAL_SURNAMES[Math.floor(Math.random() * GENERAL_SURNAMES.length)]}${GENERAL_GIVEN_NAMES[Math.floor(Math.random() * GENERAL_GIVEN_NAMES.length)]}`,
    rank: GENERAL_RANKS[Math.floor(Math.random() * GENERAL_RANKS.length)],
    level: 1,
    recoveryBonus: Math.floor(Math.random() * 4) / 100,
    isFamous: false,
  };
}

// Each faction has its own recruitable roster. Requirements are checked by the campaign rules.
export const UNIT_ROSTERS = {
  qin: [
    { id: "qin_spears", name: "秦戟士", type: "步兵", cost: 120, attack: 44, defense: 52, upkeep: 12, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "qin_crossbow", name: "秦弩手", type: "远程", cost: 190, attack: 72, defense: 30, upkeep: 18, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "qin_sharp", name: "秦锐士", type: "精锐步兵", cost: 320, attack: 86, defense: 76, upkeep: 32, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "qin_cavalry", name: "秦轻骑", type: "骑兵", cost: 360, attack: 82, defense: 58, upkeep: 38, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
  ],
  chu: [
    { id: "chu_spears", name: "楚长戟兵", type: "步兵", cost: 130, attack: 48, defense: 58, upkeep: 14, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "chu_archers", name: "楚弓手", type: "远程", cost: 180, attack: 66, defense: 32, upkeep: 17, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "chu_soul", name: "楚魂军", type: "精锐步兵", cost: 330, attack: 80, defense: 82, upkeep: 34, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "chu_chariots", name: "楚国战车", type: "战车", cost: 390, attack: 92, defense: 55, upkeep: 42, size: 120, minCityLevel: 4, minBarracks: 3, requirement: "城镇 Lv.4 · 兵营 Lv.3" },
  ],
  qi: [
    { id: "qi_spears", name: "齐长枪兵", type: "步兵", cost: 120, attack: 44, defense: 54, upkeep: 12, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "qi_archers", name: "齐弓手", type: "远程", cost: 170, attack: 66, defense: 32, upkeep: 16, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "qi_swords", name: "技击之士", type: "精锐步兵", cost: 310, attack: 82, defense: 70, upkeep: 30, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "qi_cavalry", name: "齐国骑兵", type: "骑兵", cost: 350, attack: 78, defense: 58, upkeep: 36, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
  ],
  yan: [
    { id: "yan_spears", name: "燕国戍卒", type: "步兵", cost: 120, attack: 42, defense: 62, upkeep: 12, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "yan_archers", name: "燕地弓手", type: "远程", cost: 170, attack: 64, defense: 34, upkeep: 16, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "yan_guard", name: "燕国守军", type: "精锐步兵", cost: 300, attack: 70, defense: 90, upkeep: 30, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "yan_cavalry", name: "燕国突骑", type: "骑兵", cost: 340, attack: 86, defense: 55, upkeep: 34, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
  ],
  zhao: [
    { id: "zhao_spears", name: "赵国戟士", type: "步兵", cost: 120, attack: 46, defense: 52, upkeep: 12, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "zhao_archers", name: "赵国弓手", type: "远程", cost: 170, attack: 64, defense: 32, upkeep: 16, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "zhao_cavalry", name: "胡刀骑士", type: "精锐骑兵", cost: 390, attack: 96, defense: 74, upkeep: 42, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "zhao_lancers", name: "赵国铁骑", type: "枪骑兵", cost: 420, attack: 98, defense: 68, upkeep: 46, size: 180, minCityLevel: 4, minBarracks: 3, requirement: "城镇 Lv.4 · 兵营 Lv.3" },
  ],
  wei: [
    { id: "wei_spears", name: "魏国戟兵", type: "步兵", cost: 110, attack: 46, defense: 58, upkeep: 11, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "wei_crossbow", name: "魏弩甲士", type: "远程", cost: 150, attack: 72, defense: 38, upkeep: 15, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "wei_wuzu", name: "魏武卒", type: "精锐步兵", cost: 300, attack: 90, defense: 86, upkeep: 28, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "wei_cavalry", name: "魏国骑兵", type: "骑兵", cost: 330, attack: 78, defense: 58, upkeep: 32, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
  ],
  han: [
    { id: "han_spears", name: "韩国戟兵", type: "步兵", cost: 120, attack: 44, defense: 54, upkeep: 12, size: 400, minCityLevel: 1, minBarracks: 0, requirement: "城镇 Lv.1" },
    { id: "han_crossbow", name: "韩国劲弩", type: "远程", cost: 210, attack: 88, defense: 30, upkeep: 20, size: 300, minCityLevel: 1, minBarracks: 1, requirement: "兵营 Lv.1" },
    { id: "han_guard", name: "韩国精锐", type: "精锐步兵", cost: 300, attack: 76, defense: 76, upkeep: 30, size: 300, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
    { id: "han_cavalry", name: "韩国骑兵", type: "骑兵", cost: 350, attack: 78, defense: 58, upkeep: 36, size: 200, minCityLevel: 3, minBarracks: 2, requirement: "城镇 Lv.3 · 兵营 Lv.2" },
  ],
};

const BUILDING_COST_TABLE = {
  farmland: { base: 150, step: 90 },
  barracks: { base: 220, step: 110 },
};

class Faction {
  constructor(id, name, color, description, treasury, buffName, buffDescription, signatureUnit,
      incomeMultiplier = 1.0, recruitCostMultiplier = 1.0) {
    this.id = id;
    this.name = name;
    this.color = color; // 0xRRGGBB
    this.description = description;
    this.treasury = treasury;
    this.buffName = buffName;
    this.buffDescription = buffDescription;
    this.signatureUnit = signatureUnit;
    this.incomeMultiplier = incomeMultiplier;
    this.recruitCostMultiplier = recruitCostMultiplier;
  }
}

class City {
  constructor(id, name, x, z, ownerId, population, income, garrison, isCapital = false, isGrainRich = false) {
    this.id = id;
    this.name = name;
    const [mapX, mapZ] = mapCityPosition(id, x, z, ownerId);
    this.position = worldMapPosition(mapX, mapZ);
    this.ownerId = ownerId;
    this.income = income;
    this.garrison = garrison;
    this.isCapital = isCapital;
    this.isGrainRich = isGrainRich;
    this.maxLevel = isCapital ? 10 : 7;
    this.level = Math.min(this.maxLevel, Math.max(1, Math.round(population / POP_PER_LEVEL)));
    this.startLevel = this.level;
    this.populationCapacity = this.level * POP_PER_LEVEL;
    this.population = Math.min(population, this.populationCapacity);
    this.buildings = { farmland: 0, barracks: 0 };
  }
}

class ResourceSite {
  constructor(id, name, x, z, icon, resourceName, income) {
    this.id = id;
    this.name = name;
    const [mapX, mapZ] = RESOURCE_SITE_POSITIONS[id] ?? [x, z];
    this.position = worldMapPosition(mapX, mapZ);
    this.icon = icon;
    this.resourceName = resourceName;
    this.income = income;
    this.ownerId = "";
  }
}

class Army {
  constructor(id, name, factionId, cityId, units = []) {
    this.id = id;
    this.name = name;
    this.factionId = factionId;
    this.cityId = cityId;
    this.units = units.map((unitId) => ({ unitId, soldiers: UNIT_ROSTERS[factionId].find((unit) => unit.id === unitId)?.size ?? 300 }));
    this.morale = 100;
    this.experience = 0;
    this.general = createNpcGeneral();
    this.baseRecoveryRate = 0.06;
    this.actionUsed = false;
    this.movementPointsMax = 8;
    this.movementPoints = this.movementPointsMax;
    this.position = { x: 0, z: 0 };
    this.routePath = null;
    this.routeDistance = 0;
    this.routeProgress = 0;
    this.visualProgress = 0;
    this.routeTargetId = "";
    this.routeTargetPosition = null;
    this.routeBattlePending = false;
    this.isMarching = false;
    this.refreshStats();
  }

  refreshStats() {
    this.unitCount = this.units.length;
    const roster = UNIT_ROSTERS[this.factionId];
    const power = this.units.reduce((sum, unit) => {
      const data = roster.find((item) => item.id === unit.unitId);
      return sum + (data ? (data.attack + data.defense) / 2 * unit.soldiers / data.size : 0);
    }, 0);
    this.strength = Math.round(power * this.morale / 100 * (1 + this.experience * 0.03));
    const movementByType = (type) => type === "战车" ? 9 : type.includes("骑") ? 11 : type === "远程" ? 7 : 8;
    this.movementPointsMax = this.units.length
      ? Math.min(...this.units.map((entry) => movementByType(roster.find((unit) => unit.id === entry.unitId)?.type ?? "步兵")))
      : 8;
    this.movementPoints = Math.min(this.movementPoints ?? this.movementPointsMax, this.movementPointsMax);
  }
}

class GameDataStore {
  constructor() {
    this.factions = {};
    this.cities = {};
    this.resourceSites = {};
    this.armies = {};
    this.relations = {};
    this.playerFactionId = "";
    this.turn = 1;
    this._armyCounter = 0;

    this._initFactions();
    this._initCities();
    this._initResourceSites();
    this._initArmies();
    this._initRelations();
  }

  _initFactions() {
    const f = this.factions;
    f.qin = new Faction("qin", "秦国", 0x2c2c2c,
      "雄踞西陲，行商鞅变法，军功爵制驱使全民皆兵。", 550,
      "军功爵制", "士兵攻击力 +15%，胜者可凭军功晋爵获赏", "锐士");
    f.chu = new Faction("chu", "楚国", 0xc0392b,
      "地广物博，雄踞南方江汉，带甲百万。", 600,
      "地广人稀", "城市收入 +10%", "楚魂军", 1.1);
    f.qi = new Faction("qi", "齐国", 0x2980b9,
      "渔盐之利富甲天下，稷下学宫汇聚天下贤才。", 650,
      "商贸之国", "金币收入 +20%", "技击之士", 1.2);
    f.yan = new Faction("yan", "燕国", 0x7f8c8d,
      "地处苦寒边陲，民风彪悍，善守城池。", 400,
      "苦寒坚守", "城池驻军更加坚韧", "突骑");
    f.zhao = new Faction("zhao", "赵国", 0x8e44ad,
      "武灵王胡服骑射，铁骑纵横北疆。", 480,
      "胡服骑射", "骑兵类军队战斗力 +20%", "胡刀骑士");
    f.wei = new Faction("wei", "魏国", 0xf39c12,
      "处四战之地，魏武卒选拔严苛、天下精锐。", 500,
      "武卒选拔", "招募军队所需金币 -20%", "魏武卒", 1.0, 0.8);
    f.han = new Faction("han", "韩国", 0x16a085,
      "疆域虽狭，然天下劲弩皆出于韩。", 420,
      "天下劲弩", "远程兵种伤害 +15%", "劲弩兵");
  }

  _addCity(id, name, x, z, owner, pop, income, garrison, isCapital = false, isGrainRich = false) {
    this.cities[id] = new City(id, name, x, z, owner, pop, income, garrison, isCapital, isGrainRich);
  }

  _initCities() {
    // Qin (west) - capital: 咸阳
    this._addCity("xianyang", "咸阳", 300, 920, "qin", 48000, 130, 9, true);
    this._addCity("yueyang", "栎阳", 400, 800, "qin", 20000, 55, 5);
    this._addCity("shangjun", "上郡", 340, 600, "qin", 11000, 30, 3);
    this._addCity("hanzhong", "汉中", 280, 1120, "qin", 14000, 36, 4);
    // Chu (south, sprawling) - capital: 郢都
    this._addCity("ying", "郢都", 760, 1440, "chu", 47000, 128, 8, true);
    this._addCity("shouchun", "寿春", 1120, 1360, "chu", 24000, 60, 5);
    this._addCity("chencheng", "陈城", 960, 1200, "chu", 17000, 44, 4);
    this._addCity("jiangling", "江陵", 660, 1560, "chu", 19000, 48, 4, false, true);
    // Qi (east, wealthy) - capital: 临淄
    this._addCity("linzi", "临淄", 1660, 660, "qi", 50000, 140, 8, true);
    this._addCity("jimo", "即墨", 1800, 600, "qi", 21000, 55, 5);
    this._addCity("xuecheng", "薛城", 1560, 840, "qi", 15000, 40, 3);
    // Yan (north) - capital: 蓟城
    this._addCity("ji", "蓟城", 840, 200, "yan", 27000, 68, 6, true);
    this._addCity("xiangping", "襄平", 1240, 160, "yan", 12000, 30, 3);
    // Zhao (north-central, cavalry country) - capital: 邯郸
    this._addCity("handan", "邯郸", 960, 480, "zhao", 33000, 88, 7, true);
    this._addCity("jinyang", "晋阳", 660, 440, "zhao", 18000, 46, 4);
    this._addCity("daicheng", "代城", 800, 280, "zhao", 10000, 26, 3);
    // Wei (central plains) - capital: 大梁
    this._addCity("daliang", "大梁", 1040, 840, "wei", 35000, 92, 7, true);
    this._addCity("anyi", "安邑", 760, 760, "wei", 19000, 50, 4);
    this._addCity("yecheng", "邺城", 920, 600, "wei", 16000, 42, 4);
    // Han (central-south, crossbow makers) - capital: 新郑
    this._addCity("xinzheng", "新郑", 1000, 1000, "han", 27000, 72, 6, true);
    this._addCity("yiyang", "宜阳", 840, 960, "han", 13000, 34, 3);
    // Neutral minor states
    this._addCity("suiyang", "睢阳", 1160, 920, "", 14000, 38, 3, false, true);
    this._addCity("qufu", "曲阜", 1360, 760, "", 13000, 35, 3, false, true);
    this._addCity("puyang", "濮阳", 900, 720, "", 12000, 32, 3, false, true);
    this._addCity("lingshou", "灵寿", 880, 360, "", 9000, 24, 2);
    this._addCity("jiangzhou", "江州", 320, 1300, "", 9500, 25, 2);
    this._addCity("chengdu", "成都", 180, 1240, "", 12500, 33, 3, false, true);

    // Additional regional settlements widen the campaign beyond the seven capitals.
    const regionalCities = [
      ["yong", "雍城", 160, 730, "qin", 13000, 38], ["chencang", "陈仓", 100, 850, "qin", 9000, 26],
      ["lantian", "蓝田", 430, 970, "qin", 11500, 32], ["shangyu", "商於", 510, 1110, "qin", 8500, 24],
      ["dali", "大荔", 470, 750, "qin", 10000, 28], ["xiaoguan", "萧关", 180, 500, "qin", 7000, 20],
      ["du", "杜县", 360, 1040, "qin", 8000, 23], ["fufeng", "扶风", 260, 820, "qin", 9500, 27],
      ["danyang", "丹阳", 600, 1480, "chu", 14000, 38], ["wuxian", "巫县", 200, 1510, "chu", 8500, 24],
      ["qianzhong", "黔中", 420, 1570, "chu", 10000, 28], ["jingling", "竟陵", 850, 1510, "chu", 12000, 33],
      ["xia", "夏口", 1000, 1460, "chu", 11000, 30], ["yancheng", "鄢城", 820, 1290, "chu", 13000, 36],
      ["wan", "宛城", 690, 1190, "chu", 16000, 44], ["lujiang", "庐江", 1240, 1300, "chu", 13000, 36],
      ["gaotang", "高唐", 1470, 540, "qi", 12000, 34], ["dong'e", "东阿", 1430, 730, "qi", 10000, 28],
      ["anping", "安平", 1570, 700, "qi", 11000, 31], ["langya", "琅琊", 1790, 1000, "qi", 13000, 37],
      ["bo", "博阳", 1520, 580, "qi", 9000, 25], ["linqu", "临朐", 1690, 800, "qi", 9500, 27],
      ["yi", "易水", 780, 120, "yan", 9000, 24], ["wuyang", "武阳", 920, 260, "yan", 11000, 30],
      ["yuyang", "渔阳", 1050, 230, "yan", 10000, 27], ["liaoxi", "辽西", 1480, 150, "yan", 8000, 22],
      ["linle", "临乐", 1250, 230, "yan", 8500, 23], ["yanling", "燕陵", 1040, 330, "yan", 9000, 25],
      ["zhongshan", "中山", 780, 390, "zhao", 15000, 42], ["fanwu", "番吾", 640, 500, "zhao", 8500, 24],
      ["feixia", "肥下", 950, 410, "zhao", 10000, 28], ["daijun", "代郡", 830, 160, "zhao", 9500, 26],
      ["jiumen", "九门", 850, 490, "zhao", 8000, 22], ["wuan", "武安", 1020, 540, "zhao", 11000, 30],
      ["heyang", "河阳", 900, 760, "wei", 12000, 34], ["juancheng", "卷城", 980, 700, "wei", 9500, 26],
      ["yuanyang", "原阳", 1130, 720, "wei", 11000, 31], ["anling", "安陵", 1100, 920, "wei", 10000, 28],
      ["pufan", "蒲坂", 540, 700, "wei", 9000, 25], ["jiao", "焦城", 900, 640, "wei", 9000, 25],
      ["zhicheng", "轵城", 700, 720, "wei", 8000, 22], ["yangzhai", "阳翟", 910, 1030, "han", 14000, 39],
      ["chenggao", "成皋", 890, 870, "han", 12000, 35], ["shangdang", "上党", 700, 570, "han", 13000, 37],
      ["yangcheng", "阳城", 860, 1120, "han", 10000, 28], ["fushu", "负黍", 920, 1140, "han", 8500, 24],
      ["luoyang", "洛阳", 720, 820, "", 22000, 68], ["xuchang", "许城", 1110, 1040, "", 16000, 46],
      ["pengcheng", "彭城", 1400, 1000, "", 17000, 50], ["xuzhou", "徐州", 1430, 900, "", 19000, 58],
      ["jiangdu", "江都", 1440, 1250, "", 15000, 45], ["kuaiji", "会稽", 1570, 1450, "", 12000, 38],
      ["nanyang", "南阳", 670, 1120, "", 14000, 42], ["shangcai", "上蔡", 1080, 1150, "", 11000, 32],
      ["linzi_minor", "临淄外郭", 1590, 630, "qi", 7000, 20], ["zhuo", "涿邑", 900, 100, "yan", 8000, 21],
      ["guangping", "广平", 1030, 620, "zhao", 9000, 24], ["chengyang", "城阳", 1730, 910, "qi", 10000, 29],
    ];
    for (const [id, name, x, z, owner, population, income] of regionalCities) {
      this._addCity(id, name, x, z, owner, population, income, 2);
    }
  }

  _initResourceSites() {
    const sites = [
      ["hanguguan", "函谷关", 560, 800, "关", "关隘", 55],
      ["hulaoguan", "成皋关（虎牢关）", 900, 850, "关", "关隘", 65],
      ["jingxingguan", "井陉关", 690, 350, "关", "关隘", 50],
      ["yiqueguan", "伊阙关", 750, 990, "关", "关隘", 50],
      ["taixinguan", "太行陉", 790, 600, "关", "关隘", 45],
      ["wuguan", "武关", 520, 1180, "关", "关隘", 50],
      ["aocang", "敖仓", 1000, 760, "粮", "粮仓", 90],
      ["qin_tieshan", "秦岭铁矿", 340, 1120, "铁", "铁矿", 70],
      ["dali_salt", "河东盐池", 460, 650, "盐", "盐场", 75],
      ["zhao_horse", "代地马场", 830, 180, "马", "马场", 60],
      ["qi_salt", "齐国盐场", 1740, 720, "盐", "盐场", 95],
      ["nanyang_jade", "南阳玉矿", 650, 1080, "玉", "玉矿", 65],
      ["chu_shipyard", "江汉舟场", 900, 1500, "舟", "舟场", 70],
      ["jiangling_grain", "江陵粮仓", 620, 1510, "粮", "粮仓", 80],
      ["yue_salt", "东南盐场", 1590, 1380, "盐", "盐场", 90],
      ["ba_iron", "巴蜀铁场", 130, 1270, "铁", "铁矿", 70],
    ];
    for (const [id, name, x, z, icon, resourceName, income] of sites) {
      this.resourceSites[id] = new ResourceSite(id, name, x, z, icon, resourceName, income);
    }
  }

  _addArmy(factionId, cityId, name, units) {
    this._armyCounter += 1;
    const id = `army_${this._armyCounter}`;
    this.armies[id] = new Army(id, name, factionId, cityId, units);
    const city = this.cities[cityId];
    this.armies[id].locationId = cityId;
    if (city) this.armies[id].position = { ...city.position };
    return id;
  }

  _initArmies() {
    this._addArmy("qin", "xianyang", "锐士军团", ["qin_sharp", "qin_crossbow", "qin_spears", "qin_spears"]);
    this._addArmy("chu", "ying", "楚魂军", ["chu_soul", "chu_archers", "chu_spears", "chu_spears"]);
    this._addArmy("qi", "linzi", "技击之士营", ["qi_swords", "qi_archers", "qi_spears", "qi_spears"]);
    this._addArmy("yan", "ji", "突骑营", ["yan_cavalry", "yan_spears", "yan_archers"]);
    this._addArmy("zhao", "handan", "胡刀骑士团", ["zhao_cavalry", "zhao_archers", "zhao_spears", "zhao_spears"]);
    this._addArmy("wei", "daliang", "魏武卒", ["wei_wuzu", "wei_crossbow", "wei_spears", "wei_spears"]);
    this._addArmy("han", "xinzheng", "劲弩兵营", ["han_crossbow", "han_guard", "han_spears"]);
  }

  _relationKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  _initRelations() {
    const ids = Object.keys(this.factions);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        this.relations[this._relationKey(ids[i], ids[j])] = "peace";
      }
    }
  }

  getRelation(a, b) {
    if (a === b) return "self";
    return this.relations[this._relationKey(a, b)] ?? "peace";
  }

  setRelation(a, b, status) {
    if (a === b) return;
    this.relations[this._relationKey(a, b)] = status;
  }

  getCitiesForFaction(factionId) {
    return Object.values(this.cities).filter((c) => c.ownerId === factionId);
  }

  getArmiesForFaction(factionId) {
    return Object.values(this.armies).filter((a) => a.factionId === factionId);
  }

  // --- Date -------------------------------------------------------------

  getDateLabel() {
    const totalMonths = this.turn - 1;
    const year = START_YEAR_BC - Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    return `公元前${year}年${month}月`;
  }

  // --- Food & population --------------------------------------------------

  cityFoodProduction(city) {
    const perLevel = city.isGrainRich ? FOOD_PRODUCTION_PER_LEVEL_GRAIN_RICH : FOOD_PRODUCTION_PER_LEVEL;
    return city.level * perLevel + city.buildings.farmland * FARMLAND_FOOD_BONUS;
  }

  cityFoodConsumption(city) {
    return city.level * FOOD_CONSUMPTION_PER_LEVEL;
  }

  cityIncome(city) {
    return Math.round(city.income * (city.level / city.startLevel));
  }

  getFactionPopulation(factionId) {
    return this.getCitiesForFaction(factionId).reduce((sum, c) => sum + c.population, 0);
  }

  getFactionFoodNet(factionId) {
    return this.getCitiesForFaction(factionId).reduce(
      (sum, c) => sum + (this.cityFoodProduction(c) - this.cityFoodConsumption(c)),
      0
    );
  }

  // --- Buildings ----------------------------------------------------------

  getBuildingCost(city, type) {
    const table = BUILDING_COST_TABLE[type];
    return table.base + table.step * city.buildings[type];
  }

  buildBuilding(factionId, cityId, type) {
    const city = this.cities[cityId];
    const faction = this.factions[factionId];
    if (!city || city.ownerId !== factionId) return false;
    if (city.buildings[type] === undefined) return false;
    if (city.buildings[type] >= MAX_BUILDING_LEVEL) return false;
    const cost = this.getBuildingCost(city, type);
    if (faction.treasury < cost) return false;
    faction.treasury -= cost;
    city.buildings[type] += 1;
    return true;
  }

  // --- Recruiting -----------------------------------------------------------

  getRecruitCost(factionId, cityId, unitId = "") {
    const faction = this.factions[factionId];
    const city = cityId ? this.cities[cityId] : null;
    const barracks = city ? city.buildings.barracks : 0;
    const discount = Math.pow(1 - BARRACKS_RECRUIT_DISCOUNT, barracks);
    const unit = (UNIT_ROSTERS[factionId] ?? []).find((item) => item.id === unitId);
    return Math.round((unit?.cost ?? BASE_RECRUIT_COST) * faction.recruitCostMultiplier * discount);
  }

  getFactionResourceIncome(factionId) {
    return Object.values(this.resourceSites).filter((site) => site.ownerId === factionId)
      .reduce((sum, site) => sum + site.income, 0);
  }

  getFactionUpkeep(factionId) {
    return this.getArmiesForFaction(factionId).reduce((sum, army) => sum + army.units.reduce((unitSum, unit) => {
      const data = UNIT_ROSTERS[factionId].find((item) => item.id === unit.unitId);
      return unitSum + Math.round((data?.upkeep ?? 0) * unit.soldiers / (data?.size ?? 300));
    }, 0), 0);
  }

  canRecruit(factionId, cityId, unitId) {
    const faction = this.factions[factionId];
    const city = this.cities[cityId];
    const unit = (UNIT_ROSTERS[factionId] ?? []).find((item) => item.id === unitId);
    if (!faction || !city || city.ownerId !== factionId || !unit) return { ok: false, reason: "必须在己方城池招募。" };
    if (city.population < unit.size) return { ok: false, reason: `人口不足：需要 ${unit.size} 人。` };
    if (city.level < unit.minCityLevel) return { ok: false, reason: `城镇等级不足，需要 Lv.${unit.minCityLevel}。` };
    if (city.buildings.barracks < unit.minBarracks) return { ok: false, reason: `兵营等级不足，需要 Lv.${unit.minBarracks}。` };
    const cost = this.getRecruitCost(factionId, cityId, unitId);
    if (faction.treasury < cost) return { ok: false, reason: `金币不足：需要 ${cost} 金。` };
    return { ok: true, cost, unit };
  }

  recruitUnit(factionId, cityId, unitId) {
    const result = this.canRecruit(factionId, cityId, unitId);
    if (!result.ok) return result;
    const { cost, unit } = result;
    const faction = this.factions[factionId];
    const city = this.cities[cityId];
    faction.treasury -= cost;
    city.population -= unit.size;
    let army = this.getArmiesForFaction(factionId).find((item) => item.cityId === cityId);
    if (!army) {
      const id = this._addArmy(factionId, cityId, `${unit.name}营`, []);
      army = this.armies[id];
    }
    army.units.push({ unitId, soldiers: unit.size });
    army.refreshStats();
    return { ok: true, army };
  }

  getStrategicLocation(locationId) {
    return this.cities[locationId] ?? this.resourceSites[locationId] ?? null;
  }

  issueArmyRoute(armyId, routePath, destinationIdOrPosition) {
    const army = this.armies[armyId];
    const groundTarget = typeof destinationIdOrPosition !== "string";
    const destination = groundTarget ? null : this.getStrategicLocation(destinationIdOrPosition);
    const targetPosition = groundTarget ? destinationIdOrPosition : destination?.position;
    if (!army || !targetPosition || !Array.isArray(routePath) || routePath.length < 2) return { ok: false, reason: "无法生成行军路线：目的地不可达。" };
    if (destination && destination.ownerId && destination.ownerId !== army.factionId && this.getRelation(army.factionId, destination.ownerId) !== "war") {
      return { ok: false, reason: "双方尚未交战，请先宣战。" };
    }
    const nextPath = routePath.map((point) => ({ x: point.x, z: point.z }));
    const nextDistance = nextPath.slice(1).reduce((sum, point, index) =>
      sum + Math.hypot(point.x - nextPath[index].x, point.z - nextPath[index].z), 0);
    if (nextDistance < 1) return { ok: false, reason: "军队已经在该地点。" };
    army.routePath = nextPath;
    army.routeTargetId = groundTarget ? "__ground__" : destinationIdOrPosition;
    army.routeTargetPosition = { x: targetPosition.x, z: targetPosition.z };
    army.routeDistance = nextDistance;
    army.routeProgress = 0;
    army.visualProgress = 0;
    army.routeBattlePending = false;
    army.isMarching = true;
    return { ok: true, movement: this.advanceArmyRoute(army) };
  }

  advanceArmyRoute(army) {
    if (!army?.routePath || !army.routeTargetId) return { moved: 0, arrived: false };
    const groundTarget = army.routeTargetId === "__ground__";
    const destination = groundTarget ? null : this.getStrategicLocation(army.routeTargetId);
    if (!destination && !groundTarget) return { moved: 0, arrived: false };
    const isCityTarget = !groundTarget && Boolean(this.cities[army.routeTargetId]);
    const hostile = isCityTarget && destination.ownerId && destination.ownerId !== army.factionId;
    if (hostile && this.getRelation(army.factionId, destination.ownerId) !== "war") return { moved: 0, arrived: false, reason: "双方尚未交战，请先宣战。" };
    if (army.routeBattlePending) return { moved: 0, arrived: true, battle: true };
    const remaining = Math.max(0, army.routeDistance - army.routeProgress);
    if (hostile && remaining < 0.01 && army.movementPoints >= 2) {
      army.movementPoints -= 2;
      army.routeBattlePending = true;
      army.actionUsed = army.movementPoints === 0;
      return { moved: 0, arrived: true, battle: true };
    }
    const assaultReserve = hostile ? 2 : 0;
    if (army.movementPoints <= assaultReserve) return { moved: 0, arrived: false };
    const movementBudget = (army.movementPoints - assaultReserve) * DISTANCE_PER_MOVEMENT_POINT;
    const distance = Math.min(remaining, movementBudget);
    if (distance < 0.01) return { moved: 0, arrived: !hostile };
    const completesRoute = distance >= remaining - 0.01;
    const movementCost = Math.ceil(distance / DISTANCE_PER_MOVEMENT_POINT) + (hostile && completesRoute ? 2 : 0);
    army.movementPoints = Math.max(0, army.movementPoints - movementCost);
    army.routeProgress += distance;
    army.routeBattlePending = Boolean(hostile && completesRoute);
    army.actionUsed = army.movementPoints === 0;
    return { moved: distance, arrived: completesRoute, battle: army.routeBattlePending };
  }

  healArmyInFriendlyTerritory(army) {
    if (!army || army.isMarching || this.cities[army.cityId]?.ownerId !== army.factionId) return 0;
    const recoveryRate = army.baseRecoveryRate + (army.general?.recoveryBonus ?? 0);
    let recovered = 0;
    for (const unit of army.units) {
      const data = UNIT_ROSTERS[army.factionId].find((item) => item.id === unit.unitId);
      if (!data || unit.soldiers >= data.size) continue;
      const amount = Math.min(data.size - unit.soldiers, Math.max(1, Math.ceil(data.size * recoveryRate)));
      unit.soldiers += amount;
      recovered += amount;
    }
    if (recovered) army.refreshStats();
    return recovered;
  }

  resolveBattle(armyId, cityId) {
    const attacker = this.armies[armyId];
    const city = this.cities[cityId];
    if (!attacker || !city || !city.ownerId || city.ownerId === attacker.factionId) return { ok: false, reason: "目标没有敌军城池。" };
    if (this.getRelation(attacker.factionId, city.ownerId) !== "war") return { ok: false, reason: "双方尚未交战，请先宣战。" };
    const defenders = Object.values(this.armies).filter((item) => item.cityId === cityId && item.factionId === city.ownerId && !item.isMarching);
    const attackPower = attacker.strength * (0.78 + Math.random() * 0.44);
    const defensePower = (defenders.reduce((sum, item) => sum + item.strength, 0) + city.garrison * 12) * (1 + city.level * 0.025);
    const attackerWon = attackPower >= defensePower;
    const attackLoss = attackerWon ? 0.12 + Math.random() * 0.18 : 0.3 + Math.random() * 0.3;
    const defenderLoss = attackerWon ? 0.42 + Math.random() * 0.28 : 0.15 + Math.random() * 0.2;
    for (const [army, loss] of [[attacker, attackLoss], ...defenders.map((item) => [item, defenderLoss])]) {
      army.units = army.units.map((unit) => ({ ...unit, soldiers: Math.max(0, Math.round(unit.soldiers * (1 - loss))) })).filter((unit) => unit.soldiers >= 30);
      army.morale = Math.max(15, Math.round(army.morale - loss * 55));
      army.refreshStats();
    }
    const destroyed = [];
    for (const defender of defenders) {
      if (!defender.units.length) { destroyed.push(defender.id); delete this.armies[defender.id]; }
    }
    city.garrison = Math.max(1, Math.round(city.garrison * (1 - defenderLoss)));
    if (attackerWon) {
      city.ownerId = attacker.factionId;
      attacker.cityId = cityId;
      attacker.locationId = cityId;
      attacker.position = { ...city.position };
      attacker.experience += 1;
      attacker.morale = Math.min(100, attacker.morale + 12);
      attacker.refreshStats();
    } else {
      const retreat = Object.values(this.cities).find((item) => item.ownerId === attacker.factionId && item.id !== cityId);
      if (retreat) {
        attacker.cityId = retreat.id;
        attacker.locationId = retreat.id;
        attacker.position = { ...retreat.position };
      }
      if (!attacker.units.length) delete this.armies[armyId];
    }
    return { ok: true, attackerWon, attackPower: Math.round(attackPower), defensePower: Math.round(defensePower), attackerLoss: Math.round(attackLoss * 100), defenderLoss: Math.round(defenderLoss * 100), destroyed, cityName: city.name };
  }

  // --- Turn resolution ------------------------------------------------------

  _advanceCity(city) {
    const production = this.cityFoodProduction(city);
    const consumption = this.cityFoodConsumption(city);
    const net = production - consumption;
    if (net >= 0) {
      const growth = Math.max(40, Math.round(city.populationCapacity * GROWTH_RATE));
      city.population = Math.min(city.populationCapacity, city.population + growth);
    } else {
      const shrink = Math.max(30, Math.round(Math.abs(net) * 2));
      city.population = Math.max(500, city.population - shrink);
    }
    if (city.population >= city.populationCapacity && city.level < city.maxLevel) {
      city.level += 1;
      city.populationCapacity = city.level * POP_PER_LEVEL;
    }
  }

  endTurn() {
    this.turn += 1;
    for (const army of Object.values(this.armies)) {
      army.actionUsed = false;
      army.movementPoints = army.movementPointsMax;
      if (army.routePath && army.routeTargetId) this.advanceArmyRoute(army);
      this.healArmyInFriendlyTerritory(army);
    }
    for (const city of Object.values(this.cities)) {
      this._advanceCity(city);
    }
    for (const faction of Object.values(this.factions)) {
      let totalIncome = 0;
      for (const city of this.getCitiesForFaction(faction.id)) {
        totalIncome += this.cityIncome(city);
      }
      totalIncome += this.getFactionResourceIncome(faction.id);
      faction.treasury += Math.round(totalIncome * faction.incomeMultiplier);
      const upkeep = this.getFactionUpkeep(faction.id);
      faction.treasury -= upkeep;
      for (const army of this.getArmiesForFaction(faction.id)) {
        if (this.cities[army.cityId]?.ownerId === faction.id) { army.morale = Math.min(100, army.morale + 3); army.refreshStats(); }
      }
    }
  }
}

export const GameData = new GameDataStore();
