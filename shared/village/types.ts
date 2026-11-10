import type { MapSurface } from "./mapSurfaces"
export type { MapSurface } from "./mapSurfaces"

export type Resource = "wood" | "stone" | "food" | "iron" | "gold"
export type Resources = Record<Resource, number>
export interface Point {
  x: number
  y: number
}
export type Crop = "carrot" | "wheat" | "potato"
export type SeedKind = Crop | "tree"
export type SeedStock = Record<SeedKind, number>
export interface Sapling extends Point {
  id: string
  startedAt: number
  finishAt: number
}
export type BuildingKind = "townCenter" | "barn" | "farm" | "house" | "well" | "wall" | "gate" | "tower" | "blacksmith" | "weaving" | "barracks" | "ranch"
export type AnimalKind = "pig" | "cow" | "sheep" | "chicken"
export type AnimalProduct = "milk" | "wool" | "eggs" | "feathers"
export type AnimalProducts = Record<AnimalProduct, number>
export type CraftItem = "nails" | "cloth" | "clothing" | "tools" | "weapons" | "armor"
export type CraftStock = Record<CraftItem, number>
export type FarmPhase = "planting" | "growing" | "harvesting"
export interface Building extends Point {
  id: string
  kind: BuildingKind
  width: number
  height: number
  level: number
  crop?: Crop
  growth: number
  productionLog?: ProductionSample[]
  farmCycle?: { phase: FarmPhase; progress: number; seedPaid?: boolean }
  construction?: { builderId: string; progress: number; duration: number }
  production?: { item: CraftItem | "soldier" | "archer"; progress: number; duration: number; remaining?: number; total?: number }
  ranch?: { kind: AnimalKind | null; animals: { id: string; kind: AnimalKind; growth: number }[]; breedingElapsed?: number }
  attackProgress?: number
}
export interface ProductionSample {
  at: number
  amount: number
}
export type Research = "workers" | "agriculture" | "fertilizer" | "irrigation"
export type Improvement =
  | {
      kind: "forge"
      track: "tools" | "weapons" | "armor"
      targetLevel: 1 | 2 | 3 | 4
      startedAt: number
      finishAt: number
    }
  | {
      kind: "research"
      research: Research
      targetLevel: 1 | 2 | 3
      startedAt: number
      finishAt: number
    }
  | {
      kind: "building"
      buildingId: string
      targetLevel: 2 | 3 | 4 | 5 | 6 | 7 | 8
      startedAt: number
      finishAt: number
    }
export interface FarmBlueprint {
  id: string
  crop: Crop
  level: number
  growth: number
}
export interface ResourceNode extends Point {
  id: string
  kind: "tree" | "rock" | "branch" | "iron" | "gold" | "berryBush"
  amount: number
  /** Game time when an exhausted deposit refills in place. */
  regeneratesAt?: number
  variant: number
}
export type MapElevation = 0 | 1 | 2
export interface VillageMapTile {
  surface: MapSurface
  elevation: MapElevation
}
export type MapResourceKind = Exclude<ResourceNode["kind"], "branch">
export interface VillageMapEdit extends Point {
  surface?: MapSurface
  elevation?: MapElevation
  resource?: MapResourceKind | null
  building?: BuildingKind | null
}
export type Job =
  | { kind: "idle" }
  | { kind: "move"; destination: Point }
  | { kind: "attackCreature"; targetId: string }
  | { kind: "garrison"; targetId: string }
  | { kind: "plant"; destination: Point }
  | { kind: "farm" | "gather" | "build" | "ranch"; targetId: string }
export interface Unit extends Point {
  id: string
  name: string
  kind: "hero" | "villager" | "soldier" | "archer"
  armored?: boolean
  job: Job
  status:
    | "idle"
    | "walking"
    | "working"
    | "delivering"
    | "storageFull"
    | "blocked"
    | "planting"
    | "waiting"
    | "harvesting"
    | "building"
  path: Point[]
  work: number
  carrying: { resource: Resource; amount: number } | null
  /** Loads set aside when a player gives a new order before delivery. */
  stowed?: Partial<Resources>
  wallQueue?: string[]
  facing: "left" | "right" | "up" | "down"
  health?: number
  maxHealth?: number
}
export interface WildCreature extends Point {
  id: string
  kind: "wolf" | "bear"
  health: number
  maxHealth: number
  hostileTo?: string
  attackProgress: number
}
export interface VillageState {
  version: 4
  /** Initial placement of natural resources; persisted after changing the layout. */
  resourceLayout?: 2
  mapTiles?: Record<string, VillageMapTile>
  width: number
  height: number
  resources: Resources
  crafts?: CraftStock
  animalProducts?: AnimalProducts
  toolLevel?: number
  weaponLevel?: number
  armorLevel?: number
  buildings: Building[]
  nodes: ResourceNode[]
  seeds: SeedStock
  saplings: Sapling[]
  /** One-time marker for migration-safe initial berry bush placement. */
  foodBushesSeeded?: boolean
  units: Unit[]
  creatures?: WildCreature[]
  creatureSpawnAt?: number
  creatureHasSpawned?: boolean
  /** Aldeões pagos e reservados, treinados em sequência no Centro da Vila. */
  recruitment?: { remaining: number; progress: number }
  research: Record<Research, number>
  /** Optional for existing version 4 saves created before timed upgrades. */
  improvements?: Improvement[]
  /** Kept empty for clients/saves from version 2. Farms cannot be relocated. */
  farmBlueprints: FarmBlueprint[]
  economy: {
    elapsed: number
    /** Absent in legacy saves, whose opening unlocks remain available. */
    foundation?: { firstDelivery: boolean; harvestedFood: number }
    upkeepElapsed: number
    foodShortage: boolean
    foodIncome: ProductionSample[]
  }
}
export type VillageCommand =
  | { type: "editVillageMap"; edits: VillageMapEdit[] }
  | { type: "build"; kind: Exclude<BuildingKind, "townCenter">; x: number; y: number; crop?: Crop; unitId?: string }
  | { type: "buildWallLine"; unitId: string; x1: number; y1: number; x2: number; y2: number }
  | { type: "assignUnit"; unitId: string; targetId: string }
  | { type: "moveUnit"; unitId: string; x: number; y: number }
  | { type: "stopUnit"; unitId: string }
  | { type: "killVillager"; unitId: string }
  | { type: "collectBranch"; nodeId: string }
  | { type: "upgradeFarm"; buildingId: string }
  | { type: "upgradeBarn"; buildingId: string }
  | { type: "upgradeRanch"; buildingId: string }
  | { type: "upgradeWeaving"; buildingId: string }
  | { type: "upgradeDefense"; buildingId: string }
  | { type: "upgradeHouse"; buildingId: string }
  | { type: "upgradeTownCenter" }
  | { type: "demolishFarm"; buildingId: string }
  | { type: "demolishBarn"; buildingId: string }
  | { type: "demolishHouse"; buildingId: string }
  | { type: "demolishWell"; buildingId: string }
  | { type: "demolishBuilding"; buildingId: string }
  | { type: "craftItem"; buildingId: string; item: CraftItem; amount?: number }
  | { type: "upgradeTools" }
  | { type: "upgradeWeapons" }
  | { type: "upgradeArmor" }
  | { type: "trainSoldier"; buildingId: string; amount?: number }
  | { type: "trainArcher"; buildingId: string; amount?: number }
  | { type: "garrisonArcher"; unitId: string; towerId: string }
  | { type: "ungarrisonArcher"; unitId: string }
  | { type: "attackCreature"; unitId: string; creatureId: string }
  | { type: "stockRanch"; buildingId: string; animal: AnimalKind; amount?: number }
  | { type: "equipSoldier"; unitId: string }
  | {
      type: "sellResource"
      resource: Exclude<Resource, "gold">
      amount: number
    }
  | { type: "buyResource"; resource: Exclude<Resource, "gold">; amount: number }
  | { type: "buySeeds"; seed: SeedKind; amount: number }
  | { type: "plantTree"; unitId: string; x: number; y: number }
  | { type: "relocateTownCenter"; x: number; y: number }
  | { type: "recruitVillager"; amount?: number }
  | { type: "research"; research: Research }
