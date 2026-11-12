import { BUILDINGS, inside, isLand, RESOURCE_NODE_AMOUNTS } from "./config"
import { MAP_SURFACES } from "./mapSurfaces"
import type { Building, BuildingKind, MapResourceKind, Point, ResourceNode, VillageMapEdit, VillageMapTile, VillageState } from "./types"

type MapSize = Pick<VillageState, "width" | "height">
type MapTerrain = MapSize & Pick<VillageState, "mapTiles">

export const mapKey = ({ x, y }: Point) => `${x}-${y}`
const inBounds = (map: MapSize, x: number, y: number) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height

function defaultMapTile(map: MapSize, x: number, y: number): VillageMapTile {
  return { surface: isLand(x, y, map.width, map.height) ? "grass" : "water", elevation: 0 }
}

export function mapTileAt(map: MapTerrain, x: number, y: number): VillageMapTile {
  return map.mapTiles?.[mapKey({ x, y })] ?? defaultMapTile(map, x, y)
}

export function isVillageGround(map: MapTerrain, x: number, y: number) {
  if (!inBounds(map, x, y)) return false
  const tile = map.mapTiles?.[mapKey({ x, y })]
  return tile ? tile.surface !== "water" && tile.elevation === 0 : isLand(x, y, map.width, map.height)
}

const validSurface = (value: unknown) =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(MAP_SURFACES, value)
const validElevation = (value: unknown) => value === 0 || value === 1 || value === 2

export function validVillageMapTiles(map: MapTerrain) {
  const tiles = map.mapTiles
  if (tiles === undefined) return true
  if (!tiles || typeof tiles !== "object" || Array.isArray(tiles)) return false
  return Object.entries(tiles).every(([key, tile]) => {
    const [x, y] = key.split("-").map(Number)
    return key === mapKey({ x, y }) && inBounds(map, x, y) &&
      tile && validSurface(tile.surface) && validElevation(tile.elevation) &&
      (tile.surface !== "water" || tile.elevation === 0)
  })
}

function editableResource(kind: unknown): kind is MapResourceKind {
  return typeof kind === "string" && Object.prototype.hasOwnProperty.call(RESOURCE_NODE_AMOUNTS, kind)
}
function editableBuilding(kind: unknown): kind is BuildingKind {
  return typeof kind === "string" && Object.prototype.hasOwnProperty.call(BUILDINGS, kind)
}

function protectedTile(village: VillageState, p: Point) {
  if (village.buildings.some((building) => inside(p, building))) return "uma construção"
  if (village.saplings.some((sapling) => sapling.x === p.x && sapling.y === p.y)) return "uma muda"
  if (village.units.some((unit) => Math.round(unit.x) === p.x && Math.round(unit.y) === p.y)) return "uma unidade"
  if (village.units.some((unit) =>
    unit.job.kind === "plant" && unit.job.destination.x === p.x && unit.job.destination.y === p.y,
  )) return "um plantio em andamento"
  return null
}

export function villageMapEditIssue(village: VillageState, edit: VillageMapEdit, currentNode?: ResourceNode): string | null {
  if (!edit || !inBounds(village, edit.x, edit.y) ||
    (edit.surface !== undefined && !validSurface(edit.surface)) ||
    (edit.elevation !== undefined && !validElevation(edit.elevation)) ||
    (edit.resource !== undefined && edit.resource !== null && !editableResource(edit.resource)) ||
    (edit.building !== undefined && edit.building !== null && !editableBuilding(edit.building)))
    return "Alteração de mapa inválida."

  if (edit.building != null) {
    const spec = BUILDINGS[edit.building]
    const right = edit.x + spec.width
    const bottom = edit.y + spec.height
    if (right > village.width || bottom > village.height)
      return `Quadrado ${mapKey(edit)}: a estrutura passa do limite do mapa.`
    for (let y = edit.y; y < bottom; y++) for (let x = edit.x; x < right; x++) {
      const point = { x, y }
      const key = mapKey(point)
      const tile = mapTileAt(village, x, y)
      if (tile.surface === "water" || tile.elevation > 0)
        return `Quadrado ${key}: coloque a estrutura em terreno plano e firme.`
      if (village.buildings.some((building) => inside(point, building)))
        return `Quadrado ${key}: ocupado por uma estrutura.`
      if (village.nodes.some((node) => node.x === x && node.y === y))
        return `Quadrado ${key}: remova o recurso antes de colocar a estrutura.`
      if (village.saplings.some((sapling) => sapling.x === x && sapling.y === y))
        return `Quadrado ${key}: ocupado por uma muda.`
      if (village.units.some((unit) => Math.round(unit.x) === x && Math.round(unit.y) === y))
        return `Quadrado ${key}: ocupado por uma unidade.`
    }
  }

  const { surface, elevation } = editedTile(village, edit)
  const key = mapKey(edit)
  if (surface === "water" && elevation > 0)
    return `Quadrado ${key}: pinte terra firme antes de elevar.`

  const blocked = surface === "water" || elevation > 0
  const replacing = edit.resource != null && edit.resource !== currentNode?.kind
  if (blocked || replacing) {
    const occupant = protectedTile(village, edit)
    if (occupant) return `Quadrado ${key}: ocupado por ${occupant}.`
  }
  if (blocked && edit.resource != null) return surface === "water"
    ? `Quadrado ${key}: pinte terra firme antes de colocar o recurso.`
    : `Quadrado ${key}: pinte Grama para aplainar antes de colocar o recurso.`
  if (blocked && edit.resource === undefined && currentNode)
    return `Quadrado ${key}: use Recursos → Remover antes de elevar ou cobrir com água.`
  return null
}

function editedTile(village: VillageState, edit: VillageMapEdit): VillageMapTile {
  const previous = mapTileAt(village, edit.x, edit.y)
  return { surface: edit.surface ?? previous.surface, elevation: edit.elevation ?? previous.elevation }
}

// Stage the complete patch before publishing it. A failed stroke leaves the world intact.
export function prepareVillageMapEdits(village: VillageState, edits: VillageMapEdit[]) {
  if (!Array.isArray(edits) || edits.length > village.width * village.height)
    throw new Error("Quantidade de alterações do mapa inválida.")

  const mapTiles = { ...village.mapTiles }
  const nodes = new Map(village.nodes.map((node) => [mapKey(node), node]))
  const buildings = [...village.buildings]
  const seen = new Set<string>()
  for (const edit of edits) {
    if (!edit) throw new Error("Alteração de mapa inválida.")
    const key = mapKey(edit)
    if (seen.has(key)) throw new Error(`O quadrado ${key} aparece mais de uma vez.`)
    seen.add(key)
    const currentNode = nodes.get(key)
    const workingVillage = { ...village, mapTiles, nodes: [...nodes.values()], buildings }
    const issue = villageMapEditIssue(workingVillage, edit, currentNode)
    if (issue) throw new Error(issue)
    const tile = editedTile(village, edit)

    const baseline = defaultMapTile(village, edit.x, edit.y)
    if (tile.surface === baseline.surface && tile.elevation === baseline.elevation) delete mapTiles[key]
    else mapTiles[key] = tile

    if (edit.resource === null) nodes.delete(key)
    else if (editableResource(edit.resource) && edit.resource !== currentNode?.kind) {
      const variant = edit.resource === "rock" ? 0 : (edit.x + edit.y) % 4
      const node: ResourceNode = {
        id: `editor-${edit.resource}-${key}`, kind: edit.resource,
        x: edit.x, y: edit.y, amount: RESOURCE_NODE_AMOUNTS[edit.resource], variant,
      }
      nodes.set(key, node)
    }
    if (edit.building === null) {
      for (let index = buildings.length - 1; index >= 0; index--)
        if (inside(edit, buildings[index])) buildings.splice(index, 1)
    } else if (editableBuilding(edit.building)) {
      const spec = BUILDINGS[edit.building]
      const building: Building = {
        id: `editor-${edit.building}-${key}`, kind: edit.building,
        x: edit.x, y: edit.y, width: spec.width, height: spec.height, level: 1, growth: 0,
        ...(edit.building === "farm" ? { crop: "carrot" as const, farmCycle: { phase: "planting" as const, progress: 0, seedPaid: true } } : {}),
        ...(edit.building === "ranch" ? { ranch: { kind: null, animals: [] } } : {}),
      }
      buildings.push(building)
    }
  }
  return { mapTiles, nodes: [...nodes.values()], buildings }
}
