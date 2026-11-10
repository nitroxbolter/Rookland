import type {
  BuildingKind,
  Crop,
  Resources,
  Resource,
  VillageState,
  Point,
  Building,
  Research,
  Unit,
  ResourceNode,
  AnimalProducts,
  ProvisionPolicy,
} from "./types"

export const VILLAGE_SIZE = 80
export const BARN_CAPACITIES: Record<number, Resources> = {
  1: { wood: 500, stone: 300, food: 500, iron: 300, gold: 500 },
  2: { wood: 1000, stone: 600, food: 1200, iron: 600, gold: 1200 },
  3: { wood: 2000, stone: 1200, food: 2500, iron: 1200, gold: 3000 },
  4: { wood: 3500, stone: 2200, food: 5000, iron: 2200, gold: 7500 },
  5: { wood: 5500, stone: 3500, food: 9000, iron: 3500, gold: 18000 },
  6: { wood: 9000, stone: 6000, food: 16000, iron: 6000, gold: 35000 },
  7: { wood: 15000, stone: 10000, food: 30000, iron: 10000, gold: 65000 },
  8: { wood: 25000, stone: 17000, food: 50000, iron: 17000, gold: 99900 },
}
export const BARN_PRODUCT_CAPACITIES: Record<number, AnimalProducts> = {
  1: { milk: 100, wool: 100, eggs: 100, feathers: 100 }, 2: { milk: 200, wool: 200, eggs: 200, feathers: 200 },
  3: { milk: 400, wool: 400, eggs: 400, feathers: 400 }, 4: { milk: 700, wool: 700, eggs: 700, feathers: 700 },
  5: { milk: 1100, wool: 1100, eggs: 1100, feathers: 1100 },
  6: { milk: 1800, wool: 1800, eggs: 1800, feathers: 1800 },
  7: { milk: 3000, wool: 3000, eggs: 3000, feathers: 3000 },
  8: { milk: 5000, wool: 5000, eggs: 5000, feathers: 5000 },
}
export const ANIMALS = {
  pig: { name: "Porco", foodCost: 25, growSeconds: 120, food: 40, milk: 0, wool: 0, eggs: 0, feathers: 0 },
  cow: { name: "Vaca", foodCost: 40, growSeconds: 180, food: 45, milk: 8, wool: 0, eggs: 0, feathers: 0 },
  sheep: { name: "Ovelha", foodCost: 30, growSeconds: 150, food: 30, milk: 0, wool: 8, eggs: 0, feathers: 0 },
  chicken: { name: "Galinha", foodCost: 15, growSeconds: 90, food: 18, milk: 0, wool: 0, eggs: 6, feathers: 3 },
} as const
export const RANCH_CAPACITIES: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }
export const RANCH_UPGRADE_COSTS: Record<number, Partial<Resources>> = {
  2: { wood: 70, stone: 25 },
  3: { wood: 120, stone: 55, iron: 15 },
  4: { wood: 200, stone: 100, iron: 35 },
  5: { wood: 320, stone: 170, iron: 65, gold: 25 },
}
export const DEFENSE_UPGRADE_COSTS: Record<"wall" | "gate" | "tower", Partial<Record<2 | 3 | 4, Partial<Resources>>>> = {
  wall: {
    2: { wood: 16, stone: 20 },
    3: { wood: 24, stone: 40, iron: 6 },
  },
  gate: {
    2: { wood: 45, stone: 45, iron: 10 },
    3: { wood: 70, stone: 90, iron: 25 },
  },
  tower: {
    2: { wood: 75, stone: 150, iron: 25 },
    3: { wood: 120, stone: 240, iron: 50, gold: 20 },
    4: { wood: 220, stone: 420, iron: 120, gold: 75 },
  },
}
export const RANCH_HARVEST_SECONDS = 8
export const RANCH_BREED_SECONDS = 600
export const RANCH_BREED_FOOD_COST = 15
export const BARN_UPGRADE_COSTS: Record<number, Partial<Resources>> = {
  2: { wood: 80, stone: 50, iron: 15 },
  3: { wood: 150, stone: 100, iron: 40 },
  4: { wood: 300, stone: 220, iron: 90, gold: 30 },
  5: { wood: 500, stone: 400, iron: 160, gold: 80 },
  6: { wood: 2500, stone: 1800, iron: 750, gold: 350, food: 2000 },
  7: { wood: 5500, stone: 4500, iron: 1800, gold: 850, food: 5000 },
  8: { wood: 11000, stone: 9000, iron: 4000, gold: 2000, food: 12000 },
}
export const HOUSE_CAPACITIES: Record<1 | 2 | 3, number> = {
  1: 2,
  2: 6,
  3: 15,
}
export const HOUSE_UPKEEP_PER_LEVEL: Record<1 | 2 | 3, number> = { 1: 10, 2: 50, 3: 250 }
export const HOUSE_UPGRADE_COSTS: Record<2 | 3, Partial<Resources>> = {
  2: { wood: 70, stone: 30, food: 500 },
  3: { wood: 140, stone: 80, iron: 25, food: 2500 },
}
export const TOWN_UPGRADE_COSTS: Record<2 | 3 | 4 | 5 | 6 | 7 | 8, Partial<Resources>> = {
  2: { wood: 120, stone: 80, food: 100 },
  3: { wood: 250, stone: 180, iron: 70, gold: 40 },
  4: { wood: 450, stone: 350, iron: 120, gold: 100 },
  5: { wood: 750, stone: 600, iron: 220, gold: 200 },
  6: { wood: 2500, stone: 2500, food: 5000, iron: 1200, gold: 800 },
  7: { wood: 6000, stone: 5000, food: 12000, iron: 3000, gold: 2000 },
  8: { wood: 12000, stone: 10000, food: 25000, iron: 6500, gold: 5000 },
}
export const MAX_FARM_WORKERS = 4
export const RECRUIT_COST = { food: 30 }
export const RECRUIT_SECONDS = 45
export const UPKEEP_INTERVAL = 600
export const FINANCE_INTERVAL = 1800
export const PAYROLL_INTERVAL = 3600
export const DEFAULT_PROVISIONS: Readonly<ProvisionPolicy> = {
  villagerGold: 20, villagerFood: 40, soldierGold: 20, soldierFood: 80,
}
export const PROVISION_LIMITS: Readonly<ProvisionPolicy> = {
  villagerGold: 40, villagerFood: 80, soldierGold: 40, soldierFood: 120,
}
export const TAX_RATES = { exempt: 0, low: 0.05, normal: 0.10, high: 0.15, abusive: 0.20 } as const
export const UPKEEP_PER_ANIMAL = 2
export const PRODUCTION_WINDOW = 30
export const FARM_PLANT_SECONDS = 8
export const FARM_HARVEST_SECONDS = 6
export const IMPROVEMENT_SECONDS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number> = {
  1: 60,
  2: 180,
  3: 300,
  4: 480,
  5: 720,
  6: 1200,
  7: 1800,
  8: 2700,
}
export const BUILD_SECONDS = {
  farm: 20,
  barn: 45,
  house: 30,
  well: 120,
  wall: 12,
  gate: 35,
  tower: 120,
  blacksmith: 100,
  weaving: 80,
  barracks: 120,
  ranch: 45,
} as const
export const BUILDING_UNLOCK_LEVEL = { farm: 1, barn: 1, house: 1, well: 1, wall: 1, ranch: 1, gate: 2, tower: 3, blacksmith: 2, weaving: 2, barracks: 2 } as const
export const CRAFT_RECIPES = {
  nails: { building: "blacksmith", resources: { iron: 8, wood: 2 }, crafts: {}, yield: 5, seconds: 20 },
  cloth: { building: "weaving", resources: { wood: 5 }, crafts: {}, products: { wool: 4 }, yield: 3, seconds: 30 },
  clothing: { building: "weaving", resources: { food: 4 }, crafts: { cloth: 2 }, yield: 1, seconds: 35 },
  tools: { building: "blacksmith", resources: { iron: 15, wood: 12 }, crafts: { nails: 2 }, yield: 1, seconds: 50 },
  weapons: { building: "blacksmith", resources: { iron: 20, wood: 10, gold: 5 }, crafts: { nails: 3 }, yield: 1, seconds: 60 },
  armor: { building: "blacksmith", resources: { iron: 25, gold: 8 }, crafts: { nails: 3, cloth: 2 }, yield: 1, seconds: 75 },
} as const
export const WEAVING_UPGRADES: Partial<Record<number, {
  name: string
  cost: Partial<Resources>
  tools: number
  timeReduction: number
  clothBonus: number
  clothingBonus: number
}>> = {
  2: { name: "Roda de Fiar", cost: { wood: 70, stone: 10, iron: 25 }, tools: 1, timeReduction: 10, clothBonus: 1, clothingBonus: 0 },
  3: { name: "Tear de Pedais", cost: { wood: 150, iron: 55, gold: 25 }, tools: 2, timeReduction: 20, clothBonus: 1, clothingBonus: 1 },
  4: { name: "Lançadeira Rápida", cost: { wood: 300, stone: 100, iron: 100, gold: 60 }, tools: 3, timeReduction: 30, clothBonus: 2, clothingBonus: 1 },
  5: { name: "Tear Mecânico", cost: { wood: 500, stone: 200, iron: 175, gold: 140 }, tools: 5, timeReduction: 40, clothBonus: 3, clothingBonus: 2 },
}

export function craftOutput(item: keyof typeof CRAFT_RECIPES, level: number) {
  const recipe = CRAFT_RECIPES[item]
  const upgrade = WEAVING_UPGRADES[level]
  if (!upgrade || (item !== "cloth" && item !== "clothing"))
    return { yield: recipe.yield, seconds: recipe.seconds }
  return {
    yield: recipe.yield + (item === "cloth" ? upgrade.clothBonus : upgrade.clothingBonus),
    seconds: Math.ceil(recipe.seconds * (100 - upgrade.timeReduction) / 100),
  }
}

export const SOLDIER_COST = { food: 45, gold: 20 } as const
export const SOLDIER_SECONDS = 60
export const ARCHER_COST = { food: 50, gold: 30 } as const
export const ARCHER_SECONDS = 75
export const FORGE_UPGRADES = {
  1: { name: "Bronze", seconds: 60, costs: { tools: { wood: 20, iron: 10 }, weapons: { iron: 25, gold: 15 }, armor: { iron: 30, gold: 15 } } },
  2: { name: "Ferro", seconds: 180, costs: { tools: { wood: 45, iron: 35 }, weapons: { iron: 55, gold: 35 }, armor: { iron: 65, gold: 40 } } },
  3: { name: "Ouro", seconds: 300, costs: { tools: { wood: 80, iron: 60, gold: 45 }, weapons: { iron: 100, gold: 70 }, armor: { iron: 110, gold: 80 } } },
  4: { name: "Aço reforçado", seconds: 480, costs: { tools: { wood: 140, iron: 130, gold: 80 }, weapons: { iron: 180, gold: 125, stone: 60 }, armor: { iron: 200, gold: 140, stone: 80 } } },
} as const
export const MAX_FORGE_LEVEL = 4
export const MARKET_RATES = {
  food: { amount: 10, gold: 1 },
  wood: { amount: 10, gold: 2 },
  stone: { amount: 10, gold: 3 },
  iron: { amount: 10, gold: 5 },
} as const
export const MARKET_BUY_RATES = {
  food: { amount: 10, gold: 2 },
  wood: { amount: 10, gold: 4 },
  stone: { amount: 10, gold: 6 },
  iron: { amount: 10, gold: 10 },
} as const
export const MARKET_CYCLE_BUDGET = 1000
export const MARKET_PRODUCT_RATES = {
  nails: { amount: 5, coins: 3 }, cloth: { amount: 2, coins: 4 }, clothing: { amount: 1, coins: 6 },
  tools: { amount: 1, coins: 8 }, weapons: { amount: 1, coins: 12 }, armor: { amount: 1, coins: 16 },
  milk: { amount: 10, coins: 2 }, wool: { amount: 10, coins: 3 }, eggs: { amount: 10, coins: 2 }, feathers: { amount: 10, coins: 1 },
} as const
export const SEED_PRICES = { carrot: 1, wheat: 2, potato: 2, tree: 5 } as const
export const SEED_BUNDLE_SIZE = 5
export const TREE_GROW_SECONDS = 10 * 60
export const isRetainedNode = (node: ResourceNode) =>
  node.kind !== "branch" && (node.kind !== "rock" || node.variant % 3 === 0)
export const RESEARCH: Record<
  Research,
  {
    name: string
    description: string
    levelNames: Record<1 | 2 | 3, string>
    levelEffects: Record<1 | 2 | 3, string>
    costs: Record<number, Partial<Resources>>
  }
> = {
  workers: {
    name: "Transporte dos aldeões",
    description:
      "+15% de velocidade, +2 recursos leves por coleta e +10% de colheita por nível. Pedra e ouro pesam mais.",
    levelNames: { 1: "Cestos de coleta", 2: "Carrinho de mão", 3: "Carroça de mão" },
    levelEffects: {
      1: "Aldeões andam 15% mais rápido, coletam +2 recursos leves por viagem e colhem 10% mais comida. Pedra e ouro pesam mais.",
      2: "Aldeões andam 30% mais rápido, coletam +4 recursos leves por viagem e colhem 20% mais comida. Pedra e ouro pesam mais.",
      3: "Aldeões andam 45% mais rápido, coletam +6 recursos leves por viagem e colhem 30% mais comida. Pedra e ouro pesam mais.",
    },
    costs: {
      1: { food: 25, wood: 20 },
      2: { food: 50, wood: 40, iron: 10 },
      3: { food: 80, stone: 40, iron: 20 },
    },
  },
  agriculture: {
    name: "Arados do moinho",
    description: "+15% de comida por colheita e +10% de crescimento por nível.",
    levelNames: { 1: "Arado de madeira", 2: "Arado de ferro", 3: "Arado reforçado" },
    levelEffects: {
      1: "Fazendas produzem 15% mais comida por colheita e crescem 10% mais rápido.",
      2: "Fazendas produzem 30% mais comida por colheita e crescem 20% mais rápido.",
      3: "Fazendas produzem 45% mais comida por colheita e crescem 30% mais rápido.",
    },
    costs: {
      1: { wood: 25, food: 20 },
      2: { wood: 45, stone: 20, food: 35, iron: 15 },
      3: { wood: 70, stone: 40, iron: 45 },
    },
  },
  fertilizer: {
    name: "Adubação",
    description: "+20% de comida por colheita e +15% de crescimento por nível.",
    levelNames: { 1: "Compostagem", 2: "Adubo orgânico", 3: "Solo enriquecido" },
    levelEffects: {
      1: "+20% de comida e +15% de crescimento nas fazendas.",
      2: "+40% de comida e +30% de crescimento nas fazendas.",
      3: "+60% de comida e +45% de crescimento nas fazendas.",
    },
    costs: {
      1: { food: 20, wood: 20 },
      2: { food: 40, stone: 20 },
      3: { food: 60, stone: 35, iron: 10 },
    },
  },
  irrigation: {
    name: "Irrigação",
    description: "+20% de velocidade de crescimento por nível.",
    levelNames: { 1: "Regadores", 2: "Canais de irrigação", 3: "Reservatórios" },
    levelEffects: {
      1: "+20% de velocidade de crescimento das plantações.",
      2: "+40% de velocidade de crescimento das plantações.",
      3: "+60% de velocidade de crescimento das plantações.",
    },
    costs: {
      1: { wood: 25, stone: 15 },
      2: { wood: 45, stone: 30, iron: 10 },
      3: { wood: 70, stone: 50, iron: 20 },
    },
  },
}
export const BUILDINGS = {
  townCenter: { name: "Centro urbano", width: 4, height: 4, cost: {} },
  barn: { name: "Celeiro", width: 3, height: 3, cost: { wood: 60, stone: 25 } },
  farm: { name: "Fazenda", width: 2, height: 2, cost: { wood: 15 } },
  house: { name: "Casa", width: 2, height: 2, cost: { wood: 35, stone: 10, food: 100 } },
  well: { name: "Poço", width: 2, height: 2, cost: { wood: 40, stone: 30 } },
  wall: { name: "Muro", width: 1, height: 1, cost: { wood: 8, stone: 12 } },
  gate: { name: "Portão", width: 2, height: 1, cost: { wood: 35, stone: 30, iron: 5 } },
  tower: { name: "Torre", width: 2, height: 2, cost: { wood: 55, stone: 110, iron: 15 } },
  blacksmith: { name: "Ferraria", width: 3, height: 3, cost: { wood: 100, stone: 80, iron: 20 } },
  weaving: { name: "Tecelagem", width: 3, height: 3, cost: { wood: 90, stone: 35 } },
  barracks: { name: "Quartel", width: 3, height: 3, cost: { wood: 150, stone: 100, iron: 25 } },
  ranch: { name: "Curral", width: 2, height: 2, cost: { wood: 50, stone: 10 } },
} satisfies Record<
  BuildingKind,
  { name: string; width: number; height: number; cost: Partial<Resources> }
>
/** Minimum empty tiles between a resource's root and each structure's footprint. */
export const BUILDING_RESOURCE_RADIUS: Record<BuildingKind, number> = {
  townCenter: 3, barn: 2, farm: 2, house: 2, well: 2, wall: 1,
  gate: 2, tower: 3, blacksmith: 2, weaving: 2, barracks: 3, ranch: 2,
}
export const resourceNearBuilding = (
  point: Point,
  kind: ResourceNode["kind"],
  building: Building,
) => {
  const radius = BUILDING_RESOURCE_RADIUS[building.kind] + (kind === "tree" ? 1 : 0)
  const dx = Math.max(building.x - point.x, point.x - (building.x + building.width - 1), 0)
  const dy = Math.max(building.y - point.y, point.y - (building.y + building.height - 1), 0)
  return Math.max(dx, dy) <= radius
}
export const CROPS = {
  carrot: { name: "Cenoura", cropId: "carrot-crop", seconds: 30, yield: 6 },
  wheat: { name: "Trigo", cropId: "wheat-crop", seconds: 45, yield: 10 },
  potato: { name: "Batata", cropId: "potato-crop", seconds: 36, yield: 8 },
} satisfies Record<
  Crop,
  { name: string; cropId: string; seconds: number; yield: number }
>
export const UPGRADE_COSTS: Record<number, Partial<Resources>> = {
  2: { wood: 35, food: 20 },
  3: { wood: 60, stone: 25, food: 40 },
}
export const RESOURCE_NAMES = {
  wood: "Madeira",
  stone: "Pedra",
  food: "Comida",
  iron: "Ferro",
  gold: "Ouro",
}
export const NODE_RESOURCE = {
  tree: "wood",
  branch: "wood",
  rock: "stone",
  iron: "iron",
  gold: "gold",
  berryBush: "food",
} as const
export const GATHER_SECONDS_PER_ITEM: Readonly<Record<Resource, number>> = {
  wood: 2, stone: 4, food: 2, iron: 4, gold: 4,
}
export const GATHER_CARRY_LIMITS: Readonly<Record<Resource, { initial: number; maximum: number }>> = {
  wood: { initial: 8, maximum: 12 },
  stone: { initial: 2, maximum: 7 },
  food: { initial: 8, maximum: 15 },
  iron: { initial: 8, maximum: 10 },
  gold: { initial: 1, maximum: 6 },
}
export const gatherCarryCapacity = (s: VillageState, resource: Resource, unit?: Unit) => {
  const limits = GATHER_CARRY_LIMITS[resource]
  if (unit && unit.kind !== "villager") return limits.initial
  const upgrades = Math.min(7, s.research.workers + (s.toolLevel ?? 0))
  return limits.initial + Math.floor((limits.maximum - limits.initial) * upgrades / 7)
}
export const RESOURCE_NODE_AMOUNTS = { tree: 80, rock: 300, iron: 80, gold: 240, berryBush: 20 } as const
export const TOWN_CENTER_STORAGE: Readonly<Resources> = { wood: 100, stone: 100, food: 0, iron: 0, gold: 100 }
export const storageCapacities = (s: VillageState): Resources => {
  const limits: Resources = s.buildings.some((b) => b.kind === "townCenter" && !b.construction)
    ? { ...TOWN_CENTER_STORAGE }
    : { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 }
  for (const barn of s.buildings.filter((b) => b.kind === "barn" && !b.construction)) {
    for (const resource of Object.keys(limits) as (keyof Resources)[])
      limits[resource] += BARN_CAPACITIES[barn.level][resource]
  }
  return limits
}
export const productStorageCapacities = (s: VillageState): AnimalProducts => {
  const limits: AnimalProducts = { milk: 0, wool: 0, eggs: 0, feathers: 0 }
  for (const barn of s.buildings.filter((b) => b.kind === "barn" && !b.construction)) {
    for (const product of Object.keys(limits) as (keyof AnimalProducts)[])
      limits[product] += BARN_PRODUCT_CAPACITIES[barn.level][product]
  }
  return limits
}
export const populationCapacity = (s: VillageState) =>
  5 + s.buildings
    .filter((b) => b.kind === "house" && !b.construction)
    .reduce((total, house) => total + HOUSE_CAPACITIES[house.level as 1 | 2 | 3], 0)
export const WELL_RADIUS_TILES = 8
export const wellAffectsFarm = (
  well: Point & { width: number; height: number },
  farm: Point & { width: number; height: number },
) => {
  const dx = Math.max(0, farm.x - (well.x + well.width), well.x - (farm.x + farm.width))
  const dy = Math.max(0, farm.y - (well.y + well.height), well.y - (farm.y + farm.height))
  return Math.max(dx, dy) <= WELL_RADIUS_TILES
}
export const farmHasWell = (s: VillageState, farm: Building) =>
  s.buildings.some((b) => b.kind === "well" && !b.construction && wellAffectsFarm(b, farm))
export const farmWorkers = (s: VillageState, farmId: string) =>
  s.units.filter((u) => u.job.kind === "farm" && u.job.targetId === farmId)
export const workerEfficiency = (s: VillageState, u: Unit) => {
  if (u.kind !== "villager") return 1
  const satisfaction = s.city?.satisfaction ?? 60
  const morale = satisfaction >= 85 ? 1.1 : satisfaction >= 70 ? 1.05 : satisfaction < 20 ? 0.6 : satisfaction < 35 ? 0.75 : satisfaction < 50 ? 0.9 : 1
  const payrollFoodShortage = (s.city?.lastPayroll.foodDue ?? 0) > (s.city?.lastPayroll.foodServed ?? 0)
  return morale * (s.economy.foodShortage || payrollFoodShortage ? 0.5 : 1)
}
export const hourlyProvisionCost = (s: VillageState, policy: ProvisionPolicy = s.city?.provisions ?? DEFAULT_PROVISIONS) => {
  const villagers = s.units.filter((unit) => unit.kind === "villager").length
  const soldiers = s.units.filter((unit) => unit.kind === "soldier" || unit.kind === "archer").length
  return {
    villagers, soldiers,
    gold: villagers * policy.villagerGold + soldiers * policy.soldierGold,
    food: villagers * policy.villagerFood + soldiers * policy.soldierFood,
  }
}
export const soldierDamage = (
  s: VillageState,
  kind: "soldier" | "archer",
  provision = s.city?.activeSoldierProvision ?? { gold: DEFAULT_PROVISIONS.soldierGold, food: DEFAULT_PROVISIONS.soldierFood },
) => {
  const base = (kind === "archer" ? 18 : 14) + (s.weaponLevel ?? 0) * 5
  const multiplier = 0.55 + 0.25 * (provision.gold / DEFAULT_PROVISIONS.soldierGold) +
    0.2 * (provision.food / DEFAULT_PROVISIONS.soldierFood)
  return Math.max(1, Math.round(base * multiplier))
}
export const towerArcherDamage = (s: VillageState, towerLevel: number) => {
  const provision = s.city?.activeSoldierProvision ?? { gold: DEFAULT_PROVISIONS.soldierGold, food: DEFAULT_PROVISIONS.soldierFood }
  const multiplier = 0.55 + 0.25 * (provision.gold / DEFAULT_PROVISIONS.soldierGold) +
    0.2 * (provision.food / DEFAULT_PROVISIONS.soldierFood)
  return Math.max(1, Math.round((9 + towerLevel * 4 + (s.weaponLevel ?? 0) * 3) * multiplier))
}
export const workerSpeed = (s: VillageState, u: Unit) =>
  (u.kind === "villager" ? 1.25 : 2) *
  (u.kind === "villager" ? 1 + s.research.workers * 0.15 + (s.toolLevel ?? 0) * 0.1 : 1) *
  workerEfficiency(s, u) *
  (u.kind === "villager" && u.carrying
    ? 1 / (1 + u.carrying.amount * (["stone", "gold"].includes(u.carrying.resource) ? 0.07 : 0.012))
    : 1)
export const farmYield = (s: VillageState, farm: Building, u?: Unit) =>
  Math.ceil(
    CROPS[farm.crop!].yield *
      farm.level *
      (1 + s.research.agriculture * 0.15 + s.research.fertilizer * 0.2) *
      (u?.kind === "villager" ? 1 + s.research.workers * 0.1 : 1),
  )
export const farmGrowthMultiplier = (s: VillageState, workers: Unit[], farm?: Building) =>
  (1 +
    s.research.agriculture * 0.1 +
    s.research.fertilizer * 0.15 +
    s.research.irrigation * 0.2) *
  (1 +
    Math.max(0, workers.reduce((n, u) => n + workerEfficiency(s, u), 0) - 1) *
      0.25) *
  (farm && farmHasWell(s, farm) ? 2 : 1)
export const farmPotential = (s: VillageState, farm: Building) => {
  const workers = farmWorkers(s, farm.id)
  const work = workers.reduce(
    (n, u) =>
      n +
      workerEfficiency(s, u) *
        (u.kind === "villager" ? 1 + s.research.workers * 0.15 : 1),
    0,
  )
  if (!work) return 0
  const seconds =
    (FARM_PLANT_SECONDS + FARM_HARVEST_SECONDS) / work +
    CROPS[farm.crop!].seconds / farmGrowthMultiplier(s, workers, farm)
  return workers.reduce((n, u) => n + farmYield(s, farm, u), 0) / seconds
}
export const productionRate = (
  s: VillageState,
  samples: { at: number; amount: number }[],
) =>
  samples
    .filter((p) => p.at > s.economy.elapsed - PRODUCTION_WINDOW)
    .reduce((n, p) => n + p.amount, 0) /
  Math.max(1, Math.min(PRODUCTION_WINDOW, s.economy.elapsed))
export const upkeepCost = (s: VillageState) =>
  s.buildings.filter((building) => building.kind === "house" && !building.construction)
    .reduce((total, house) => total + HOUSE_UPKEEP_PER_LEVEL[house.level as 1 | 2 | 3], 0) +
  s.buildings.reduce((sum, b) => sum + (b.ranch?.animals.length ?? 0), 0) * UPKEEP_PER_ANIMAL
export const storedTotal = (s: VillageState) =>
  Object.values(s.resources).reduce((a, b) => a + b, 0)
export const inside = (
  p: Point,
  rect: Point & { width: number; height: number },
) =>
  p.x >= rect.x &&
  p.x < rect.x + rect.width &&
  p.y >= rect.y &&
  p.y < rect.y + rect.height
export const isLand = (x: number, y: number, size = VILLAGE_SIZE) => {
  if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) return false
  // Rounded shores; the entire interior is available for expansion.
  const dx = Math.max(0, 4 - Math.min(x, size - 1 - x))
  const dy = Math.max(0, 4 - Math.min(y, size - 1 - y))
  return dx * dx + dy * dy < 17
}
