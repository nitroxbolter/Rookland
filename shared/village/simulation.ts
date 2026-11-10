import type {
  Building,
  Point,
  Resource,
  Resources,
  Unit,
  VillageCommand,
  VillageState,
  SeedKind,
  ResourceNode,
  CraftItem,
  AnimalKind,
  WildCreature,
} from "./types"
import { commerceGoals, townLevel, unlockReason } from "./progression"
import { isVillageGround, prepareVillageMapEdits, validVillageMapTiles } from "./map"
import {
  BUILDINGS,
  CROPS,
  inside,
  isLand,
  NODE_RESOURCE,
  storageCapacities,
  TOWN_CENTER_STORAGE,
  RESOURCE_NODE_AMOUNTS,
  UPGRADE_COSTS,
  VILLAGE_SIZE,
  BARN_UPGRADE_COSTS,
  HOUSE_UPGRADE_COSTS,
  TOWN_UPGRADE_COSTS,
  populationCapacity,
  wellAffectsFarm,
  MAX_FARM_WORKERS,
  RECRUIT_COST,
  RECRUIT_SECONDS,
  RESEARCH,
  UPKEEP_INTERVAL,
  PRODUCTION_WINDOW,
  farmWorkers,
  farmYield,
  farmGrowthMultiplier,
  workerSpeed,
  workerEfficiency,
  upkeepCost,
  FARM_PLANT_SECONDS,
  FARM_HARVEST_SECONDS,
  MARKET_RATES,
  MARKET_BUY_RATES,
  SEED_PRICES,
  SEED_BUNDLE_SIZE,
  TREE_GROW_SECONDS,
  isRetainedNode,
  IMPROVEMENT_SECONDS,
  BUILD_SECONDS,
  BUILDING_UNLOCK_LEVEL,
  CRAFT_RECIPES,
  craftOutput,
  WEAVING_UPGRADES,
  SOLDIER_COST,
  SOLDIER_SECONDS,
  ARCHER_COST,
  ARCHER_SECONDS,
  FORGE_UPGRADES,
  MAX_FORGE_LEVEL,
  ANIMALS,
  RANCH_CAPACITIES,
  RANCH_UPGRADE_COSTS,
  DEFENSE_UPGRADE_COSTS,
  RANCH_HARVEST_SECONDS,
  RANCH_BREED_SECONDS,
  RANCH_BREED_FOOD_COST,
  productStorageCapacities,
  resourceNearBuilding,
} from "./config"
export { populationCapacity } from "./config"

export function createVillage(): VillageState {
  const s: VillageState = {
    version: 4,
    research: { workers: 0, agriculture: 0, fertilizer: 0, irrigation: 0 },
    improvements: [],
    recruitment: { remaining: 0, progress: 0 },
    farmBlueprints: [],
    economy: {
      elapsed: 0,
      foundation: { firstDelivery: false, harvestedFood: 0 },
      upkeepElapsed: 0,
      foodShortage: false,
      foodIncome: [],
    },
    width: 32,
    height: 32,
    resources: { wood: 80, stone: 40, food: 20, iron: 0, gold: 0 },
    animalProducts: { milk: 0, wool: 0, eggs: 0, feathers: 0 },
    buildings: [
      {
        id: "town-center",
        kind: "townCenter",
        x: 14,
        y: 12,
        width: 4,
        height: 4,
        level: 1,
        growth: 0,
      },
      {
        id: "starter-farm",
        kind: "farm",
        x: 11,
        y: 18,
        width: 4,
        height: 4,
        level: 1,
        crop: "carrot",
        growth: 0,
        farmCycle: { phase: "planting", progress: 0, seedPaid: true },
      },
    ],
    nodes: [],
    seeds: { carrot: 5, wheat: 5, potato: 5, tree: 3 },
    saplings: [],
    crafts: { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 },
    toolLevel: 0,
    weaponLevel: 0,
    armorLevel: 0,
    foodBushesSeeded: false,
    units: [
      {
        id: "hero",
        name: "Explorador",
        kind: "hero",
        x: 16,
        y: 17,
        job: { kind: "idle" },
        status: "idle",
        path: [],
        work: 0,
        carrying: null,
        facing: "right",
        health: 100,
        maxHealth: 100,
      },
      {
        id: "villager-1",
        name: "Aldeão",
        kind: "villager",
        x: 15,
        y: 18,
        job: { kind: "idle" },
        status: "idle",
        path: [],
        work: 0,
        carrying: null,
        facing: "left",
        health: 35,
        maxHealth: 35,
      },
    ],
    creatures: [],
    creatureSpawnAt: 0,
    creatureHasSpawned: false,
  }
  expandVillage(s)
  seedResourceRegions(s)
  seedFoodBushes(s)
  return s
}

function seedFoodBushes(s: VillageState) {
  if (s.foodBushesSeeded) return
  const groups = [[17, 22], [64, 15], [15, 64], [64, 64]] as const
  const offsets = [[0, 0], [-1, 0], [1, 0]] as const
  let serial = 0
  for (const [cx, cy] of groups)
    for (const [dx, dy] of offsets) {
      const x = cx + dx
      const y = cy + dy
      if (
        !hasResourceLand(x, y, s.width) ||
        s.buildings.some((building) => resourceNearBuilding({ x, y }, "berryBush", building)) ||
        s.nodes.some((node) => node.x === x && node.y === y) ||
        s.units.some((unit) => Math.round(unit.x) === x && Math.round(unit.y) === y)
      ) continue
      s.nodes.push({
        id: `berry-bush-start-${serial++}`,
        kind: "berryBush",
        x,
        y,
        amount: 20,
        variant: serial % 4,
      })
    }
  s.foodBushesSeeded = true
}

function expandVillage(s: VillageState) {
  if (s.width >= VILLAGE_SIZE && s.height >= VILLAGE_SIZE) return
  const offsetX = Math.floor((VILLAGE_SIZE - s.width) / 2)
  const offsetY = Math.floor((VILLAGE_SIZE - s.height) / 2)
  for (const building of s.buildings) {
    building.x += offsetX
    building.y += offsetY
  }
  for (const node of s.nodes) {
    node.x += offsetX
    node.y += offsetY
  }
  for (const sapling of s.saplings ?? []) {
    sapling.x += offsetX
    sapling.y += offsetY
  }
  for (const unit of s.units) {
    unit.x += offsetX
    unit.y += offsetY
    unit.path = []
    if (unit.job.kind === "move" || unit.job.kind === "plant") {
      unit.job.destination.x += offsetX
      unit.job.destination.y += offsetY
    }
  }
  s.width = VILLAGE_SIZE
  s.height = VILLAGE_SIZE

}

const DEPOSIT_AMOUNTS: Partial<Record<ResourceNode["kind"], number>> = {
  rock: RESOURCE_NODE_AMOUNTS.rock, iron: RESOURCE_NODE_AMOUNTS.iron, gold: RESOURCE_NODE_AMOUNTS.gold,
}
const DEPOSIT_REGEN_SECONDS = 5 * 60
const occupiesResourceTile = (node: ResourceNode) => node.amount > 0 || node.regeneratesAt !== undefined

function seedResourceRegions(s: VillageState, includeIron = true) {
  const occupied = new Set(s.nodes.map(key))
  const addNode = (region: string, kind: ResourceNode["kind"], x: number, y: number, variant: number) => {
    const point = { x, y }
    if (!hasResourceLand(x, y, s.width) || occupied.has(key(point)) ||
      s.buildings.some((building) => inside(point, building)) ||
      s.saplings.some((sapling) => key(sapling) === key(point)) ||
      s.units.some((unit) => key(cell(unit)) === key(point))) return
    occupied.add(key(point))
    s.nodes.push({ id: region + "-" + x + "-" + y, kind, x, y, amount: DEPOSIT_AMOUNTS[kind] ?? 240, variant })
  }
  const forests = [
    { x: 14, y: 40, rx: 11, ry: 27 },
    { x: 25, y: 15, rx: 20, ry: 11 },
    { x: 25, y: 65, rx: 20, ry: 11 },
    { x: 67, y: 30, rx: 4, ry: 4 },
    { x: 72, y: 48, rx: 5, ry: 4 },
    { x: 57, y: 57, rx: 3, ry: 4 },
  ]
  for (let y = 3; y < s.height - 2; y += 2) {
    for (let x = 3 + (Math.floor(y / 2) % 2); x < s.width - 2; x += 2) {
      if (forests.some((forest) => ((x - forest.x) / forest.rx) ** 2 + ((y - forest.y) / forest.ry) ** 2 <= 1))
        addNode("c-forest", "tree", x, y, (x * 7 + y * 3) % 5)
    }
  }
  const quarry = [[67, 66, 0], [68, 66, 6], [69, 66, 3], [67, 67, 3], [68, 67, 0]]
  for (const [x, y, size] of quarry) addNode("se-quarry", "rock", x, y, size)
  for (const x of [74, 75, 76]) addNode("ne-gold", "gold", x, 5, x % 3)
  if (includeIron) {
    for (let dy = -5; dy <= 5; dy += 2)
      for (let dx = -6 + Math.floor((dy + 5) / 2) % 2; dx <= 6; dx += 2)
        if ((dx / 6) ** 2 + (dy / 5) ** 2 <= 1)
          addNode("iron-mine", "iron", 58 + dx, 13 + dy, ((58 + dx) * 7 + (13 + dy) * 3) % 4)
  }
  s.resourceLayout = 2
}

const FIRST_LAYOUT_NODE = /^(west-forest|north-woods|southwest-woods|south-woods|east-woods|stone-quarry|gold-mine)-[0-9]+-[0-9]+$/
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

function migrateResourceRegions(s: VillageState) {
  if (s.resourceLayout === 2) return
  const moved = s.nodes.filter((node) => FIRST_LAYOUT_NODE.test(node.id))
  if (!moved.length) return

  const oldById = new Map(moved.map((node) => [node.id, node]))
  const oldTrees = new Map(moved.filter((node) => node.kind === "tree").map((node) => [key(node), node]))
  s.nodes = s.nodes.filter((node) => !oldById.has(node.id))
  const firstNew = s.nodes.length
  seedResourceRegions(s, false)
  const newNodes = s.nodes.slice(firstNew)
  const replacements = new Map<string, ResourceNode>()

  for (const node of newNodes) {
    const previous = node.kind === "tree" ? oldTrees.get(key(node)) : undefined
    if (!previous) continue
    node.amount = previous.amount
    replacements.set(previous.id, node)
  }
  for (const kind of ["rock", "gold"] as const) {
    const available = newNodes.filter((node) => node.kind === kind)
    // Keep partially mined or regenerating deposits when reducing the number of nodes.
    const used = moved.filter((node) => node.kind === kind && node.amount < DEPOSIT_AMOUNTS[kind]!)
      .sort((a, b) => a.amount - b.amount)
    for (const previous of used) {
      available.sort((a, b) => distance(a, previous) - distance(b, previous))
      const node = available.shift()
      if (!node) break
      node.amount = previous.amount
      if (previous.regeneratesAt !== undefined) node.regeneratesAt = previous.regeneratesAt
      replacements.set(previous.id, node)
    }
  }
  for (const unit of s.units) {
    unit.path = []
    if (unit.job.kind !== "gather") continue
    const previous = oldById.get(unit.job.targetId)
    if (!previous) continue
    const replacement = replacements.get(previous.id) ?? newNodes
      .filter((node) => node.kind === previous.kind && node.amount > 0)
      .sort((a, b) => distance(a, unit) - distance(b, unit))[0]
    unit.job = replacement ? { kind: "gather", targetId: replacement.id } : { kind: "idle" }
    unit.work = 0
  }
}

const cell = (u: Point): Point => ({ x: Math.round(u.x), y: Math.round(u.y) })
const key = (p: Point) => `${p.x},${p.y}`
function hasResourceLand(x: number, y: number, size: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!isLand(x + dx, y + dy, size)) return false
  return true
}
function nearestResourceLand(s: VillageState, origin: Point, kind: ResourceNode["kind"], ignoreNodeId?: string, ignoreSaplingId?: string) {
  const candidates: Point[] = []
  for (let y = 2; y < s.height - 2; y++)
    for (let x = 2; x < s.width - 2; x++)
      if (
        isVillageGround(s, x, y) &&
        !s.buildings.some((building) => resourceNearBuilding({ x, y }, kind, building)) &&
        !s.nodes.some((node) => node.id !== ignoreNodeId && node.x === x && node.y === y && occupiesResourceTile(node)) &&
        !s.saplings.some((sapling) => sapling.id !== ignoreSaplingId && sapling.x === x && sapling.y === y) &&
        !s.units.some((unit) => Math.round(unit.x) === x && Math.round(unit.y) === y)
      ) candidates.push({ x, y })
  candidates.sort(
    (a, b) =>
      Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) -
      (Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y)),
  )
  return candidates[0]
}
function clearResourcesNearBuildings(s: VillageState) {
  for (const node of s.nodes) {
    if (hasResourceLand(node.x, node.y, s.width) &&
      !s.buildings.some((building) => resourceNearBuilding(node, node.kind, building))) continue
    const safe = nearestResourceLand(s, node, node.kind, node.id)
    if (safe) Object.assign(node, safe)
    else node.amount = 0
  }
  s.nodes = s.nodes.filter((node) => node.amount > 0)
  for (const sapling of s.saplings) {
    if (hasResourceLand(sapling.x, sapling.y, s.width) &&
      !s.buildings.some((building) => resourceNearBuilding(sapling, "tree", building))) continue
    const safe = nearestResourceLand(s, sapling, "tree", undefined, sapling.id)
    if (safe) Object.assign(sapling, safe)
    else sapling.finishAt = s.economy.elapsed
  }
  s.saplings = s.saplings.filter((sapling) => sapling.finishAt > s.economy.elapsed)
  for (const unit of s.units) unit.path = []
}
function accessibleFarms(s: VillageState, start: Point): ReadonlySet<string> {
  const ids = new Set<string>()
  const job = (start as Point & { job?: Unit["job"] }).job
  if (job?.kind === "farm") ids.add(job.targetId)
  const origin = cell(start)
  for (const building of s.buildings)
    if (building.kind === "farm" && inside(origin, building)) ids.add(building.id)
  return ids
}

export function walkable(s: VillageState, p: Point, farmIds?: ReadonlySet<string>) {
  return (
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    isVillageGround(s, p.x, p.y) &&
    !s.buildings.some((b) => b.kind !== "gate" && !(b.kind === "farm" && farmIds?.has(b.id)) && inside(p, b)) &&
    !s.nodes.some(
      (n) => n.kind !== "branch" && n.x === p.x && n.y === p.y && occupiesResourceTile(n),
    ) &&
    !(s.creatures ?? []).some((creature) => Math.round(creature.x) === p.x && Math.round(creature.y) === p.y) &&
    !(s.saplings ?? []).some((sapling) => sapling.x === p.x && sapling.y === p.y)
  )
}
const neighbors = (p: Point) => [
  { x: p.x + 1, y: p.y },
  { x: p.x - 1, y: p.y },
  { x: p.x, y: p.y + 1 },
  { x: p.x, y: p.y - 1 },
]
function approach(b: Point & { width: number; height: number }) {
  const points: Point[] = []
  for (let x = b.x; x < b.x + b.width; x++)
    points.push({ x, y: b.y - 1 }, { x, y: b.y + b.height })
  for (let y = b.y; y < b.y + b.height; y++)
    points.push({ x: b.x - 1, y }, { x: b.x + b.width, y })
  return points
}

// Breadth-first search on a small tile map; no browser or wall-clock dependency.
export function findPath(
  s: VillageState,
  start: Point,
  goals: Point[],
): Point[] | null {
  const farmIds = accessibleFarms(s, start)
  const original = start
  start = cell(start)
  const target = new Set(goals.filter((p) => walkable(s, p, farmIds)).map(key))
  if (!target.size) return null
  const queue: Point[] = [start]
  const previous = new Map<string, Point | null>([[key(start), null]])
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const p = queue[cursor]
    if (target.has(key(p))) {
      const path: Point[] = []
      let current = p
      while (previous.get(key(current))) {
        path.unshift(current)
        current = previous.get(key(current))!
      }
      if (
        Math.abs(original.x - start.x) + Math.abs(original.y - start.y) >
        0.01
      )
        path.unshift(start)
      return path
    }
    for (const next of neighbors(p))
      if (!previous.has(key(next)) && walkable(s, next, farmIds)) {
        previous.set(key(next), p)
        queue.push(next)
      }
  }
  return null
}

function spend(s: VillageState, cost: Partial<Resources>) {
  for (const [kind, amount] of Object.entries(cost))
    if (s.resources[kind as Resource] < amount)
      throw new Error(
        "Recursos insuficientes para esta construção ou melhoria.",
      )
  for (const [kind, amount] of Object.entries(cost))
    s.resources[kind as Resource] -= amount
}
function spendCrafts(s: VillageState, cost: Partial<Record<CraftItem, number>>) {
  for (const [kind, amount] of Object.entries(cost))
    if ((s.crafts?.[kind as CraftItem] ?? 0) < amount)
      throw new Error("Faltam itens produzidos nas oficinas.")
  for (const [kind, amount] of Object.entries(cost))
    s.crafts![kind as CraftItem] -= amount
}

export function placementError(
  s: VillageState,
  kind: keyof typeof BUILDINGS,
  x: number,
  y: number,
  ignoreBuildingId?: string,
): string | null {
  const spec = BUILDINGS[kind]
  if (!spec || !Number.isInteger(x) || !Number.isInteger(y))
    return "Posição inválida."
  const rect = { x, y, width: spec.width, height: spec.height }
  for (let py = y; py < y + spec.height; py++)
    for (let px = x; px < x + spec.width; px++) {
      if (!isVillageGround(s, px, py)) return "Construa em terra firme e plana."
      if (
        s.buildings.some(
          (b) => b.id !== ignoreBuildingId && inside({ x: px, y: py }, b),
        )
      )
        return "Esse espaço já tem uma construção."
      const resource = s.nodes.find((node) => node.x === px && node.y === py && occupiesResourceTile(node))
      if (resource) return DEPOSIT_AMOUNTS[resource.kind] === undefined
        ? "Colete os recursos desse espaço antes de construir."
        : "Essa área está reservada para uma jazida."
      if ((s.saplings ?? []).some((sapling) => sapling.x === px && sapling.y === py))
        return "A muda de árvore está crescendo nesse espaço."
    }
  if (s.units.some((u) => inside(cell(u), rect)))
    return "Mova a unidade antes de construir aqui."
  if (kind === "well" && !s.buildings.some((b) => b.kind === "farm" && wellAffectsFarm(rect, b)))
    return "Coloque o poço perto de uma fazenda."
  return null
}

export function treePlacementError(s: VillageState, x: number, y: number): string | null {
  if (!isVillageGround(s, x, y)) return "Plante em terra firme e plana."
  const point = { x, y }
  if (s.buildings.some((building) => resourceNearBuilding(point, "tree", building)))
    return "Plante a árvore mais longe das construções."
  if (s.nodes.some((node) => node.x === x && node.y === y && occupiesResourceTile(node)) ||
      s.units.some((unit) => key(cell(unit)) === key(point)) ||
      s.units.some((unit) => unit.job.kind === "plant" && key(unit.job.destination) === key(point)) ||
      s.saplings.some((sapling) => sapling.x === x && sapling.y === y))
    return "Esse espaço está ocupado."
  return null
}

export function wallLineCells(x1: number, y1: number, x2: number, y2: number): Point[] {
  if (![x1, y1, x2, y2].every(Number.isInteger)) return []
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
  const length = horizontal ? Math.abs(x2 - x1) + 1 : Math.abs(y2 - y1) + 1
  if (length > VILLAGE_SIZE) return []
  return Array.from({ length }, (_, index) => ({
    x: x1 + (horizontal ? Math.sign(x2 - x1) * index : 0),
    y: y1 + (horizontal ? 0 : Math.sign(y2 - y1) * index),
  }))
}

function jobGoals(s: VillageState, u: Unit): Point[] {
  if (u.job.kind === "move" || u.job.kind === "plant") return [u.job.destination]
  if (u.job.kind === "farm") {
    const id = u.job.targetId
    const b = s.buildings.find((b) => b.id === id && b.kind === "farm")
    if (!b) return []
    const workers = s.units.filter(
      (worker) =>
        worker.id === u.id ||
        (worker.job.kind === "farm" && worker.job.targetId === b.id),
    )
    const slot = Math.max(
      0,
      workers.findIndex((worker) => worker.id === u.id),
    )
    return [
      {
        x: slot % 2 === 0 ? b.x : b.x + b.width - 1,
        y: slot < 2 ? b.y + b.height - 1 : b.y,
      },
    ]
  }
  if (u.job.kind === "gather") {
    const id = u.job.targetId
    const node = s.nodes.find((n) => n.id === id && occupiesResourceTile(n))
    return node ? resourceApproachGoals(s, node) : []
  }
  if (u.job.kind === "build") {
    const id = u.job.targetId
    const b = s.buildings.find((b) => b.id === id && b.construction)
    return b ? approach(b) : []
  }
  if (u.job.kind === "ranch") {
    const targetId = u.job.targetId
    const b = s.buildings.find((building) => building.id === targetId && building.kind === "ranch" && !building.construction)
    return b ? approach(b) : []
  }
  return []
}

function resourceApproachGoals(s: VillageState, node: ResourceNode) {
  const goals: Point[] = []
  // Resource patches can surround a deposit. Let the worker reach the closest
  // free edge of the patch while keeping the selected deposit as its target.
  for (let radius = 1; radius <= 3; radius++) {
    for (let y = node.y - radius; y <= node.y + radius; y++)
      for (let x = node.x - radius; x <= node.x + radius; x++)
        if (Math.abs(x - node.x) + Math.abs(y - node.y) === radius && walkable(s, { x, y }))
          goals.push({ x, y })
  }
  return goals
}

function nearestReachableResource(s: VillageState, u: Unit, kind: ResourceNode["kind"], exceptId?: string) {
  const candidates = s.nodes
    .filter((node) => node.id !== exceptId && node.kind === kind && node.amount > 0)
    .sort((a, b) => Math.abs(a.x - u.x) + Math.abs(a.y - u.y) - (Math.abs(b.x - u.x) + Math.abs(b.y - u.y)))
  for (const node of candidates) {
    if (findPath(s, u, resourceApproachGoals(s, node)) !== null) return node
  }
  return undefined
}

function batchAmount(value: number | undefined, maximum: number) {
  const amount = value ?? 1
  if (!Number.isInteger(amount) || amount < 1 || amount > maximum)
    throw new Error(`Escolha uma quantidade de 1 a ${maximum}.`)
  return amount
}
function scaledCost(cost: Partial<Resources>, amount: number): Partial<Resources> {
  return Object.fromEntries(Object.entries(cost).map(([kind, count]) => [kind, count * amount]))
}
function pendingSoldiers(s: VillageState) {
  return s.buildings.reduce((total, building) => total + (["soldier", "archer"].includes(building.production?.item ?? "") ? building.production?.remaining ?? 1 : 0), 0)
}

function stowLoad(u: Unit) {
  if (!u.carrying) return
  u.stowed ??= {}
  u.stowed[u.carrying.resource] =
    (u.stowed[u.carrying.resource] ?? 0) + u.carrying.amount
  u.carrying = null
}
function releaseBuilder(s: VillageState, buildingId: string) {
  const finishedFarm = s.buildings.find((building) =>
    building.id === buildingId && building.kind === "farm" && !building.construction,
  )
  for (const unit of s.units)
    if (unit.job.kind === "build" && unit.job.targetId === buildingId) {
      const queued = unit.wallQueue ?? []
      const pending = s.buildings.filter((building) => building.construction)
      pending.sort((a, b) => {
        const aOrder = queued.indexOf(a.id)
        const bOrder = queued.indexOf(b.id)
        if (aOrder !== -1 || bOrder !== -1)
          return (aOrder === -1 ? Infinity : aOrder) - (bOrder === -1 ? Infinity : bOrder)
        const distance = (site: Building) => Math.abs(unit.x - site.x) + Math.abs(unit.y - site.y)
        return distance(a) - distance(b)
      })
      const reachable = pending.find((site) => findPath(s, unit, approach(site)) !== null)
      const next = reachable ?? pending[0]
      if (next) {
        unit.job = { kind: "build", targetId: next.id }
        unit.wallQueue = queued.filter((id) => id !== next.id && s.buildings.some((site) => site.id === id && site.construction))
        if (!unit.wallQueue.length) delete unit.wallQueue
      } else {
        unit.job = finishedFarm && farmWorkers(s, finishedFarm.id).length < MAX_FARM_WORKERS
          ? { kind: "farm", targetId: finishedFarm.id }
          : { kind: "idle" }
        delete unit.wallQueue
      }
      unit.path = []
      unit.work = 0
      unit.status = unit.job.kind === "build" ? (reachable ? "walking" : "blocked")
        : unit.job.kind === "farm" ? "walking" : "idle"
    }
}

export function executeVillage(s: VillageState, command: VillageCommand) {
  const requireUnlock = (unlock: Parameters<typeof unlockReason>[1]) => {
    const reason = unlockReason(s, unlock)
    if (reason) throw new Error(reason)
  }
  switch (command.type) {
    case "editVillageMap": {
      const edits = prepareVillageMapEdits(s, command.edits)
      s.mapTiles = edits.mapTiles
      s.nodes = edits.nodes
      s.buildings = edits.buildings
      const remainingNodes = new Set(s.nodes.map((node) => node.id))
      for (const unit of s.units) {
        unit.path = []
        if (unit.job.kind === "gather" && !remainingNodes.has(unit.job.targetId)) {
          unit.job = { kind: "idle" }
          unit.work = 0
          unit.status = unit.carrying ? "delivering" : "idle"
        }
      }
      break
    }
    case "killVillager": {
      const villager = s.units.find(
        (unit) => unit.id === command.unitId && unit.kind === "villager",
      )
      if (!villager) throw new Error("Aldeão não encontrado.")
      s.units = s.units.filter((unit) => unit.id !== villager.id)
      for (const unit of s.units) unit.path = []
      break
    }
    case "garrisonArcher": {
      const unit = s.units.find((candidate) => candidate.id === command.unitId && candidate.kind === "archer")
      const tower = s.buildings.find((building) => building.id === command.towerId && building.kind === "tower" && !building.construction)
      if (!unit || !tower) throw new Error("Selecione um arqueiro e uma torre pronta.")
      const stationed = s.units.filter((candidate) => candidate.job.kind === "garrison" && candidate.job.targetId === tower.id).length
      if (stationed >= Math.min(4, tower.level)) throw new Error(`Esta torre comporta ${Math.min(4, tower.level)} arqueiro(s) no nível atual.`)
      if (unit.job.kind === "garrison") throw new Error("Este arqueiro já está guarnecido.")
      stowLoad(unit)
      unit.job = { kind: "garrison", targetId: tower.id }
      unit.path = []
      unit.status = "idle"
      unit.work = 0
      break
    }
    case "ungarrisonArcher": {
      const unit = s.units.find((candidate) => candidate.id === command.unitId && candidate.kind === "archer" && candidate.job.kind === "garrison")
      if (!unit) throw new Error("Arqueiro guarnecido não encontrado.")
      const job = unit.job
      if (job.kind !== "garrison") throw new Error("Arqueiro não está nesta torre.")
      const tower = s.buildings.find((building) => building.id === job.targetId)
      const exit = tower && approach(tower).find((point) => walkable(s, point) && !s.units.some((other) => other.id !== unit.id && key(cell(other)) === key(point)))
      if (!tower || !exit) throw new Error("Não há espaço livre ao redor da torre para retirar o arqueiro.")
      unit.x = exit.x
      unit.y = exit.y
      unit.job = { kind: "idle" }
      unit.path = []
      unit.status = "idle"
      break
    }
    case "attackCreature": {
      const unit = s.units.find((candidate) => candidate.id === command.unitId)
      const creature = s.creatures?.find((candidate) => candidate.id === command.creatureId)
      if (!unit || !creature) throw new Error("Selecione uma unidade e uma criatura viva.")
      if (unit.job.kind === "garrison") throw new Error("Retire o arqueiro da torre antes de dar uma ordem de ataque.")
      creature.hostileTo = unit.id
      unit.job = { kind: "attackCreature", targetId: creature.id }
      unit.path = []
      unit.status = "walking"
      unit.work = 0
      break
    }
    case "build": {
      if (!Object.prototype.hasOwnProperty.call(BUILDING_UNLOCK_LEVEL, command.kind))
        throw new Error("Construção inválida.")
      requireUnlock({ kind: "building", value: command.kind })
      if (
        command.crop !== undefined &&
        !Object.prototype.hasOwnProperty.call(CROPS, command.crop)
      )
        throw new Error("Plantação inválida.")
      const error = placementError(s, command.kind, command.x, command.y)
      if (error) throw new Error(error)
      const builder = s.units.find((u) =>
        u.kind === "villager" && u.id === (command.unitId ?? s.units.find((candidate) => candidate.kind === "villager")?.id),
      )
      if (!builder) throw new Error("Selecione um aldeão para construir.")
      const plantedCrop = command.kind === "farm" ? command.crop ?? "carrot" : null
      if (plantedCrop) requireUnlock({ kind: "crop", value: plantedCrop })
      if (plantedCrop && s.seeds[plantedCrop] < 1)
        throw new Error(`Sem sementes de ${CROPS[plantedCrop].name.toLowerCase()}. Compre mais no mercado.`)
      const spec = BUILDINGS[command.kind]
      const site = { x: command.x, y: command.y, width: spec.width, height: spec.height }
      if (findPath(s, builder, approach(site)) === null)
        throw new Error("O aldeão não consegue chegar ao local da construção.")
      spend(s, BUILDINGS[command.kind].cost)
      if (plantedCrop) s.seeds[plantedCrop]--
      const id = crypto.randomUUID()
      s.buildings.push({
        id,
        kind: command.kind,
        x: command.x,
        y: command.y,
        width: BUILDINGS[command.kind].width,
        height: BUILDINGS[command.kind].height,
        level: 1,
        growth: 0,
        construction: { builderId: builder.id, progress: 0, duration: BUILD_SECONDS[command.kind] },
        ...(command.kind === "farm"
          ? {
              crop: command.crop ?? "carrot",
              farmCycle: { phase: "planting" as const, progress: 0, seedPaid: true },
            }
          : {}),
        ...(command.kind === "ranch" ? { ranch: { kind: null, animals: [] } } : {}),
      })
      for (const unit of s.units) unit.path = []
      stowLoad(builder)
      delete builder.wallQueue
      builder.job = { kind: "build", targetId: id }
      builder.path = []
      builder.work = 0
      builder.status = "walking"
      break
    }
    case "buildWallLine": {
      const cells = wallLineCells(command.x1, command.y1, command.x2, command.y2)
      if (!cells.length) throw new Error("Linha de muro inválida.")
      const builder = s.units.find((unit) => unit.id === command.unitId && unit.kind === "villager")
      if (!builder) throw new Error("Selecione um aldeão para construir o muro.")
      for (const point of cells) {
        const error = placementError(s, "wall", point.x, point.y)
        if (error) throw new Error(error)
      }
      const first = { ...cells[0], width: 1, height: 1 }
      if (findPath(s, builder, approach(first)) === null)
        throw new Error("O aldeão não consegue chegar ao muro.")
      spend(s, Object.fromEntries(Object.entries(BUILDINGS.wall.cost).map(([resource, amount]) => [resource, amount * cells.length])))
      const ids = cells.map((point) => {
        const id = crypto.randomUUID()
        s.buildings.push({ id, kind: "wall", ...point, width: 1, height: 1, level: 1, growth: 0,
          construction: { builderId: builder.id, progress: 0, duration: BUILD_SECONDS.wall } })
        return id
      })
      for (const unit of s.units) unit.path = []
      stowLoad(builder)
      builder.wallQueue = ids.slice(1)
      builder.job = { kind: "build", targetId: ids[0] }
      builder.path = []
      builder.work = 0
      builder.status = "walking"
      break
    }
    case "collectBranch": {
      const n = s.nodes.find(
        (n) => n.id === command.nodeId && n.kind === "branch" && n.amount > 0,
      )
      if (!n) throw new Error("Este galho já foi coletado.")
      const room = storageCapacities(s).wood - s.resources.wood
      if (room <= 0)
        throw new Error(
          "Estoque de madeira cheio. Outros recursos têm limites independentes.",
        )
      const amount = Math.min(n.amount, room)
      s.resources.wood += amount
      n.amount -= amount
      s.nodes = s.nodes.filter(occupiesResourceTile)
      break
    }
    case "upgradeFarm": {
      const b = s.buildings.find(
        (b) => b.id === command.buildingId && b.kind === "farm",
      )
      if (!b) throw new Error("Plantação não encontrada.")
      if (b.construction) throw new Error("Termine a construção antes de melhorar a fazenda.")
      if (b.level >= 3) throw new Error("A plantação já está no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "building" && item.buildingId === b.id))
        throw new Error("Esta construção já tem uma melhoria em andamento.")
      const targetLevel = (b.level + 1) as 2 | 3
      spend(s, UPGRADE_COSTS[targetLevel])
      s.improvements.push({
        kind: "building",
        buildingId: b.id,
        targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "upgradeBarn": {
      const b = s.buildings.find(
        (b) => b.id === command.buildingId && b.kind === "barn",
      )
      if (!b) throw new Error("Celeiro não encontrado.")
      if (b.construction) throw new Error("Termine a construção antes de melhorar o celeiro.")
      if (b.level >= 8) throw new Error("O celeiro já está no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "building" && item.buildingId === b.id))
        throw new Error("Este celeiro já tem uma melhoria em andamento.")
      const targetLevel = (b.level + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8
      if (targetLevel >= 6 && townLevel(s) < targetLevel)
        throw new Error(`Celeiro nível ${targetLevel} requer Centro Urbano nível ${targetLevel}.`)
      spend(s, BARN_UPGRADE_COSTS[targetLevel])
      s.improvements.push({
        kind: "building",
        buildingId: b.id,
        targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "upgradeRanch": {
      const ranch = s.buildings.find((building) => building.id === command.buildingId && building.kind === "ranch")
      if (!ranch) throw new Error("Curral não encontrado.")
      if (ranch.construction) throw new Error("Termine a construção antes de melhorar o curral.")
      if (ranch.level >= 5) throw new Error("Curral no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "building" && item.buildingId === ranch.id))
        throw new Error("Este curral já tem uma melhoria em andamento.")
      const targetLevel = ranch.level + 1
      spend(s, RANCH_UPGRADE_COSTS[targetLevel])
      s.improvements.push({ kind: "building", buildingId: ranch.id, targetLevel: targetLevel as 2 | 3 | 4 | 5,
        startedAt: s.economy.elapsed, finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel as 2 | 3 | 4 | 5] })
      break
    }
    case "upgradeWeaving": {
      const workshop = s.buildings.find((building) => building.id === command.buildingId && building.kind === "weaving")
      if (!workshop || workshop.construction) throw new Error("Termine a construção da tecelagem primeiro.")
      if (workshop.production) throw new Error("Aguarde a produção da tecelagem terminar.")
      if (s.improvements?.some((item) => item.kind === "building" && item.buildingId === workshop.id))
        throw new Error("Esta tecelagem já tem uma melhoria em andamento.")
      const targetLevel = (workshop.level + 1) as 2 | 3 | 4 | 5
      const upgrade = WEAVING_UPGRADES[targetLevel]
      if (!upgrade) throw new Error("Tecelagem no nível máximo.")
      if (townLevel(s) < targetLevel) throw new Error(`Requer Centro da Vila nível ${targetLevel}.`)
      if ((s.crafts?.tools ?? 0) < upgrade.tools) throw new Error("Faltam ferramentas da ferraria.")
      spend(s, upgrade.cost)
      spendCrafts(s, { tools: upgrade.tools })
      ;(s.improvements ??= []).push({
        kind: "building", buildingId: workshop.id, targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "upgradeDefense": {
      const defense = s.buildings.find((building) =>
        building.id === command.buildingId && ["wall", "gate", "tower"].includes(building.kind))
      if (!defense || !["wall", "gate", "tower"].includes(defense.kind))
        throw new Error("Defesa não encontrada.")
      if (defense.construction) throw new Error("Termine a construção antes de melhorar a defesa.")
      const maxLevel = defense.kind === "tower" ? 4 : 3
      if (defense.level >= maxLevel) throw new Error("Defesa no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "building" && item.buildingId === defense.id))
        throw new Error("Esta defesa já tem uma melhoria em andamento.")
      const targetLevel = (defense.level + 1) as 2 | 3 | 4
      const kind = defense.kind as "wall" | "gate" | "tower"
      const cost = DEFENSE_UPGRADE_COSTS[kind][targetLevel]
      if (!cost) throw new Error("Esta defesa já está no nível máximo.")
      spend(s, cost)
      s.improvements.push({
        kind: "building",
        buildingId: defense.id,
        targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "upgradeHouse":
    case "upgradeTownCenter": {
      const b = command.type === "upgradeTownCenter"
        ? s.buildings.find((b) => b.kind === "townCenter")
        : s.buildings.find((b) => b.id === command.buildingId && b.kind === "house")
      if (!b) throw new Error("Construção não encontrada.")
      if (b.construction) throw new Error("Termine a construção antes de melhorar.")
      if (b.level >= (b.kind === "townCenter" ? 8 : 3)) throw new Error("A construção já está no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "building" && item.buildingId === b.id))
        throw new Error("Esta construção já tem uma melhoria em andamento.")
      const targetLevel = (b.level + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8
      if (command.type === "upgradeHouse") requireUnlock({ kind: "house", level: targetLevel })
      if (command.type === "upgradeTownCenter" && targetLevel === 2) {
        const missing = commerceGoals(s).filter((goal) => !goal.done)
        if (missing.length) throw new Error(`Complete os objetivos da Fundação: ${missing.map((goal) => goal.label).join(", ")}.`)
      }
      spend(s, command.type === "upgradeHouse"
        ? HOUSE_UPGRADE_COSTS[targetLevel as 2 | 3]
        : TOWN_UPGRADE_COSTS[targetLevel])
      s.improvements.push({
        kind: "building",
        buildingId: b.id,
        targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "demolishFarm": {
      const farm = s.buildings.find(
        (b) => b.id === command.buildingId && b.kind === "farm",
      )
      if (!farm) throw new Error("Fazenda não encontrada.")
      s.buildings = s.buildings.filter((b) => b.id !== farm.id)
      releaseBuilder(s, farm.id)
      s.improvements = s.improvements?.filter((item) => item.kind !== "building" || item.buildingId !== farm.id)
      for (const u of farmWorkers(s, farm.id)) {
        u.job = { kind: "idle" }
        u.path = []
        u.work = 0
        u.status = "idle"
      }
      break
    }
    case "demolishBarn": {
      const barn = s.buildings.find(
        (b) => b.id === command.buildingId && b.kind === "barn",
      )
      if (!barn) throw new Error("Celeiro não encontrado.")
      s.buildings = s.buildings.filter((b) => b.id !== barn.id)
      releaseBuilder(s, barn.id)
      s.improvements = s.improvements?.filter((item) => item.kind !== "building" || item.buildingId !== barn.id)
      // Existing stocks remain available to spend even above the remaining limit.
      for (const unit of s.units) unit.path = []
      break
    }
    case "demolishHouse":
    case "demolishWell": {
      const kind = command.type === "demolishHouse" ? "house" : "well"
      const building = s.buildings.find((b) => b.id === command.buildingId && b.kind === kind)
      if (!building) throw new Error("Construção não encontrada.")
      s.buildings = s.buildings.filter((b) => b.id !== building.id)
      s.improvements = s.improvements?.filter((item) => item.kind !== "building" || item.buildingId !== building.id)
      releaseBuilder(s, building.id)
      for (const unit of s.units) unit.path = []
      break
    }
    case "demolishBuilding": {
      const building = s.buildings.find((b) => b.id === command.buildingId &&
        ["wall", "gate", "tower", "blacksmith", "weaving", "barracks", "ranch"].includes(b.kind))
      if (!building) throw new Error("Construção não encontrada.")
      s.buildings = s.buildings.filter((b) => b.id !== building.id)
      s.improvements = s.improvements?.filter((item) => item.kind !== "building" || item.buildingId !== building.id)
      releaseBuilder(s, building.id)
      for (const unit of s.units) unit.path = []
      break
    }
    case "craftItem": {
      const amount = batchAmount(command.amount, 20)
      if (!Object.prototype.hasOwnProperty.call(CRAFT_RECIPES, command.item))
        throw new Error("Item inválido.")
      const recipe = CRAFT_RECIPES[command.item]
      if (command.item === "armor") requireUnlock({ kind: "armor" })
      if (command.item === "armor" && (s.buildings.find((b) => b.kind === "townCenter")?.level ?? 1) < 3)
        throw new Error("Armaduras exigem centro urbano nível 3.")
      const workshop = s.buildings.find((b) => b.id === command.buildingId)
      if (!workshop || workshop.kind !== recipe.building || workshop.construction)
        throw new Error("Oficina indisponível para este item.")
      if (workshop.production) throw new Error("Esta oficina já está produzindo.")
      if (workshop.kind === "weaving" && s.improvements?.some((item) => item.kind === "building" && item.buildingId === workshop.id))
        throw new Error("A tecelagem está sendo melhorada.")
      s.crafts ??= { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
      for (const [kind, amount] of Object.entries(recipe.crafts))
        if (s.crafts[kind as CraftItem] < amount * (command.amount ?? 1))
          throw new Error("Faltam materiais produzidos nas oficinas.")
      const productCost: Partial<Record<"milk" | "wool" | "eggs" | "feathers", number>> = "products" in recipe ? recipe.products : {}
      s.animalProducts ??= { milk: 0, wool: 0, eggs: 0, feathers: 0 }
      s.animalProducts.eggs ??= 0
      s.animalProducts.feathers ??= 0
      for (const [kind, count] of Object.entries(productCost))
        if (s.animalProducts[kind as keyof typeof s.animalProducts] < count * amount)
          throw new Error("Falta lã no celeiro para tecer.")
      spend(s, scaledCost(recipe.resources, amount))
      spendCrafts(s, Object.fromEntries(Object.entries(recipe.crafts).map(([kind, count]) => [kind, count * amount])))
      for (const [kind, count] of Object.entries(productCost))
        s.animalProducts[kind as keyof typeof s.animalProducts] -= count * amount
      workshop.production = {
        item: command.item, progress: 0, duration: craftOutput(command.item, workshop.level).seconds,
        remaining: amount, total: amount,
      }
      break
    }
    case "stockRanch": {
      if (!Object.prototype.hasOwnProperty.call(ANIMALS, command.animal)) throw new Error("Animal inválido.")
      requireUnlock({ kind: "animal", value: command.animal })
      const ranch = s.buildings.find((b) => b.id === command.buildingId && b.kind === "ranch" && !b.construction)
      if (!ranch) throw new Error("Curral indisponível.")
      const capacity = RANCH_CAPACITIES[ranch.level]
      ranch.ranch ??= { kind: null, animals: [] }
      if (ranch.ranch.animals.length) throw new Error("A espécie já foi escolhida. Os próximos animais nascem automaticamente.")
      if (capacity < 1) throw new Error("Curral sem vagas.")
      spend(s, { food: ANIMALS[command.animal].foodCost })
      ranch.ranch.kind = command.animal
      ranch.ranch.animals.push({ id: crypto.randomUUID(), kind: command.animal, growth: 0 })
      ranch.ranch.breedingElapsed = 0
      break
    }
    case "upgradeTools": {
      if (!s.buildings.some((b) => b.kind === "blacksmith" && !b.construction))
        throw new Error("Construa uma ferraria primeiro.")
      if ((s.toolLevel ?? 0) >= MAX_FORGE_LEVEL) throw new Error("Ferramentas no nível máximo.")
      if (s.improvements?.some((item) => item.kind === "forge" && item.track === "tools"))
        throw new Error("Esta melhoria da ferraria já está em andamento.")
      if ((s.crafts?.tools ?? 0) < 1) throw new Error("Produza um conjunto de ferramentas na ferraria.")
      const targetLevel = ((s.toolLevel ?? 0) + 1) as 1 | 2 | 3 | 4
      spend(s, FORGE_UPGRADES[targetLevel].costs.tools)
      s.crafts!.tools--
      ;(s.improvements ??= []).push({ kind: "forge", track: "tools", targetLevel,
        startedAt: s.economy.elapsed, finishAt: s.economy.elapsed + FORGE_UPGRADES[targetLevel].seconds })
      break
    }
    case "upgradeWeapons":
    case "upgradeArmor": {
      if (!s.buildings.some((b) => b.kind === "blacksmith" && !b.construction))
        throw new Error("Construa uma ferraria primeiro.")
      const weapons = command.type === "upgradeWeapons"
      const level = weapons ? (s.weaponLevel ?? 0) : (s.armorLevel ?? 0)
      if (level >= MAX_FORGE_LEVEL) throw new Error("Melhoria militar no nível máximo.")
      const item = weapons ? "weapons" : "armor"
      if (s.improvements?.some((improvement) => improvement.kind === "forge" && improvement.track === item))
        throw new Error("Esta melhoria da ferraria já está em andamento.")
      if ((s.crafts?.[item] ?? 0) < 1)
        throw new Error(`Produza ${weapons ? "uma arma" : "uma armadura"} na ferraria.`)
      const targetLevel = (level + 1) as 1 | 2 | 3 | 4
      spend(s, FORGE_UPGRADES[targetLevel].costs[item])
      s.crafts![item]--
      ;(s.improvements ??= []).push({ kind: "forge", track: item, targetLevel,
        startedAt: s.economy.elapsed, finishAt: s.economy.elapsed + FORGE_UPGRADES[targetLevel].seconds })
      break
    }
    case "trainSoldier":
    case "trainArcher": {
      const archer = command.type === "trainArcher"
      const amount = batchAmount(command.amount, 10)
      const barracks = s.buildings.find((b) => b.id === command.buildingId && b.kind === "barracks" && !b.construction)
      if (!barracks) throw new Error("Quartel indisponível.")
      if (barracks.production) throw new Error("Este quartel já está treinando.")
      if (s.units.length + pendingSoldiers(s) + (s.recruitment?.remaining ?? 0) + amount > populationCapacity(s)) throw new Error("Construa mais casas para aumentar a população.")
      if ((s.crafts?.weapons ?? 0) < amount || (s.crafts?.clothing ?? 0) < amount)
        throw new Error(`${archer ? "O arqueiro precisa de um arco e uma roupa" : "O soldado precisa de uma arma e uma roupa"}.`)
      spend(s, scaledCost(archer ? ARCHER_COST : SOLDIER_COST, amount))
      spendCrafts(s, { weapons: amount, clothing: amount })
      barracks.production = { item: archer ? "archer" : "soldier", progress: 0, duration: archer ? ARCHER_SECONDS : SOLDIER_SECONDS, remaining: amount, total: amount }
      break
    }
    case "equipSoldier": {
      const soldier = s.units.find((u) => u.id === command.unitId && (u.kind === "soldier" || u.kind === "archer"))
      if (!soldier || soldier.armored) throw new Error("Unidade militar indisponível ou já equipada.")
      if ((s.crafts?.armor ?? 0) < 1) throw new Error("Produza uma armadura na ferraria.")
      s.crafts!.armor--
      soldier.armored = true
      break
    }
    case "sellResource": {
      requireUnlock({ kind: "market" })
      if (!s.buildings.some((b) => b.kind === "townCenter"))
        throw new Error("Centro urbano não encontrado.")
      if (!Object.prototype.hasOwnProperty.call(MARKET_RATES, command.resource))
        throw new Error("Recurso inválido para venda.")
      const quote = MARKET_RATES[command.resource]
      if (
        !Number.isSafeInteger(command.amount) ||
        command.amount <= 0 ||
        command.amount % quote.amount !== 0
      )
        throw new Error(`Venda em lotes de ${quote.amount} recursos.`)
      if (s.resources[command.resource] < command.amount)
        throw new Error("Recursos insuficientes para vender.")
      const gold = (command.amount / quote.amount) * quote.gold
      if (
        !Number.isSafeInteger(gold) ||
        gold > storageCapacities(s).gold - s.resources.gold
      )
        throw new Error(
          "Não há espaço para o ouro recebido. Construa ou melhore um celeiro.",
        )
      s.resources[command.resource] -= command.amount
      s.resources.gold += gold
      break
    }
    case "buyResource": {
      requireUnlock({ kind: "market" })
      const rate = MARKET_BUY_RATES[command.resource]
      if (!rate) throw new Error("Recurso inválido para compra.")
      if (!Number.isSafeInteger(command.amount) || command.amount <= 0 || command.amount % rate.amount !== 0)
        throw new Error(`Compra em lotes de ${rate.amount} recursos.`)
      const gold = (command.amount / rate.amount) * rate.gold
      if (s.resources.gold < gold) throw new Error("Ouro insuficiente para esta compra.")
      if (command.amount > storageCapacities(s)[command.resource] - s.resources[command.resource])
        throw new Error("Não há espaço no celeiro para essa quantidade.")
      s.resources.gold -= gold
      s.resources[command.resource] += command.amount
      break
    }
    case "buySeeds": {
      requireUnlock({ kind: "market" })
      if (!Object.prototype.hasOwnProperty.call(SEED_PRICES, command.seed))
        throw new Error("Semente inválida.")
      if (command.seed !== "tree") requireUnlock({ kind: "crop", value: command.seed })
      if (!Number.isSafeInteger(command.amount) || command.amount <= 0)
        throw new Error("Quantidade de sementes inválida.")
      const gold = command.amount * SEED_PRICES[command.seed]
      if (s.resources.gold < gold) throw new Error("Ouro insuficiente para comprar sementes.")
      s.resources.gold -= gold
      s.seeds[command.seed] += command.amount
      break
    }
    case "plantTree": {
      const unit = s.units.find((candidate) => candidate.id === command.unitId)
      if (!unit || unit.kind !== "villager")
        throw new Error("Selecione um aldeão para plantar a árvore.")
      if (s.seeds.tree < 1) throw new Error("Você não tem sementes de árvore.")
      const p = { x: command.x, y: command.y }
      const error = treePlacementError(s, p.x, p.y)
      if (error) throw new Error(error)
      const route = findPath(s, unit, [p])
      if (route === null) throw new Error("Não há caminho livre até esse terreno.")
      s.seeds.tree--
      stowLoad(unit)
      delete unit.wallQueue
      unit.job = { kind: "plant", destination: p }
      unit.path = route
      unit.work = 0
      unit.status = route.length ? "walking" : "planting"
      break
    }
    case "relocateTownCenter": {
      const center = s.buildings.find((b) => b.kind === "townCenter")
      if (!center) throw new Error("Centro urbano não encontrado.")
      const error = placementError(
        s,
        "townCenter",
        command.x,
        command.y,
        center.id,
      )
      if (error) throw new Error(error)
      center.x = command.x
      center.y = command.y
      for (const unit of s.units) unit.path = []
      break
    }
    case "recruitVillager": {
      const amount = batchAmount(command.amount, 10)
      const { reason } = recruitmentCheck(s, amount)
      if (reason) throw new Error(reason)
      spend(s, scaledCost(RECRUIT_COST, amount))
      s.recruitment ??= { remaining: 0, progress: 0 }
      s.recruitment.remaining += amount
      break
    }
    case "research": {
      if (!Object.prototype.hasOwnProperty.call(RESEARCH, command.research))
        throw new Error("Pesquisa inválida.")
      if (!s.buildings.some((b) => b.kind === "townCenter"))
        throw new Error("Centro da vila não encontrado.")
      const level = s.research[command.research]
      if (level >= 3) throw new Error("Essa pesquisa já está no nível máximo.")
      s.improvements ??= []
      if (s.improvements.some((item) => item.kind === "research" && item.research === command.research))
        throw new Error("Esta pesquisa já está em andamento.")
      const targetLevel = (level + 1) as 1 | 2 | 3
      requireUnlock({ kind: "research", value: command.research, level: targetLevel })
      spend(s, RESEARCH[command.research].costs[targetLevel])
      s.improvements.push({
        kind: "research",
        research: command.research,
        targetLevel,
        startedAt: s.economy.elapsed,
        finishAt: s.economy.elapsed + IMPROVEMENT_SECONDS[targetLevel],
      })
      break
    }
    case "assignUnit":
    case "moveUnit":
    case "stopUnit": {
      const u = s.units.find((u) => u.id === command.unitId)
      if (!u) throw new Error("Unidade não encontrada.")
      if ((u.kind === "soldier" || u.kind === "archer") && command.type === "assignUnit")
        throw new Error("Soldados só podem receber ordens de movimento por enquanto.")
      let job: Unit["job"] = { kind: "idle" }
      if (command.type === "moveUnit") {
        if (!walkable(s, command))
          throw new Error("A unidade não pode ir até esse ponto.")
        job = { kind: "move", destination: { x: command.x, y: command.y } }
      }
      if (command.type === "assignUnit") {
        const site = s.buildings.find(
          (b) => b.id === command.targetId && b.construction,
        )
        if (site) {
          if (u.kind !== "villager")
            throw new Error("Somente um aldeão pode construir.")
          job = { kind: "build", targetId: site.id }
        } else if (
          s.buildings.some(
            (b) => b.id === command.targetId && b.kind === "farm" && !b.construction,
          )
        )
          job = { kind: "farm", targetId: command.targetId }
        else if (
          s.buildings.some((b) => b.id === command.targetId && b.kind === "ranch" && !b.construction)
        ) {
          if (u.kind !== "villager") throw new Error("Somente aldeões cuidam dos animais.")
          job = { kind: "ranch", targetId: command.targetId }
        } else if (s.nodes.some((n) => n.id === command.targetId && n.kind !== "branch")) {
          const node = s.nodes.find((n) => n.id === command.targetId)!
          requireUnlock({ kind: "resource", value: NODE_RESOURCE[node.kind] })
          job = { kind: "gather", targetId: command.targetId }
        } else
          throw new Error(
            "Escolha uma construção, plantação, árvore ou depósito de minério.",
          )
      }
      if (
        job.kind === "farm" &&
        !(u.job.kind === "farm" && u.job.targetId === job.targetId) &&
        farmWorkers(s, job.targetId).length >= MAX_FARM_WORKERS
      )
        throw new Error("Esta fazenda já tem quatro trabalhadores.")
      if (job.kind === "ranch" && s.units.some((unit) => unit.id !== u.id && unit.job.kind === "ranch" && unit.job.targetId === job.targetId))
        throw new Error("Este curral já tem um aldeão responsável.")
      const candidate = { ...u, job }
      if (
        job.kind !== "idle" &&
        findPath(s, candidate, jobGoals(s, candidate)) === null
      )
        throw new Error("Não há caminho livre até esse destino.")
      stowLoad(u)
      delete u.wallQueue
      u.job = job
      u.path = []
      u.work = 0
      u.status = "idle"
      break
    }
    default:
      throw new Error("Comando de vila desconhecido.")
  }
}

export function recruitmentCheck(s: VillageState, amount: number): { reason: string | null; spawn: Point[] } {
  const locked = unlockReason(s, { kind: "recruit" })
  if (locked) return { reason: locked, spawn: [] }
  if (s.units.length + pendingSoldiers(s) + (s.recruitment?.remaining ?? 0) + amount > populationCapacity(s))
    return { reason: "População no limite. Construa ou melhore uma casa.", spawn: [] }
  const missing = Math.ceil(RECRUIT_COST.food * amount - s.resources.food)
  if (missing > 0) return { reason: missing === 1 ? "Falta 1 comida." : `Faltam ${missing} comidas.`, spawn: [] }
  const center = s.buildings.find((b) => b.kind === "townCenter")
  const spawn = center ? approach(center)
    .filter((point) => walkable(s, point) && !s.units.some((u) => key(cell(u)) === key(point))) : []
  if (!spawn.length) return { reason: "Libere espaço ao redor do Centro da Vila.", spawn }
  return { reason: null, spawn }
}

function travel(s: VillageState, u: Unit, goals: Point[], dt: number): boolean {
  // Recompute a route when a construction blocks an existing path.
  const farmIds = accessibleFarms(s, u)
  if (!u.path.length || u.path.some((p) => !walkable(s, p, farmIds))) {
    const route = findPath(s, u, goals)
    if (route === null) {
      if (u.job.kind === "gather") {
        // Keep the current resource target. The expanded approach goals above
        // already tried alternate sides and nearby clear tiles for this node.
        u.status = "blocked"
        return false
      }
      u.status = "blocked"
      return false
    }
    u.path = route
  }
  let budget = dt * workerSpeed(s, u)
  while (u.path.length && budget > 0) {
    const next = u.path[0]
    const distance = Math.abs(next.x - u.x) + Math.abs(next.y - u.y)
    if (next.x !== u.x) u.facing = next.x > u.x ? "right" : "left"
    else if (next.y !== u.y) u.facing = next.y > u.y ? "down" : "up"
    if (distance <= budget) {
      u.x = next.x
      u.y = next.y
      u.path.shift()
      budget -= distance
    } else {
      if (next.x !== u.x) u.x += Math.sign(next.x - u.x) * budget
      else u.y += Math.sign(next.y - u.y) * budget
      budget = 0
    }
  }
  if (u.path.length) return false
  return goals.some((p) => Math.abs(p.x - u.x) + Math.abs(p.y - u.y) < 0.01)
}

function updateCombat(s: VillageState, dt: number) {
  const creatures = s.creatures!
  if (!creatures.length && s.economy.elapsed >= s.creatureSpawnAt!) {
    const corners = [{ x: 2, y: 2 }, { x: s.width - 3, y: 2 }, { x: 2, y: s.height - 3 }, { x: s.width - 3, y: s.height - 3 }]
    const firstCorner = Math.floor(s.economy.elapsed / 300) % corners.length
    let spawn: Point | undefined
    for (let offset = 0; offset < corners.length && !spawn; offset++) {
      const center = corners[(firstCorner + offset) % corners.length]
      for (let radius = 0; radius <= 8 && !spawn; radius++)
        for (let y = Math.max(1, center.y - radius); y <= Math.min(s.height - 2, center.y + radius) && !spawn; y++)
          for (let x = Math.max(1, center.x - radius); x <= Math.min(s.width - 2, center.x + radius); x++)
            if (Math.abs(x - center.x) + Math.abs(y - center.y) === radius && walkable(s, { x, y }) && !s.units.some((unit) => key(cell(unit)) === key({ x, y }))) { spawn = { x, y }; break }
    }
    if (spawn) {
      const kind = Math.floor(s.economy.elapsed / 300) % 2 === 0 ? "wolf" : "bear"
      const maxHealth = kind === "wolf" ? 65 : 150
      creatures.push({ id: crypto.randomUUID(), kind, ...spawn, health: maxHealth, maxHealth, attackProgress: 0 })
      s.creatureHasSpawned = true
    } else s.creatureSpawnAt = s.economy.elapsed + 10
  }

  for (const unit of s.units) {
    if (unit.job.kind !== "attackCreature") continue
    const targetId = unit.job.targetId
    const creature = creatures.find((candidate) => candidate.id === targetId)
    if (!creature) { unit.job = { kind: "idle" }; unit.path = []; unit.status = "idle"; continue }
    const range = unit.kind === "archer" ? 5 : 1.25
    const d = distance(unit, creature)
    if (d <= range) {
      unit.status = "working"
      unit.facing = creature.x < unit.x ? "left" : creature.x > unit.x ? "right" : creature.y < unit.y ? "up" : "down"
      unit.work += dt
      const rate = unit.kind === "archer" ? 1.1 : 1.35
      while (unit.work >= rate && creature.health > 0) {
        unit.work -= rate
        const base = unit.kind === "archer" ? 18 : unit.kind === "hero" ? 12 : unit.kind === "soldier" ? 14 : 4
        const tech = (s.weaponLevel ?? 0) * 5
        creature.health -= base + tech
      }
      creature.hostileTo = unit.id
    } else {
      const goals = neighbors(creature).filter((point) => walkable(s, point))
      unit.status = "walking"
      travel(s, unit, goals, dt)
    }
  }

  for (const tower of s.buildings.filter((building) => building.kind === "tower" && !building.construction)) {
    const archers = s.units.filter((unit) => unit.kind === "archer" && unit.job.kind === "garrison" && unit.job.targetId === tower.id)
    if (!archers.length) continue
    const target = creatures.filter((creature) => creature.hostileTo && creature.health > 0 && distance(tower, creature) <= 7)
      .sort((a, b) => distance(tower, a) - distance(tower, b))[0]
    if (!target) continue
    tower.attackProgress = (tower.attackProgress ?? 0) + dt
    while (tower.attackProgress >= 1) {
      tower.attackProgress -= 1
      target.health -= archers.length * (9 + tower.level * 4 + (s.weaponLevel ?? 0) * 3)
    }
  }

  for (const creature of creatures) {
    if (!creature.hostileTo || creature.health <= 0) continue
    const target = s.units.find((unit) => unit.id === creature.hostileTo)
    if (!target) { delete creature.hostileTo; creature.attackProgress = 0; continue }
    if (distance(creature, target) <= 1.5) {
      creature.attackProgress += dt
      while (creature.attackProgress >= 2) {
        creature.attackProgress -= 2
        const armorReduction = (target.armored ? 3 : 0) + (s.armorLevel ?? 0) * 2
        const damage = Math.max(1, (creature.kind === "wolf" ? 7 : 13) - armorReduction)
        target.health = Math.max(0, (target.health ?? (target.kind === "villager" ? 35 : 80)) - damage)
      }
    } else {
      creature.attackProgress = 0
      const goals = neighbors(target).filter((point) => walkable(s, point))
      const path = findPath(s, creature, goals)
      const next = path?.[0]
      if (next) {
        const speed = creature.kind === "wolf" ? 1.0 : 0.7
        const dx = next.x - creature.x
        const dy = next.y - creature.y
        const distanceToStep = Math.abs(dx) + Math.abs(dy)
        const amount = Math.min(distanceToStep, dt * speed)
        if (dx) creature.x += Math.sign(dx) * amount
        else creature.y += Math.sign(dy) * amount
      }
    }
  }

  const dead = new Set(s.units.filter((unit) => unit.health !== undefined && unit.health <= 0).map((unit) => unit.id))
  if (dead.size) {
    s.units = s.units.filter((unit) => !dead.has(unit.id))
    for (const unit of s.units) if (unit.job.kind === "attackCreature" && dead.has(unit.job.targetId)) unit.job = { kind: "idle" }
  }
  const deadCreatures = new Set(creatures.filter((creature) => creature.health <= 0).map((creature) => creature.id))
  if (deadCreatures.size) {
    for (const unit of s.units) if (unit.job.kind === "attackCreature" && deadCreatures.has(unit.job.targetId)) {
      unit.job = { kind: "idle" }; unit.path = []; unit.status = "idle"; unit.work = 0
    }
    s.creatures = creatures.filter((creature) => !deadCreatures.has(creature.id))
    if (!s.creatures.length) s.creatureSpawnAt = s.economy.elapsed + 300
  }
}

export function updateVillage(s: VillageState, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return
  // Small fixed steps keep meals, cooperative harvests and movement consistent at ×10.
  while (dt > 0.000001) {
    const step = Math.min(0.2, dt)
    updateStep(s, step)
    dt -= step
  }
}
function deliveryGoals(s: VillageState, resources: Resource[]) {
  if (!resources.length) return []
  return s.buildings
    .filter((building) => !building.construction && (
      building.kind === "barn" ||
      (building.kind === "townCenter" && resources.some((resource) => TOWN_CENTER_STORAGE[resource] > 0))
    ))
    .flatMap(approach)
}

function creditDelivery(s: VillageState, capacity: Resources, resource: Resource, amount: number) {
  const delivered = Math.min(amount, Math.max(0, capacity[resource] - s.resources[resource]))
  if (delivered > 0) {
    s.resources[resource] += delivered
    if (s.economy.foundation) s.economy.foundation.firstDelivery = true
    if (resource === "food") s.economy.foodIncome.push({ at: s.economy.elapsed, amount: delivered })
  }
  return delivered
}

function depositStowed(s: VillageState, u: Unit, capacity: Resources) {
  if (!u.stowed) return
  for (const resource of Object.keys(u.stowed) as Resource[]) {
    if (!deliveryGoals(s, [resource]).some((point) => distance(point, u) < 0.01)) continue
    const amount = u.stowed[resource] ?? 0
    const delivered = creditDelivery(s, capacity, resource, amount)
    if (amount === delivered) delete u.stowed[resource]
    else u.stowed[resource] = amount - delivered
  }
  if (Object.keys(u.stowed).length === 0) delete u.stowed
}
function updateStep(s: VillageState, dt: number) {
  s.economy.elapsed += dt
  s.creatures ??= []
  s.creatureSpawnAt ??= s.economy.elapsed
  s.creatureHasSpawned ??= s.creatures.length > 0
  const recruitment = s.recruitment
  if (recruitment?.remaining) {
    recruitment.progress = Math.min(RECRUIT_SECONDS, recruitment.progress + dt)
    if (recruitment.progress + 0.000001 >= RECRUIT_SECONDS) {
      const center = s.buildings.find((building) => building.kind === "townCenter")
      const spawn = center && approach(center).find((point) => walkable(s, point) && !s.units.some((unit) => key(cell(unit)) === key(point)))
      if (spawn && s.units.length < populationCapacity(s)) {
        s.units.push({
          id: crypto.randomUUID(), name: `Aldeão ${s.units.filter((unit) => unit.kind === "villager").length + 1}`,
          kind: "villager", ...spawn, job: { kind: "idle" }, status: "idle", path: [],
          work: 0, carrying: null, facing: "right",
          health: 35, maxHealth: 35,
        })
        recruitment.remaining--
        recruitment.progress = 0
      }
    }
  }
  const grownSaplings = s.saplings.filter(
    (sapling) => s.economy.elapsed + 0.000001 >= sapling.finishAt,
  )
  for (const sapling of grownSaplings)
    s.nodes.push({
      id: `tree-${sapling.id}`,
      kind: "tree",
      x: sapling.x,
      y: sapling.y,
      amount: 240,
      variant: Math.floor(sapling.startedAt / TREE_GROW_SECONDS) % 5,
    })
  s.saplings = s.saplings.filter(
    (sapling) => s.economy.elapsed + 0.000001 < sapling.finishAt,
  )
  for (const node of s.nodes) {
    if (node.regeneratesAt === undefined || s.economy.elapsed + 0.000001 < node.regeneratesAt) continue
    node.amount = DEPOSIT_AMOUNTS[node.kind] ?? node.amount
    delete node.regeneratesAt
  }
  if (s.improvements?.length) {
    for (const item of s.improvements.filter((item) => s.economy.elapsed + 0.000001 >= item.finishAt)) {
      if (item.kind === "research") s.research[item.research] = item.targetLevel
      else if (item.kind === "forge") {
        if (item.track === "tools") s.toolLevel = item.targetLevel
        else if (item.track === "weapons") s.weaponLevel = item.targetLevel
        else s.armorLevel = item.targetLevel
      } else {
        const building = s.buildings.find((b) => b.id === item.buildingId)
        if (building) building.level = item.targetLevel
      }
    }
    s.improvements = s.improvements.filter((item) => s.economy.elapsed + 0.000001 < item.finishAt)
  }
  for (const building of s.buildings) {
    if (building.kind === "ranch" && !building.construction && building.ranch) {
      for (const animal of building.ranch.animals)
        animal.growth = Math.min(1, animal.growth + dt / ANIMALS[animal.kind].growSeconds)
      const keeperAssigned = s.units.some((unit) => unit.kind === "villager" && unit.job.kind === "ranch" && unit.job.targetId === building.id)
      if (keeperAssigned && building.ranch.animals.length >= 1 && building.ranch.animals.length < RANCH_CAPACITIES[building.level]) {
        building.ranch.breedingElapsed = (building.ranch.breedingElapsed ?? 0) + dt
        if (building.ranch.breedingElapsed + 0.000001 >= RANCH_BREED_SECONDS && s.resources.food >= RANCH_BREED_FOOD_COST) {
          s.resources.food -= RANCH_BREED_FOOD_COST
          building.ranch.breedingElapsed = Math.max(0, building.ranch.breedingElapsed - RANCH_BREED_SECONDS)
          building.ranch.animals.push({ id: crypto.randomUUID(), kind: building.ranch.animals[0].kind, growth: 0 })
        }
      }
    }
    const production = building.production
    if (!production || building.construction) continue
    production.progress = Math.min(production.duration, production.progress + dt)
    if (production.progress + 0.000001 < production.duration) continue
    if (production.item === "soldier" || production.item === "archer") {
      if (s.units.length >= populationCapacity(s)) continue
      const spawn = approach(building).find((p) => walkable(s, p) && !s.units.some((u) => key(cell(u)) === key(p)))
      if (!spawn) continue
      s.units.push({
        id: crypto.randomUUID(),
        name: production.item === "archer"
          ? `Arqueiro ${s.units.filter((u) => u.kind === "archer").length + 1}`
          : `Soldado ${s.units.filter((u) => u.kind === "soldier").length + 1}`,
        kind: production.item,
        ...spawn,
        job: { kind: "idle" },
        status: "idle",
        path: [],
        work: 0,
        carrying: null,
        armored: false,
        facing: "right",
        health: production.item === "archer" ? 55 : 80,
        maxHealth: production.item === "archer" ? 55 : 80,
      })
    } else {
      s.crafts ??= { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
      s.crafts[production.item] += craftOutput(production.item, building.level).yield
    }
    production.remaining = (production.remaining ?? 1) - 1
    if (production.remaining <= 0) delete building.production
    else production.progress = 0
  }
  s.economy.upkeepElapsed += dt
  if (s.economy.upkeepElapsed + 0.000001 >= UPKEEP_INTERVAL) {
    s.economy.upkeepElapsed = Math.max(
      0,
      s.economy.upkeepElapsed - UPKEEP_INTERVAL,
    )
    const cost = upkeepCost(s)
    s.economy.foodShortage = s.resources.food < cost
    s.resources.food = Math.max(0, s.resources.food - cost)
  }
  const cutoff = s.economy.elapsed - PRODUCTION_WINDOW
  s.economy.foodIncome = s.economy.foodIncome.filter((p) => p.at > cutoff)
  for (const farm of s.buildings)
    if (farm.productionLog)
      farm.productionLog = farm.productionLog.filter((p) => p.at > cutoff)
  updateCombat(s, dt)
  for (const u of s.units) {
    if (u.job.kind === "attackCreature" || u.job.kind === "garrison") continue
    if (u.carrying) {
      const { resource, amount } = u.carrying
      const capacity = storageCapacities(s)
      const goals = deliveryGoals(s, [resource])
      if (!goals.length || s.resources[resource] >= capacity[resource]) {
        u.status = "storageFull"
        u.path = []
        continue
      }
      u.status = "delivering"
      if (!travel(s, u, goals, dt)) continue
      u.carrying.amount -= creditDelivery(s, capacity, resource, amount)
      depositStowed(s, u, capacity)
      if (u.carrying.amount > 0) {
        u.status = "storageFull"
        continue
      }
      u.carrying = null
      u.path = []
      u.work = 0
      continue
    }
    if (u.job.kind === "idle") {
      if (u.stowed && Object.keys(u.stowed).length > 0) {
        const capacity = storageCapacities(s)
        const deliverable = (Object.keys(u.stowed) as Resource[]).filter(
          (resource) => s.resources[resource] < capacity[resource],
        )
        const goals = deliveryGoals(s, deliverable)
        if (!goals.length) {
          u.status = "storageFull"
          u.path = []
          continue
        }
        u.status = "delivering"
        if (travel(s, u, goals, dt)) {
          depositStowed(s, u, capacity)
          u.path = []
        }
        continue
      }
      u.status = "idle"
      continue
    }
    if (u.job.kind === "gather") {
      const targetId = u.job.targetId
      if (s.nodes.some((node) => node.id === targetId && node.regeneratesAt !== undefined)) {
        u.status = "waiting"
        u.path = []
        u.work = 0
        continue
      }
    }

    const goals = jobGoals(s, u)
    if (!goals.length) {
      u.job = { kind: "idle" }
      u.status = "idle"
      u.path = []
      continue
    }
    u.status = "walking"
    if (!travel(s, u, goals, dt)) continue
    if (u.job.kind === "move") {
      u.job = { kind: "idle" }
      u.status = "idle"
      continue
    }
    if (u.job.kind === "plant") {
      u.status = "planting"
      u.work += dt
      if (u.work + 0.000001 >= 30) {
        const id = crypto.randomUUID()
        const destination = u.job.destination
        const safe = isVillageGround(s, destination.x, destination.y) &&
          !s.buildings.some((building) => resourceNearBuilding(destination, "tree", building))
          ? destination : nearestResourceLand(s, destination, "tree")
        if (!safe) {
          s.seeds.tree++
          u.job = { kind: "idle" }
          u.path = []
          u.work = 0
          u.status = "idle"
          continue
        }
        s.saplings.push({
          id,
          ...safe,
          startedAt: s.economy.elapsed,
          finishAt: s.economy.elapsed + TREE_GROW_SECONDS,
        })
        u.job = { kind: "idle" }
        u.path = []
        u.work = 0
        u.status = "idle"
      }
      continue
    }
    if (u.job.kind === "build") {
      const targetId = u.job.targetId
      const site = s.buildings.find((b) => b.id === targetId)
      if (!site?.construction) {
        releaseBuilder(s, targetId)
        continue
      }
      u.status = "building"
      site.construction.progress = Math.min(
        site.construction.duration,
        site.construction.progress + dt * workerEfficiency(s, u),
      )
      if (site.construction.progress + 0.000001 >= site.construction.duration) {
        delete site.construction
        releaseBuilder(s, site.id)
      }
      continue
    }
    if (u.job.kind === "ranch") {
      const targetId = u.job.targetId
      const ranch = s.buildings.find((b) => b.id === targetId && b.kind === "ranch")
      const animal = ranch?.ranch?.animals.find((candidate) => candidate.growth >= 1)
      if (!animal) {
        u.status = "waiting"
        u.work = 0
        continue
      }
      const yieldForAnimal = ANIMALS[animal.kind]
      const capacity = storageCapacities(s)
      const productCapacity = productStorageCapacities(s)
      s.animalProducts ??= { milk: 0, wool: 0, eggs: 0, feathers: 0 }
      s.animalProducts.eggs ??= 0
      s.animalProducts.feathers ??= 0
      const food = Math.min(yieldForAnimal.food, Math.max(0, capacity.food - s.resources.food))
      const milk = Math.min(yieldForAnimal.milk, Math.max(0, productCapacity.milk - s.animalProducts.milk))
      const wool = Math.min(yieldForAnimal.wool, Math.max(0, productCapacity.wool - s.animalProducts.wool))
      const eggs = Math.min(yieldForAnimal.eggs, Math.max(0, productCapacity.eggs - s.animalProducts.eggs))
      const feathers = Math.min(yieldForAnimal.feathers, Math.max(0, productCapacity.feathers - s.animalProducts.feathers))
      if (food + milk + wool + eggs + feathers === 0) {
        u.status = "storageFull"
        continue
      }
      u.status = "harvesting"
      u.work += dt * workerEfficiency(s, u)
      if (u.work + 0.000001 >= RANCH_HARVEST_SECONDS) {
        s.resources.food += food
        s.animalProducts.milk += milk
        s.animalProducts.wool += wool
        s.animalProducts.eggs += eggs
        s.animalProducts.feathers += feathers
        if (food) s.economy.foodIncome.push({ at: s.economy.elapsed, amount: food })
        animal.growth = 0
        u.work = 0
      }
      continue
    }
    const farmPhase =
      u.job.kind === "farm"
        ? s.buildings.find(
            (b) => b.id === (u.job as { targetId: string }).targetId,
          )?.farmCycle?.phase
        : undefined
    u.status =
      farmPhase === "planting"
        ? "planting"
        : farmPhase === "growing"
          ? "waiting"
          : farmPhase === "harvesting"
            ? "harvesting"
            : "working"
    u.work += dt * workerEfficiency(s, u)
    if (u.job.kind === "gather" && u.work >= 3) {
      const node = s.nodes.find(
        (n) => n.id === (u.job as { targetId: string }).targetId,
      )!
      const carryCapacity =
        8 + (u.kind === "villager" ? s.research.workers * 2 + (s.toolLevel ?? 0) * 2 : 0)
      const resource = NODE_RESOURCE[node.kind]
      const weightedCapacity =
        resource === "stone" || resource === "gold"
          ? Math.max(1, Math.floor(carryCapacity / 3))
          : carryCapacity
      const amount = Math.min(weightedCapacity, node.amount)
      node.amount -= amount
      if (node.amount <= 0) {
        if (DEPOSIT_AMOUNTS[node.kind] !== undefined)
          node.regeneratesAt = s.economy.elapsed + DEPOSIT_REGEN_SECONDS
        const nextNode = nearestReachableResource(s, u, node.kind, node.id)
        if (nextNode) u.job = { kind: "gather", targetId: nextNode.id }
      }
      u.carrying = { resource, amount }
      u.status = "delivering"
      u.path = []
      u.work = 0
    }
  }
  for (const farm of s.buildings.filter((b) => b.kind === "farm" && !b.construction)) {
    const cycle = farm.farmCycle!
    const present = farmWorkers(s, farm.id).filter(
      (u) =>
        !u.carrying &&
        ["working", "planting", "waiting", "harvesting"].includes(u.status),
    )
    const workRate = present.reduce(
      (n, u) =>
        n +
        workerEfficiency(s, u) *
          (u.kind === "villager" ? 1 + s.research.workers * 0.15 : 1),
      0,
    )
    // Planting, growth, and harvest all pause while no worker is at the farm.
    if (!present.length) continue
    if (cycle.phase === "planting") {
      // The seed paid when the farm was placed supplies its following harvest cycles.
      cycle.seedPaid = true
      cycle.progress = Math.min(
        1,
        cycle.progress + (dt * workRate) / FARM_PLANT_SECONDS,
      )
      if (cycle.progress + 0.000001 >= 1) {
        cycle.phase = "growing"
        cycle.progress = 0
        farm.growth = 0
      }
    } else if (cycle.phase === "growing") {
      farm.growth = Math.min(
        1,
        farm.growth +
          (dt * farmGrowthMultiplier(s, present, farm)) / CROPS[farm.crop!].seconds,
      )
      cycle.progress = farm.growth
      if (farm.growth + 0.000001 >= 1) {
        farm.growth = 1
        cycle.phase = "harvesting"
        cycle.progress = 0
      }
    } else {
      cycle.progress = Math.min(
        1,
        cycle.progress + (dt * workRate) / FARM_HARVEST_SECONDS,
      )
      if (cycle.progress + 0.000001 < 1 || !present.length) continue
      let produced = 0
      for (const u of present) {
        const amount = farmYield(s, farm, u)
        produced += amount
        u.carrying = { resource: "food", amount }
        u.status = "delivering"
        u.path = []
        u.work = 0
      }
      farm.growth = 0
      farm.farmCycle = { phase: "planting", progress: 0, seedPaid: true }
      if (s.economy.foundation && s.economy.foundation.harvestedFood < 60)
        s.economy.foundation.harvestedFood = Math.min(60, s.economy.foundation.harvestedFood + produced)
      ;(farm.productionLog ??= []).push({
        at: s.economy.elapsed,
        amount: produced,
      })
    }
  }
  s.nodes = s.nodes.filter(occupiesResourceTile)
}

const maxBuildingLevel = (kind: Building["kind"]) =>
  kind === "townCenter" || kind === "barn" ? 8 : kind === "ranch" || kind === "weaving" ? 5 : kind === "tower" ? 4 : 3

export function validateVillage(
  saved: VillageState,
  allowLegacy = false,
): VillageState {
  if (
    (saved.version !== 4 &&
      !(allowLegacy && [1, 2, 3].includes(Number(saved.version)))) ||
    (saved.width !== VILLAGE_SIZE && !(allowLegacy && saved.width === 32)) ||
    (saved.height !== VILLAGE_SIZE && !(allowLegacy && saved.height === 32)) ||
    !Array.isArray(saved.units) ||
    !Array.isArray(saved.buildings) ||
    !Array.isArray(saved.nodes) ||
    !saved.resources ||
    ["wood", "stone", "food", "iron", "gold"].some(
      (k) =>
        !Number.isFinite(saved.resources[k as Resource]) ||
        saved.resources[k as Resource] < 0,
    )
  ) {
    throw new Error(
      "Salvamento de vila inválido. Preserve o arquivo antes de reparar.",
    )
  }
  const finitePoint = (p: Point) =>
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < VILLAGE_SIZE &&
    p.y < VILLAGE_SIZE
  if (
    saved.buildings.some(
      (b) =>
        !finitePoint(b) ||
        !Object.prototype.hasOwnProperty.call(BUILDINGS, b.kind) ||
        !Number.isInteger(b.x) ||
        !Number.isInteger(b.y) ||
        typeof b.id !== "string" ||
        b.width !==
          (allowLegacy && Number(saved.version) === 1 && b.kind === "farm"
            ? 2
            : BUILDINGS[b.kind].width) ||
        b.height !==
          (allowLegacy && Number(saved.version) === 1 && b.kind === "farm"
            ? 2
            : BUILDINGS[b.kind].height) ||
        !Number.isInteger(b.level) || b.level < 1 || b.level > maxBuildingLevel(b.kind) ||
        !Number.isFinite(b.growth) ||
        b.growth < 0 ||
        b.growth > 1 ||
        (b.kind === "farm" &&
          !Object.prototype.hasOwnProperty.call(CROPS, b.crop!)),
    ) ||
    saved.nodes.some(
      (n) =>
        !finitePoint(n) ||
        !Number.isInteger(n.amount) ||
        n.amount < 0 ||
        (n.amount === 0
          ? DEPOSIT_AMOUNTS[n.kind] === undefined || !Number.isFinite(n.regeneratesAt) || n.regeneratesAt! < 0
          : n.regeneratesAt !== undefined) ||
        !Object.prototype.hasOwnProperty.call(NODE_RESOURCE, n.kind) ||
        typeof n.id !== "string",
    ) ||
    saved.units.some(
      (u) =>
        !finitePoint(u) ||
        typeof u.id !== "string" ||
        !["hero", "villager", "soldier", "archer"].includes(u.kind) ||
        (u.armored !== undefined && (!["soldier", "archer"].includes(u.kind) || typeof u.armored !== "boolean")) ||
        !u.job ||
        !["idle", "move", "plant", "farm", "gather", "build", "ranch", "attackCreature", "garrison"].includes(u.job.kind) ||
        !Array.isArray(u.path) ||
        u.path.some((p) => !finitePoint(p)) ||
        (u.job.kind === "move" && !finitePoint(u.job.destination)) ||
        ((u.job.kind === "attackCreature" || u.job.kind === "garrison") && typeof u.job.targetId !== "string") ||
        (u.health !== undefined && (!Number.isFinite(u.health) || u.health < 0 || (u.maxHealth !== undefined && u.health > u.maxHealth))) ||
        (u.maxHealth !== undefined && (!Number.isFinite(u.maxHealth) || u.maxHealth <= 0)) ||
        (u.job.kind === "plant" && (!finitePoint(u.job.destination) || u.kind !== "villager" || !isVillageGround(saved, u.job.destination.x, u.job.destination.y))) ||
        !Number.isFinite(u.work) ||
        (u.carrying &&
          (!Object.prototype.hasOwnProperty.call(
            saved.resources,
            u.carrying.resource,
          ) ||
            !Number.isInteger(u.carrying.amount) ||
            u.carrying.amount <= 0)) ||
        (u.stowed !== undefined &&
          (!u.stowed ||
            typeof u.stowed !== "object" ||
            Array.isArray(u.stowed) ||
            Object.entries(u.stowed).some(
              ([resource, amount]) =>
                !Object.prototype.hasOwnProperty.call(saved.resources, resource) ||
                !Number.isSafeInteger(amount) ||
                (amount as number) <= 0,
            ))),
    ) ||
    (saved.creatures !== undefined && (!Array.isArray(saved.creatures) || saved.creatures.some((creature) =>
      !finitePoint(creature) || typeof creature.id !== "string" || !["wolf", "bear"].includes(creature.kind) ||
      !Number.isFinite(creature.health) || creature.health < 0 || !Number.isFinite(creature.maxHealth) || creature.maxHealth <= 0 ||
      !Number.isFinite(creature.attackProgress) || creature.attackProgress < 0 || creature.attackProgress >= 2 ||
      (creature.hostileTo !== undefined && typeof creature.hostileTo !== "string")))) ||
    (saved.creatureSpawnAt !== undefined && (!Number.isFinite(saved.creatureSpawnAt) || saved.creatureSpawnAt < 0))
    || (saved.creatureHasSpawned !== undefined && typeof saved.creatureHasSpawned !== "boolean")
  ) {
    throw new Error(
      "Entidades inválidas no salvamento de vila. Preserve o arquivo antes de reparar.",
    )
  }
  if (Number(saved.version) >= 2) {
    const validLog = (log: { at: number; amount: number }[]) =>
      Array.isArray(log) &&
      log.every(
        (p) =>
          p &&
          Number.isFinite(p.at) &&
          p.at >= 0 &&
          Number.isFinite(p.amount) &&
          p.amount >= 0,
      )
    if (
      !saved.research ||
      Object.keys(RESEARCH).some(
        (k) =>
          ![0, 1, 2, 3].includes(saved.research[k as keyof typeof RESEARCH]),
      ) ||
      !saved.economy ||
      (saved.economy.foundation !== undefined && (
        !saved.economy.foundation ||
        typeof saved.economy.foundation.firstDelivery !== "boolean" ||
        !Number.isSafeInteger(saved.economy.foundation.harvestedFood) ||
        saved.economy.foundation.harvestedFood < 0 ||
        saved.economy.foundation.harvestedFood > 60
      )) ||
      !Number.isFinite(saved.economy.elapsed) ||
      (saved.recruitment !== undefined && (
        !saved.recruitment ||
        !Number.isSafeInteger(saved.recruitment.remaining) ||
        saved.recruitment.remaining < 0 ||
        saved.recruitment.remaining > 1000 ||
        !Number.isFinite(saved.recruitment.progress) ||
        saved.recruitment.progress < 0 ||
        saved.recruitment.progress > RECRUIT_SECONDS ||
        (saved.recruitment.remaining === 0 && saved.recruitment.progress !== 0)
      )) ||
      saved.economy.elapsed < 0 ||
      !Number.isFinite(saved.economy.upkeepElapsed) ||
      saved.economy.upkeepElapsed < 0 ||
      saved.economy.upkeepElapsed >= UPKEEP_INTERVAL ||
      typeof saved.economy.foodShortage !== "boolean" ||
      !validLog(saved.economy.foodIncome) ||
      saved.buildings.some(
        (b) => b.productionLog && !validLog(b.productionLog),
      ) ||
      !Array.isArray(saved.farmBlueprints) ||
      (Number(saved.version) >= 3 && saved.farmBlueprints.length > 0) ||
      saved.farmBlueprints.some(
        (b) =>
          !b ||
          typeof b.id !== "string" ||
          !Object.prototype.hasOwnProperty.call(CROPS, b.crop) ||
          ![1, 2, 3].includes(b.level) ||
          !Number.isFinite(b.growth) ||
          b.growth < 0 ||
          b.growth > 1,
      ) ||
      saved.buildings.some(
        (b) =>
          b.kind === "farm" &&
          farmWorkers(saved, b.id).length > MAX_FARM_WORKERS,
      )
    ) {
      throw new Error("Economia inválida no salvamento da vila.")
    }
  }
  if (
    Number(saved.version) === 4 &&
    (!saved.seeds ||
      (saved.animalProducts !== undefined && (["milk", "wool", "eggs", "feathers"] as const).some((kind) => !Number.isSafeInteger(saved.animalProducts?.[kind] ?? 0) || (saved.animalProducts?.[kind] ?? 0) < 0)) ||
      saved.buildings.some((building) => building.kind === "ranch" && (
        !building.ranch || !Array.isArray(building.ranch.animals) ||
        building.ranch.animals.length > RANCH_CAPACITIES[building.level] ||
        (building.ranch.kind !== null && !Object.prototype.hasOwnProperty.call(ANIMALS, building.ranch.kind)) ||
        building.ranch.animals.some((animal) => !animal || typeof animal.id !== "string" || !Object.prototype.hasOwnProperty.call(ANIMALS, animal.kind) || animal.kind !== building.ranch?.kind || !Number.isFinite(animal.growth) || animal.growth < 0 || animal.growth > 1)
      )) ||
      (saved.crafts !== undefined && (Object.keys(CRAFT_RECIPES).some((item) => !Number.isSafeInteger(saved.crafts?.[item as CraftItem]) || (saved.crafts?.[item as CraftItem] ?? -1) < 0))) ||
      (saved.toolLevel !== undefined && ![0, 1, 2, 3, 4].includes(saved.toolLevel)) ||
      (saved.weaponLevel !== undefined && ![0, 1, 2, 3, 4].includes(saved.weaponLevel)) ||
      (saved.armorLevel !== undefined && ![0, 1, 2, 3, 4].includes(saved.armorLevel)) ||
      Object.keys(SEED_PRICES).some((seed) =>
        !Number.isSafeInteger(saved.seeds[seed as SeedKind]) ||
        saved.seeds[seed as SeedKind] < 0,
      ) ||
      !Array.isArray(saved.saplings) ||
      (saved.foodBushesSeeded !== undefined && typeof saved.foodBushesSeeded !== "boolean") ||
      saved.saplings.some((sapling) =>
        !sapling ||
        typeof sapling.id !== "string" ||
        !Number.isInteger(sapling.x) ||
        !Number.isInteger(sapling.y) ||
        !isVillageGround(saved, sapling.x, sapling.y) ||
        !Number.isFinite(sapling.startedAt) ||
        !Number.isFinite(sapling.finishAt) ||
        sapling.startedAt < 0 ||
        sapling.finishAt <= saved.economy.elapsed ||
        Math.abs(sapling.finishAt - sapling.startedAt - TREE_GROW_SECONDS) > 0.000001 ||
        saved.buildings.some((building) => inside(sapling, building)) ||
        saved.nodes.some((node) => node.x === sapling.x && node.y === sapling.y && occupiesResourceTile(node)) ||
        saved.saplings.some((other) => other !== sapling && other.x === sapling.x && other.y === sapling.y)
      ) ||
      !validVillageMapTiles(saved) ||
      saved.nodes.some((n) => !isRetainedNode(n) || !isVillageGround(saved, n.x, n.y)) ||
      saved.buildings.some(
        (b) =>
          b.kind === "farm" &&
          (!b.farmCycle ||
            !["planting", "growing", "harvesting"].includes(
              b.farmCycle.phase,
            ) ||
            !Number.isFinite(b.farmCycle.progress) ||
            b.farmCycle.progress < 0 ||
            b.farmCycle.progress > 1),
      ) ||
      saved.buildings.some((b) => b.construction && (
        b.kind === "townCenter" ||
        !Number.isFinite(b.construction.progress) ||
        b.construction.progress < 0 ||
        b.construction.duration !== BUILD_SECONDS[b.kind as keyof typeof BUILD_SECONDS] ||
        b.construction.progress >= b.construction.duration
      )) ||
      saved.buildings.some((b) => b.production && (
        b.construction ||
        (b.production.remaining !== undefined && (!Number.isInteger(b.production.remaining) || b.production.remaining < 1 || b.production.remaining > 20)) ||
        (b.production.total !== undefined && (!Number.isInteger(b.production.total) || b.production.total < 1 || b.production.total > 20)) ||
        !Number.isFinite(b.production.progress) ||
        b.production.progress < 0 ||
        b.production.progress > b.production.duration ||
        (b.production.item === "soldier" || b.production.item === "archer"
          ? b.kind !== "barracks" || b.production.duration !== (b.production.item === "archer" ? ARCHER_SECONDS : SOLDIER_SECONDS)
          : !Object.prototype.hasOwnProperty.call(CRAFT_RECIPES, b.production.item) ||
            CRAFT_RECIPES[b.production.item as CraftItem].building !== b.kind ||
            craftOutput(b.production.item as CraftItem, b.level).seconds !== b.production.duration)
      )) ||
      (saved.improvements !== undefined &&
        (!Array.isArray(saved.improvements) ||
          saved.improvements.some((item) => {
            if (!item || !["research", "building", "forge"].includes(item.kind))
              return true
            if (
              !Number.isFinite(item.startedAt) ||
              !Number.isFinite(item.finishAt) ||
              ![1, 2, 3, 4, 5, 6, 7, 8].includes(item.targetLevel) ||
              item.startedAt < 0 ||
              item.startedAt > saved.economy.elapsed ||
              Math.abs(item.finishAt - item.startedAt - (item.kind === "forge"
                ? FORGE_UPGRADES[item.targetLevel as 1 | 2 | 3 | 4]?.seconds
                : IMPROVEMENT_SECONDS[item.targetLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8])) > 0.000001
            ) return true
            if (item.kind === "forge") {
              const levels = { tools: saved.toolLevel ?? 0, weapons: saved.weaponLevel ?? 0, armor: saved.armorLevel ?? 0 }
              return !["tools", "weapons", "armor"].includes(item.track) || item.targetLevel > MAX_FORGE_LEVEL ||
                levels[item.track] !== item.targetLevel - 1 ||
                saved.improvements!.some((other) => other !== item && other.kind === "forge" && other.track === item.track)
            }
            if (item.kind === "research")
              return item.targetLevel > 3 || !Object.prototype.hasOwnProperty.call(RESEARCH, item.research) ||
                saved.research[item.research] !== item.targetLevel - 1 ||
                saved.improvements!.some((other) => other !== item && other.kind === "research" && other.research === item.research)
            const building = saved.buildings.find((b) => b.id === item.buildingId)
            return !building ||
              ![2, 3, 4, 5, 6, 7, 8].includes(item.targetLevel) ||
              building.kind === "well" ||
              item.targetLevel > maxBuildingLevel(building.kind) ||
              (building.kind === "weaving" && !!building.production) ||
              building.level !== item.targetLevel - 1 ||
              saved.improvements!.some((other) => other !== item && other.kind === "building" && other.buildingId === item.buildingId)
          })))
  ))
    throw new Error(
      "Ciclo, melhoria ou recursos naturais inválidos no salvamento.",
    )
  return saved
}

function removeUnusedStarterBarn(s: VillageState) {
  const foundation = s.economy.foundation
  if (!foundation || foundation.firstDelivery || foundation.harvestedFood > 0 ||
    s.buildings.length !== 3 || s.improvements?.length ||
    s.units.length !== 2 || s.units.some((u) => u.job.kind !== "idle" || u.carrying || u.stowed) ||
    s.resources.wood !== 80 || s.resources.stone !== 40 || s.resources.iron !== 0 || s.resources.gold !== 0
  ) return
  const starter = s.buildings.find((b) =>
    b.id === "starter-barn" && b.kind === "barn" && b.level === 1 && !b.construction,
  )
  if (starter) s.buildings = s.buildings.filter((b) => b !== starter)
}

export function migrateVillage(input: VillageState): VillageState {
  if (Number(input.version) === 4) {
    const current = structuredClone(input)
    current.recruitment ??= { remaining: 0, progress: 0 }
    current.creatures ??= []
    const firstSpawnNotYetHappened = current.creatureHasSpawned === undefined && current.creatures.length === 0
    current.creatureHasSpawned ??= current.creatures.length > 0
    current.creatureSpawnAt ??= current.economy.elapsed
    if (firstSpawnNotYetHappened) current.creatureSpawnAt = current.economy.elapsed
    for (const unit of current.units) {
      const health = unit.kind === "hero" ? 100 : unit.kind === "villager" ? 35 : unit.kind === "archer" ? 55 : 80
      unit.maxHealth ??= health
      unit.health ??= unit.maxHealth
      unit.health = Math.min(unit.maxHealth, unit.health)
    }
    for (const farm of current.buildings.filter((building) => building.kind === "farm")) {
      farm.width = BUILDINGS.farm.width
      farm.height = BUILDINGS.farm.height
    }
    for (const unit of current.units)
      if (unit.job.kind === "farm") unit.path = []
    current.seeds ??= { carrot: 5, wheat: 5, potato: 5, tree: 3 }
    current.saplings ??= []
    current.crafts ??= { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
    current.animalProducts ??= { milk: 0, wool: 0, eggs: 0, feathers: 0 }
    current.animalProducts.eggs ??= 0
    current.animalProducts.feathers ??= 0
    current.toolLevel ??= 0
    current.weaponLevel ??= 0
    current.armorLevel ??= 0
    const stalledBySeedBug = current.resources.food === 0 && current.buildings.some(
      (building) => building.kind === "farm" && building.farmCycle?.phase === "planting" &&
        building.farmCycle.seedPaid === false && current.seeds[building.crop!] === 0,
    )
    if (stalledBySeedBug)
      current.resources.food = Math.min(100, storageCapacities(current).food)
    for (const farm of current.buildings.filter((building) => building.kind === "farm"))
      if (farm.farmCycle) farm.farmCycle.seedPaid = true
    removeUnusedStarterBarn(current)
    expandVillage(current)
    seedFoodBushes(current)
    migrateResourceRegions(current)
    const removed = new Set(
      current.nodes.filter((node) => !isRetainedNode(node)).map((node) => node.id),
    )
    current.nodes = current.nodes.filter(isRetainedNode)
    for (const unit of current.units)
      if (unit.job.kind === "gather" && removed.has(unit.job.targetId)) {
        unit.job = { kind: "idle" }
        unit.path = []
        unit.work = 0
        unit.status = unit.carrying ? "delivering" : "idle"
      }
    return validateVillage(current)
  }
  if (Number(input.version) === 3)
    return upgradeWorldV4(validateVillage(structuredClone(input), true))
  if (Number(input.version) === 2) {
    const s = validateVillage(structuredClone(input), true)
    // Old, already-dismantled farms are refunded once instead of becoming reusable blueprints.
    for (const farm of s.farmBlueprints) {
      s.resources.wood += BUILDINGS.farm.cost.wood
      for (let level = 2; level <= farm.level; level++)
        for (const [resource, amount] of Object.entries(UPGRADE_COSTS[level]))
          s.resources[resource as Resource] += amount
    }
    s.farmBlueprints = []
    return upgradeWorldV4(s)
  }
  const old = validateVillage(structuredClone(input), true)
  const s: VillageState = {
    ...old,
    version: 4,
    research: { workers: 0, agriculture: 0, fertilizer: 0, irrigation: 0 },
    farmBlueprints: [],
    economy: {
      elapsed: 0,
      upkeepElapsed: 0,
      foodShortage: false,
      foodIncome: [],
    },
  }
  const farms = s.buildings.filter((b) => b.kind === "farm")
  s.buildings = s.buildings.filter((b) => b.kind !== "farm")
  // Enlarge each existing farm in the nearest free area. Never delete paid upgrades.
  const units = s.units
  s.units = []
  for (const farm of farms) {
    const candidates: Point[] = []
    for (let y = 1; y < s.height - 4; y++)
      for (let x = 1; x < s.width - 4; x++) candidates.push({ x, y })
    candidates.sort(
      (a, b) =>
        Math.abs(a.x - farm.x) +
        Math.abs(a.y - farm.y) -
        (Math.abs(b.x - farm.x) + Math.abs(b.y - farm.y)),
    )
    const target = candidates.find((p) => !placementError(s, "farm", p.x, p.y))
    if (target)
      s.buildings.push({
        ...farm,
        ...target,
        width: 4,
        height: 4,
        productionLog: [],
      })
    else {
      s.resources.wood += BUILDINGS.farm.cost.wood
      for (let level = 2; level <= farm.level; level++)
        for (const [resource, amount] of Object.entries(UPGRADE_COSTS[level]))
          s.resources[resource as Resource] += amount
    }
  }
  s.units = units
  for (const u of s.units) {
    u.path = []
    u.work = 0
    if (u.job.kind === "farm") {
      const id = u.job.targetId
      if (!s.buildings.some((b) => b.id === id)) u.job = { kind: "idle" }
    }
  }
  return upgradeWorldV4(s)
}

function upgradeWorldV4(s: VillageState): VillageState {
  expandVillage(s)
  s.crafts ??= { nails: 0, cloth: 0, clothing: 0, tools: 0, weapons: 0, armor: 0 }
  s.animalProducts ??= { milk: 0, wool: 0, eggs: 0, feathers: 0 }
  s.animalProducts.eggs ??= 0
  s.animalProducts.feathers ??= 0
  s.toolLevel ??= 0
  s.weaponLevel ??= 0
  s.armorLevel ??= 0
  seedFoodBushes(s)
  s.version = 4
  s.seeds ??= { carrot: 5, wheat: 5, potato: 5, tree: 3 }
  s.saplings ??= []
  clearResourcesNearBuildings(s)
  const removed = new Set(
    s.nodes.filter((n) => !isRetainedNode(n)).map((n) => n.id),
  )
  s.nodes = s.nodes.filter(isRetainedNode)
  for (const unit of s.units)
    if (unit.job.kind === "gather" && removed.has(unit.job.targetId)) {
      unit.job = { kind: "idle" }
      unit.path = []
      unit.work = 0
      unit.status = unit.carrying ? "delivering" : "idle"
    }
  for (const farm of s.buildings.filter((b) => b.kind === "farm"))
    farm.farmCycle = {
      phase:
        farm.growth >= 1
          ? "harvesting"
          : farm.growth > 0
            ? "growing"
            : "planting",
      progress: farm.growth >= 1 ? 0 : farm.growth,
      seedPaid: true,
    }
  return validateVillage(s)
}
