import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react"
import { Link } from "@tanstack/react-router"
import { useStore } from "zustand"
import {
  ArrowUp,
  BookOpen,
  Map as MapIcon,
  Check,
  Coins,
  Mountain,
  MousePointer2,
  Package,
  Pickaxe,
  Sprout,
  TreePine,
  Warehouse,
  Wheat,
  X,
  Users,
  Home,
  Droplets,
  Hammer,
  MoreHorizontal,
  Shield,
  PawPrint,
} from "lucide-react"
import { Grid } from "@/components/Grid/Grid"
import { Viewport } from "@/components/Viewport/Viewport"
import { WaterBackground } from "@/components/WaterBackground/WaterBackground"
import { CROPS_DATA } from "@/engine/data/cropsData"
import { getCropSpriteStyle } from "@/engine/rendering/cropRenderer"
import { useViewport } from "@/hooks/useViewport"
import { useWorld } from "@/hooks/useWorld"
import {
  connectionStore,
  sendCommand,
} from "@/services/gameClient"
import { villageStore } from "@/services/villageStore"
import {
  productionRate,
  BUILDINGS,
  CROPS,
  NODE_RESOURCE,
  RESOURCE_NAMES,
  storageCapacities,
  populationCapacity,
  WELL_RADIUS_TILES,
  UPGRADE_COSTS,
  VILLAGE_SIZE,
} from "../../../../shared/village/config"
import { unlockReason } from "../../../../shared/village/progression"
import { placementError, treePlacementError, walkable, wallLineCells } from "../../../../shared/village/simulation"
import { createVillageTerrain } from "../../../../shared/village/terrain"
import type {
  Building,
  BuildingKind,
  Crop,
  Resource,
  Resources,
  ResourceNode,
  Unit,
  WildCreature,
  VillageState,
} from "../../../../shared/village/types"
import { FarmManagement, BarnManagement, HouseManagement, WellManagement, TownCenterMenu } from "./EconomyPanels"
import { IndustryPanel } from "./IndustryPanel"
import { RanchPanel } from "./RanchPanel"
import { buildingVisualScale } from "./buildingVisualScale"
import { AtlasSprite } from "./sprites"
import { NodeArt } from "./NodeArt"
import "./village.css"

type Selection = { kind: "unit" | "building" | "node" | "creature"; id: string } | null
type BuildMode = BuildingKind | "tree" | null
const NEW_BUILDINGS = [
  { kind: "wall", hint: "Defesa · 1 × 1", Icon: Shield },
  { kind: "gate", hint: "Passagem · 2 × 1", Icon: Home },
  { kind: "tower", hint: "Defesa · 2 × 2", Icon: Warehouse },
  { kind: "blacksmith", hint: "Ferramentas e armas · 3 × 3", Icon: Hammer },
  { kind: "weaving", hint: "Panos e roupas · 3 × 3", Icon: Package },
  { kind: "barracks", hint: "Soldados · 3 × 3", Icon: Users },
  { kind: "ranch", hint: "Animais · 2 × 2", Icon: PawPrint },
] as const
const ICONS = {
  wood: TreePine,
  stone: Mountain,
  food: Wheat,
  iron: Pickaxe,
  gold: Coins,
}
const UNIT_STATUS = {
  idle: "Disponível",
  walking: "A caminho",
  working: "Trabalhando",
  delivering: "Levando ao celeiro",
  storageFull: "Celeiro cheio",
  blocked: "Sem caminho",
  planting: "Plantando",
  waiting: "Aguardando crescimento",
  harvesting: "Colhendo",
  building: "Construindo",
}
const NODE_NAMES = {
  tree: "Árvore",
  rock: "Pedra",
  branch: "Galhos",
  iron: "Depósito de ferro",
  gold: "Depósito de ouro",
  berryBush: "Arbusto de frutas",
}
const NODE_MAX_AMOUNT: Record<ResourceNode["kind"], number> = {
  tree: 240,
  rock: 300,
  branch: 8,
  iron: 80,
  gold: 240,
  berryBush: 20,
}
const pointStyle = (p: { x: number; y: number }): CSSProperties => ({
  left: p.x * 16,
  top: p.y * 16,
})
const centeredBuildingPoint = (kind: BuildingKind, point: { x: number; y: number }) => ({
  x: point.x - Math.floor(BUILDINGS[kind].width / 2),
  y: point.y - Math.floor(BUILDINGS[kind].height / 2),
})

function ResourceAmount({
  resource,
  amount,
  available,
}: {
  resource: Resource
  amount: number
  available?: number
}) {
  const Icon = ICONS[resource]
  return (
    <span className={`resource-cost resource-${resource}${available !== undefined && available < amount ? " is-missing" : ""}`}>
      <Icon size={13} />
      {amount}
    </span>
  )
}

function BuildCostSummary({ village, cost }: { village: VillageState; cost: Partial<Resources> }) {
  const carry = 8 + village.research.workers * 2 + (village.toolLevel ?? 0) * 2
  let trips = 0
  const missing = Object.entries(cost).flatMap(([key, total]) => {
    const resource = key as Resource
    const amount = Math.max(0, total - village.resources[resource])
    if (!amount) return []
    const perTrip = resource === "stone" || resource === "gold" ? Math.max(1, Math.floor(carry / 3)) : carry
    trips += Math.ceil(amount / perTrip)
    return [`${amount} ${RESOURCE_NAMES[resource].toLowerCase()}`]
  })
  if (!Object.keys(cost).length) return null
  return <small className="build-cost-summary">{missing.length ? `Faltam ${missing.join(", ")} · ~${trips} viagens` : "Materiais disponíveis"}</small>
}

export function wallUsesVerticalSprite(wall: Building, buildings: Building[]) {
  if (wall.kind !== "wall") return false
  const verticalNeighbor = buildings.some((candidate) =>
    candidate.kind === "wall" && candidate.x === wall.x && Math.abs(candidate.y - wall.y) === 1)
  const horizontalNeighbor = buildings.some((candidate) =>
    candidate.kind === "wall" && candidate.y === wall.y && Math.abs(candidate.x - wall.x) === 1)
  return verticalNeighbor && !horizontalNeighbor
}

export function BuildingArt({ building, verticalWall = false }: { building: Building; verticalWall?: boolean }) {
  if (building.kind === "ranch")
    return <span className={`building-art ranch-art ranch-level-${Math.min(5, building.level)}`}>
      {building.ranch?.kind && building.ranch.animals.length > 0 &&
        <AtlasSprite sprite={building.ranch.kind} scale={0.3} className="ranch-art-animal" />}
    </span>
  if (building.kind === "farm") {
    const crop = CROPS[building.crop!]
    const stages = CROPS_DATA.crops.find(
      (c) => c.id === crop.cropId,
    )!.growthStages
    const stage = Math.max(
      1,
      Math.min(stages - 1, Math.floor(building.growth * (stages - 1)) + 1),
    )
    return (
      <>
        <div className="farm-furrows" />
        {Array.from(
          {
            length:
              building.farmCycle?.phase === "planting"
                ? 0
                : building.width * building.height,
          },
          (_, i) => i,
        ).map((i) => (
          <span
            key={i}
            className="farm-crop"
            style={{
              ...getCropSpriteStyle(
                crop.cropId,
                building.growth < 0.15 ? "planted" : "stage",
                stage,
                true,
              ),
              left: (i % building.width) * 16,
              bottom: Math.floor(i / building.width) * 16,
            }}
          />
        ))}
        <span className="world-growth">
          <i style={{ width: `${building.growth * 100}%` }} />
        </span>
      </>
    )
  }
  if (building.kind === "blacksmith" || building.kind === "weaving" || building.kind === "barracks")
    return <img className={`building-art workshop ${building.kind}`} src={`/spritesheets/village/${building.kind}.png`} alt="" draggable={false} />
  if (["wall", "gate", "tower"].includes(building.kind))
    return <span className={`building-art structure-sprite structure-${building.kind} structure-level-${Math.min(3, building.level)} ${verticalWall ? "wall-vertical" : ""}`} />
  return (
    <>
      {building.kind === "house" ? (
        <span className={`building-art house-sprite house-level-${Math.min(3, building.level)}`} />
      ) : (
        <AtlasSprite
          sprite={building.kind === "townCenter"
            ? `town${Math.min(3, building.level)}` as "town1" | "town2" | "town3"
            : building.kind === "barn"
              ? `barn${Math.min(3, building.level)}` as "barn1" | "barn2" | "barn3"
              : "well"}
          scale={building.kind === "townCenter" ? 0.2 : building.kind === "barn" ? 0.17 : 0.19}
          className={`building-art ${building.kind}`}
        />
      )}
    </>
  )
}

function BuildingProgressStatus({ village, building }: { village: VillageState; building: Building }) {
  const improvement = village.improvements?.find(
    (item) => item.kind === "building" && item.buildingId === building.id,
  )
  const construction = building.construction
  const timer = construction ? {
    duration: construction.duration,
    elapsed: construction.progress,
    title: "Construção em andamento",
  } : improvement?.kind === "building" ? {
    duration: improvement.finishAt - improvement.startedAt,
    elapsed: village.economy.elapsed - improvement.startedAt,
    title: `Melhorando para o nível ${improvement.targetLevel}`,
  } : null
  if (!timer) return null

  const progress = Math.min(100, Math.max(0, timer.elapsed / timer.duration * 100))
  const remaining = Math.max(0, Math.ceil(timer.duration - timer.elapsed))
  const time = `${Math.floor(remaining / 60)}m ${String(remaining % 60).padStart(2, "0")}s`
  return (
    <span className="building-upgrade-status" role="status" title={timer.title}>
      <strong>{BUILDINGS[building.kind].name} · {time}</strong>
      <span><i style={{ width: `${progress}%` }} /></span>
    </span>
  )
}

function UnitArt({
  unit,
  village,
  selected = false,
}: {
  unit: Unit
  village: VillageState
  selected?: boolean
}) {
  const moving = unit.status === "walking" || unit.status === "delivering"
  if (unit.kind === "soldier" || unit.kind === "archer") {
    const direction = moving
      ? unit.facing === "up" ? "back" : unit.facing === "down" ? "front" : unit.facing
      : "front"
    return (
      <>
        <span className={`unit-shadow ${selected ? "selected" : ""}`} />
        <span className={`unit-art military-sprite ${moving ? "walking" : ""}`}
          style={{ backgroundImage: `url(/spritesheets/village/${unit.kind}/walk-${direction}.png)` }} />
        {selected && <span className="unit-marker">▾</span>}
      </>
    )
  }
  if (unit.kind === "villager") {
    let activity: "walk" | "mine" | "hoe" | "hammer" | "axe" = "walk"
    if (unit.status === "building") activity = "hammer"
    else if (unit.job.kind === "farm" && ["planting", "waiting", "harvesting", "working"].includes(unit.status)) activity = "hoe"
    else if (unit.job.kind === "gather" && unit.status === "working") {
      const targetId = unit.job.targetId
      const node = village.nodes.find((candidate) => candidate.id === targetId)
      if (node?.kind === "berryBush") activity = "hoe"
      else if (node && ["rock", "iron", "gold"].includes(node.kind)) activity = "mine"
      else if (node?.kind === "tree") activity = "axe"
    }
    const animated = moving || activity !== "walk"
    return <>
      <span className={`unit-shadow ${selected ? "selected" : ""}`} />
      <span className={`unit-art farmer-sprite ${animated ? "is-animated" : ""}`}
        style={{ backgroundImage: `url(/spritesheets/village/farmer/${activity}-${unit.facing}.png)` }} />
      {unit.carrying && <span className="unit-bundle" title={`${unit.carrying.amount} ${RESOURCE_NAMES[unit.carrying.resource]}`}>▣</span>}
      {selected && <span className="unit-marker">▾</span>}
      {(unit.status === "storageFull" || unit.status === "blocked") && <span className="unit-warning">!</span>}
    </>
  }
  const sprite = moving
    ? unit.facing === "left" ? "explorerLeft" : unit.facing === "right" ? "explorerRight" : "explorer"
    : "explorer"
  return (
    <>
      <span className={`unit-shadow ${selected ? "selected" : ""}`} />
      <AtlasSprite
        className={`unit-art ${unit.status === "walking" || unit.status === "delivering" ? "walking" : ""}`}
        sprite={sprite}
        scale={0.17}
      />
      {unit.carrying && (
        <span
          className="unit-bundle"
          title={`${unit.carrying.amount} ${RESOURCE_NAMES[unit.carrying.resource]}`}
        >
          ▣
        </span>
      )}
      {selected && <span className="unit-marker">▾</span>}
      {(unit.status === "storageFull" || unit.status === "blocked") && (
        <span className="unit-warning">!</span>
      )}
    </>
  )
}

export function VillageView() {
  const village = useStore(villageStore, (s) => s.state)
  if (!village)
    return (
      <div className="village-loading">
        <Sprout />
        <h1>Preparando sua vila</h1>
        <p>Conectando ao mundo…</p>
      </div>
    )
  return <VillageScene village={village} />
}

function VillageScene({ village }: { village: VillageState }) {
  const connected = useStore(connectionStore, (s) => s.connected)
  const viewport = useViewport(VILLAGE_SIZE, VILLAGE_SIZE)
  const terrainSignature = JSON.stringify(village.mapTiles ?? {})
  const groundTiles = useMemo(() => createVillageTerrain({
    width: village.width, height: village.height, mapTiles: JSON.parse(terrainSignature),
  }), [village.width, village.height, terrainSignature])
  const [selection, setSelection] = useState<Selection>(null)
  const [selectedMilitaryIds, setSelectedMilitaryIds] = useState<string[]>([])
  useEffect(() => {
    if (selection?.kind !== "unit") setSelectedMilitaryIds([])
  }, [selection])
  const [build, setBuild] = useState<BuildMode>(null)
  const [crop, setCrop] = useState<Crop>("carrot")
  const [mouseTile, setMouseTile] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null)
  const wallStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressWallClick = useRef(false)
  const touchPointer = useRef(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [grid, setGrid] = useState(false)
  const [townMenu, setTownMenu] = useState(false)
  const [notice, setNotice] = useState("")
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return
      if (e.key === "Escape") {
        setBuild(null)
        setWallStart(null)
        wallStartRef.current = null
        setSelection(null)
        setSelectedMilitaryIds([])
        setTownMenu(false)
        setCatalogOpen(false)
        setTasksOpen(false)
        setMoreOpen(false)
      }
      if (e.key.toLowerCase() === "g") setGrid((g) => !g)
    }
    window.addEventListener("keydown", keyboard)
    return () => window.removeEventListener("keydown", keyboard)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(""), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const capacity = storageCapacities(village)
  const readyBarn = village.buildings.find((building) => building.kind === "barn" && !building.construction)
  const visibleResources = (Object.keys(RESOURCE_NAMES) as Resource[]).filter((resource) =>
    village.resources[resource] > 0 || !unlockReason(village, { kind: "resource", value: resource }),
  )
  const trackedResources = visibleResources.filter((resource) => capacity[resource] > 0)
  const fullResources = trackedResources.filter(
    (r) => village.resources[r] >= capacity[r],
  )
  const full = fullResources.length > 0
  const selectedUnit =
    selection?.kind === "unit"
      ? village.units.find((u) => u.id === selection.id)
      : undefined
  const selectedMilitary = selectedUnit && (selectedUnit.kind === "soldier" || selectedUnit.kind === "archer")
    ? village.units.filter((unit) => selectedMilitaryIds.includes(unit.id) && unit.kind === selectedUnit.kind && unit.job.kind !== "garrison")
    : []
  const selectedBuilding =
    selection?.kind === "building"
      ? village.buildings.find((b) => b.id === selection.id)
      : undefined
  const selectedCreature = selection?.kind === "creature"
    ? village.creatures?.find((creature) => creature.id === selection.id)
    : undefined
  const selectedWorkshop = selectedBuilding?.kind === "blacksmith" || selectedBuilding?.kind === "weaving"
  const SelectedBuildingIcon = NEW_BUILDINGS.find(({ kind }) => kind === selectedBuilding?.kind)?.Icon
  const assignedBuilders = selectedBuilding
    ? village.units.filter(
        (u) => u.job.kind === "build" && u.job.targetId === selectedBuilding.id,
      ).length
    : 0
  const selectedNode =
    selection?.kind === "node"
      ? village.nodes.find((n) => n.id === selection.id)
      : undefined
  const footprint = build
    ? build === "tree"
      ? { width: 1, height: 1 }
      : BUILDINGS[build]
    : null
  const placementTile = build && build !== "tree" && build !== "wall" && mouseTile
    ? centeredBuildingPoint(build, mouseTile)
    : mouseTile
  const ignoredCenterId = build === "townCenter"
    ? village.buildings.find((building) => building.kind === "townCenter")?.id
    : undefined
  const footprintCells = placementTile && footprint && build !== "wall"
    ? Array.from({ length: footprint.width * footprint.height }, (_, index) => ({
        x: placementTile.x + index % footprint.width,
        y: placementTile.y + Math.floor(index / footprint.width),
      }))
    : []
  const footprintCellError = (point: { x: number; y: number }) =>
    build === "tree"
      ? treePlacementError(village, point.x, point.y)
      : placementError(village, "wall", point.x, point.y, ignoredCenterId)
  const wallCells = build === "wall" && mouseTile
    ? wallLineCells(wallStart?.x ?? mouseTile.x, wallStart?.y ?? mouseTile.y, mouseTile.x, mouseTile.y)
    : []
  const wallError = build === "wall" && wallCells.length
    ? wallCells.map((point) => placementError(village, "wall", point.x, point.y)).find(Boolean) ||
      (!Object.entries(BUILDINGS.wall.cost).every(([resource, amount]) => village.resources[resource as Resource] >= amount * wallCells.length)
        ? "Recursos insuficientes para a linha de muro." : null)
    : null
  const error =
    build === "wall" ? wallError : build === "tree" && placementTile
      ? treePlacementError(village, placementTile.x, placementTile.y)
      : build && build !== "tree" && placementTile
      ? placementError(
          village,
          build,
          placementTile.x,
          placementTile.y,
          ignoredCenterId,
        )
      : null
  const canAfford = (cost: Partial<Record<Resource, number>>) =>
    Object.entries(cost).every(
      ([r, n]) => village.resources[r as Resource] >= n,
    )

  function moveMouse(e: MouseEvent) {
    viewport.handleMouseMove(e)
    setMouseTile(viewport.getTileFromMouseEvent(e))
  }
  function startWall(e: MouseEvent) {
    if (touchPointer.current) return
    if (build === "wall" && e.button === 0) {
      const point = viewport.getTileFromMouseEvent(e)
      if (point) {
        wallStartRef.current = point
        setWallStart(point)
        setMouseTile(point)
      }
      return
    }
    viewport.handleMouseDown(e)
  }
  async function finishWall(e: MouseEvent) {
    if (touchPointer.current) return
    if (build === "wall" && e.button === 0 && wallStartRef.current) {
      const start = wallStartRef.current
      wallStartRef.current = null
      setWallStart(null)
      suppressWallClick.current = true
      window.setTimeout(() => { suppressWallClick.current = false }, 0)
      const end = viewport.getTileFromMouseEvent(e)
      if (end) await placeWall(start, end)
      return
    }
    viewport.handleMouseUp(e)
  }
  async function placeWall(start: { x: number; y: number }, end: { x: number; y: number }) {
    if (selectedUnit?.kind !== "villager") {
      setNotice("Selecione um aldeão para construir o muro.")
      return
    }
    if (await sendCommand({ type: "buildWallLine", unitId: selectedUnit.id,
      x1: start.x, y1: start.y, x2: end.x, y2: end.y })) {
      setBuild(null)
      setCatalogOpen(false)
      deselectUnit(selectedUnit.id)
      setNotice("O aldeão vai construir os trechos de muro em sequência.")
    }
  }
  function deselectUnit(unitId: string) {
    setSelectedMilitaryIds([])
    setSelection((current) =>
      current?.kind === "unit" && current.id === unitId ? null : current,
    )
  }
  async function groundClick(e: MouseEvent) {
    if (suppressWallClick.current) { suppressWallClick.current = false; return }
    if (viewport.consumeDragClick() || e.button !== 0 || viewport.isDragging) return
    const p = viewport.getTileFromMouseEvent(e)
    if (!p) return
    if (build === "wall") {
      if (!touchPointer.current) return
      setMouseTile(p)
      if (!wallStart) setWallStart(p)
      else {
        setWallStart(null)
        await placeWall(wallStart, p)
      }
      return
    }
    if (build) {
      if (build === "tree") {
        if (selectedUnit?.kind !== "villager") {
          setNotice("Selecione um aldeão para plantar a semente.")
          return
        }
        const ok = await sendCommand({ type: "plantTree", unitId: selectedUnit.id, ...p })
        if (ok) {
          setBuild(null)
          setCatalogOpen(false)
          deselectUnit(selectedUnit.id)
          setNotice("O aldeão vai plantar a semente em 30 segundos; a árvore crescerá em 10 minutos.")
        }
        return
      }
      if (build !== "townCenter" && selectedUnit?.kind !== "villager") {
        setNotice("Selecione um aldeão para iniciar a construção.")
        return
      }
      const site = centeredBuildingPoint(build, p)
      const ok =
        build === "townCenter"
          ? await sendCommand({ type: "relocateTownCenter", ...site })
          : await sendCommand({
              type: "build",
              kind: build,
              unitId: selectedUnit?.id,
              ...site,
              ...(build === "farm" ? { crop: availableCrops.includes(crop) ? crop : availableCrops[0] } : {}),
            })
      if (ok) {
        setCatalogOpen(false)
        setBuild((current) => (current === build ? null : current))
        if (selectedUnit) deselectUnit(selectedUnit.id)
        if (build === "townCenter") {
          setNotice("Centro urbano realocado. Pesquisas e aldeões preservados.")
        } else
          setNotice(
            `Construção iniciada: ${BUILDINGS[build].name}.`,
          )
      }
    } else if (catalogOpen) {
      resetPanels()
    } else if (selectedMilitary.length > 1) {
      const destinations: { x: number; y: number }[] = []
      const reserved = new Set<string>()
      for (let radius = 0; radius < Math.max(village.width, village.height) && destinations.length < selectedMilitary.length; radius++)
        for (let dy = -radius; dy <= radius && destinations.length < selectedMilitary.length; dy++)
          for (let dx = -radius; dx <= radius && destinations.length < selectedMilitary.length; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== radius) continue
            const point = { x: p.x + dx, y: p.y + dy }
            const key = `${point.x}-${point.y}`
            if (!reserved.has(key) && walkable(village, point)) {
              reserved.add(key)
              destinations.push(point)
            }
          }
      let moved = 0
      for (const [index, unit] of selectedMilitary.entries()) {
        const destination = destinations[index]
        if (destination && await sendCommand({ type: "moveUnit", unitId: unit.id, ...destination })) moved++
      }
      if (moved) {
        setNotice(`${moved} ${selectedUnit?.kind === "archer" ? "arqueiros" : "soldados"} a caminho.`)
        setSelectedMilitaryIds([])
        setSelection(null)
      } else setNotice("Não há espaço livre para mover o grupo até esse local.")
    } else if (selectedUnit) {
      if (
        await sendCommand({ type: "moveUnit", unitId: selectedUnit.id, ...p })
      )
        deselectUnit(selectedUnit.id)
    } else setSelection(null)
  }
  async function buildingClick(e: MouseEvent, b: Building) {
    if (suppressWallClick.current) { suppressWallClick.current = false; e.stopPropagation(); return }
    if (viewport.consumeDragClick()) {
      e.stopPropagation()
      return
    }
    if (build) {
      setBuild(null)
      setSelection({ kind: "building", id: b.id })
      if (b.kind === "townCenter") setTownMenu(true)
      return
    }
    e.stopPropagation()
    if (b.kind === "tower" && selectedUnit?.kind === "archer") {
      if (await sendCommand({ type: "garrisonArcher", unitId: selectedUnit.id, towerId: b.id })) {
        deselectUnit(selectedUnit.id)
        setSelection({ kind: "building", id: b.id })
        setNotice("Arqueiro guarnecido. A capacidade da torre também aumenta o dano.")
      }
      return
    }
    if (b.construction && selectedUnit?.kind === "villager") {
      if (await sendCommand({ type: "assignUnit", unitId: selectedUnit.id, targetId: b.id })) {
        deselectUnit(selectedUnit.id)
        setNotice(`${selectedUnit.name} vai ajudar na construção.`)
      }
      return
    }
    if ((b.kind === "farm" && selectedUnit?.kind !== "soldier" && selectedUnit?.kind !== "archer" || b.kind === "ranch" && selectedUnit?.kind === "villager") && !b.construction && selectedUnit) {
      if (
        await sendCommand({
          type: "assignUnit",
          unitId: selectedUnit.id,
          targetId: b.id,
        })
      ) {
        deselectUnit(selectedUnit.id)
        setNotice(
          b.kind === "ranch" ? `${selectedUnit.name} vai cuidar dos animais.` : `${selectedUnit.name} vai cultivar e levar a comida ao celeiro.`,
        )
      }
    } else {
      setSelection({ kind: "building", id: b.id })
      if (b.kind === "townCenter") setTownMenu(true)
    }
  }
  async function nodeClick(e: MouseEvent, n: ResourceNode) {
    if (suppressWallClick.current) { suppressWallClick.current = false; e.stopPropagation(); return }
    if (viewport.consumeDragClick()) {
      e.stopPropagation()
      return
    }
    if (build) return
    e.stopPropagation()
    const locked = unlockReason(village, { kind: "resource", value: NODE_RESOURCE[n.kind] })
    if (locked) {
      setNotice(locked)
      return
    }
    if (n.kind === "branch") {
      if (await sendCommand({ type: "collectBranch", nodeId: n.id })) {
        if (selectedUnit) deselectUnit(selectedUnit.id)
        setNotice(
          `+${Math.min(n.amount, capacity.wood - village.resources.wood)} madeira · Galhos recolhidos`,
        )
      }
    } else if (selectedUnit?.kind !== "soldier" && selectedUnit?.kind !== "archer" && selectedUnit) {
      if (
        await sendCommand({
          type: "assignUnit",
          unitId: selectedUnit.id,
          targetId: n.id,
        })
      ) {
        deselectUnit(selectedUnit.id)
        setSelection({ kind: "node", id: n.id })
        setNotice(
          `${selectedUnit.name} vai coletar ${RESOURCE_NAMES[NODE_RESOURCE[n.kind]].toLowerCase()}.`,
        )
      }
    } else setSelection({ kind: "node", id: n.id })
  }
  const relocateCenter = () => {
    setBuild("townCenter")
    setTownMenu(false)
    setSelection(null)
  }
  const availableCrops = (Object.keys(CROPS) as Crop[]).filter((value) =>
    !unlockReason(village, { kind: "crop", value }) && village.seeds[value] > 0,
  )
  const wellLocked = unlockReason(village, { kind: "building", value: "well" })
  function resetPanels() {
    setBuild(null)
    setWallStart(null)
    wallStartRef.current = null
    setCatalogOpen(false)
    setTasksOpen(false)
    setMoreOpen(false)
    setTownMenu(false)
    setSelection(null)
    setSelectedMilitaryIds([])
  }

  return (
    <main className={`village-shell ${build ? "is-building" : ""}`}>
      <Viewport
        viewport={viewport}
        farmHeight={VILLAGE_SIZE}
        farmWidth={VILLAGE_SIZE}
        cursor={viewport.isDragging ? "grabbing" : build || selectedUnit?.kind === "soldier" || selectedUnit?.kind === "archer" ? "crosshair" : "grab"}
        onClick={groundClick}
        onMouseMove={moveMouse}
        onMouseLeave={() => {
          if (touchPointer.current) return
          viewport.handleMouseLeave()
          wallStartRef.current = null
          setWallStart(null)
          setMouseTile(null)
        }}
        onMouseDown={startWall}
        onMouseUp={finishWall}
        onWheel={viewport.handleWheel}
        touchNavigation
        onMapPointerDown={(event) => { touchPointer.current = event.pointerType === "touch" }}
      >
        <WaterBackground width={VILLAGE_SIZE} height={VILLAGE_SIZE} />
        <Grid
          width={VILLAGE_SIZE}
          height={VILLAGE_SIZE}
          groundTiles={groundTiles}
          mode="idle"
          mouseTile={null}
          showGrid={grid || Boolean(build)}
          brushSize={1}
          selectedGroundTile={0}
          raisedRelief
        />
        {((selectedBuilding?.kind === "well" && !build) || (build === "well" && placementTile)) && (
          <div
            className="well-range"
            style={{
              left: ((build === "well" ? placementTile!.x : selectedBuilding!.x) - WELL_RADIUS_TILES) * 16,
              top: ((build === "well" ? placementTile!.y : selectedBuilding!.y) - WELL_RADIUS_TILES) * 16,
              width: (BUILDINGS.well.width + WELL_RADIUS_TILES * 2) * 16,
              height: (BUILDINGS.well.height + WELL_RADIUS_TILES * 2) * 16,
            }}
          />
        )}
        {village.buildings.map((b) => (
          <button
            type="button"
            key={b.id}
            aria-label={`${b.kind === "farm" ? CROPS[b.crop!].name : BUILDINGS[b.kind].name} nível ${b.level}`}
            title={
              b.kind === "farm"
                ? `${CROPS[b.crop!].name} · ${{ planting: "Plantio", growing: "Crescimento", harvesting: "Colheita" }[b.farmCycle?.phase ?? "planting"]}`
                : BUILDINGS[b.kind].name
            }
            className={`world-object building-object ${b.kind} ${selection?.id === b.id ? "is-selected" : ""} ${b.growth >= 1 && b.kind === "farm" ? "is-ripe" : ""} ${b.construction ? "under-construction" : ""}`}
            style={{
              ...pointStyle(b),
              width: b.width * 16,
              height: b.height * 16,
              zIndex: b.kind === "farm" ? 5 : (b.y + b.height) * 16,
            }}
            onClick={(e) => buildingClick(e, b)}
          >
            <div className="building-visual" style={{ transform: `scale(${buildingVisualScale(b.kind, b.width, b.height)})` }}>
              <BuildingArt building={b} verticalWall={wallUsesVerticalSprite(b, village.buildings)} />
            </div>
            {selectedBuilding?.id === b.id && <BuildingProgressStatus village={village} building={b} />}
            {b.kind === "ranch" && !!b.ranch?.animals.some((animal) => animal.growth >= 1) && <span className="ranch-ready" title="Animais adultos prontos para coleta"><PawPrint size={12} />{b.ranch.animals.filter((animal) => animal.growth >= 1).length}</span>}
            <span className="object-label">
              {b.kind === "farm" ? CROPS[b.crop!].name : BUILDINGS[b.kind].name}
            </span>
          </button>
        ))}
        {village.nodes.map((n) => {
          const regenerating = n.regeneratesAt !== undefined
          const remaining = Math.max(0, Math.ceil((n.regeneratesAt ?? 0) - village.economy.elapsed))
          const label = regenerating ? `Regenera em ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : null
          return (
          <button
            type="button"
            key={n.id}
            aria-label={`${NODE_NAMES[n.kind]} · ${label ?? `${n.amount} de ${Math.max(n.amount, NODE_MAX_AMOUNT[n.kind])}`}`}
            title={`${NODE_NAMES[n.kind]} · ${label ?? `${n.amount} ${RESOURCE_NAMES[NODE_RESOURCE[n.kind]].toLowerCase()}`}${n.kind === "branch" ? " · Clique para recolher" : ""}`}
            className={`world-object node-object ${n.kind} ${selection?.id === n.id ? "is-selected" : ""} ${regenerating ? "is-regenerating" : ""}`}
            style={{ ...pointStyle(n), zIndex: selectedNode?.id === n.id ? 3000 : (n.y + 1) * 16 }}
            onClick={(e) => nodeClick(e, n)}
          >
            <NodeArt node={n} />
            {selectedNode?.id === n.id && (
              <span className="node-resource-bar">
                <strong>{label ?? `${n.amount}/${Math.max(n.amount, NODE_MAX_AMOUNT[n.kind])}`}</strong>
                {!regenerating && <span className="node-resource-track">
                  <i style={{ width: `${Math.max(0, Math.min(100, (n.amount / Math.max(n.amount, NODE_MAX_AMOUNT[n.kind])) * 100))}%` }} />
                </span>}
              </span>
            )}
          </button>
          )
        })}
        {village.saplings.map((sapling) => (
          <span
            key={sapling.id}
            className="sapling-marker"
            style={{ ...pointStyle(sapling), zIndex: (sapling.y + 1) * 16 }}
            title={`Árvore crescendo · pronta em ${Math.ceil((sapling.finishAt - village.economy.elapsed) / 60)} min`}
          >
            <Sprout size={13} />
          </span>
        ))}
        {(village.creatures ?? []).map((creature) => (
          <button type="button" key={creature.id}
            aria-label={`${creature.kind === "wolf" ? "Lobo" : "Urso"} selvagem · vida ${creature.health}/${creature.maxHealth}`}
            title={`${creature.kind === "wolf" ? "Lobo" : "Urso"} selvagem · ${creature.health}/${creature.maxHealth} vida · só ataca se for atacado`}
            className={`world-object creature-object ${creature.kind} ${selection?.id === creature.id ? "is-selected" : ""} ${selectedUnit ? "is-targetable" : ""}`}
            style={{ ...pointStyle(creature), zIndex: Math.floor((creature.y + 1) * 16) + 2 }}
            onClick={async (e) => {
              e.stopPropagation()
              if (selectedUnit) {
                const attackers = selectedMilitary.length > 1 ? selectedMilitary : [selectedUnit]
                let ordered = 0
                for (const unit of attackers)
                  if (await sendCommand({ type: "attackCreature", unitId: unit.id, creatureId: creature.id })) ordered++
                if (ordered) {
                  setSelection({ kind: "unit", id: selectedUnit.id })
                  setNotice(`${ordered > 1 ? `${ordered} unidades estão` : `${selectedUnit.name} está`} atacando o ${creature.kind === "wolf" ? "lobo" : "urso"}.`)
                }
              } else {
                setSelection({ kind: "creature", id: creature.id })
              }
            }}>
            <span className={`creature-sprite ${creature.kind} ${creature.hostileTo ? "is-animated" : ""}`}
              style={{ backgroundImage: `url(/spritesheets/village/${creature.kind}-walk.png)` }} />
            {(creature.hostileTo || village.units.some((unit) => unit.job.kind === "attackCreature" && unit.job.targetId === creature.id) || creature.health < creature.maxHealth) && <span className={`health-bar ${(creature.health / creature.maxHealth) < 0.3 ? "is-low" : ""}`}><i style={{ width: `${Math.max(0, creature.health / creature.maxHealth * 100)}%` }} /></span>}
          </button>
        ))}
        {village.units.filter((unit) => unit.job.kind !== "garrison").map((u) => (
          <button
            type="button"
            key={u.id}
            aria-label={`Selecionar ${u.name.toLowerCase()} no mapa`}
            title={`${u.name} · ${UNIT_STATUS[u.status]}`}
            className={`world-object unit-object ${u.kind} ${selectedMilitaryIds.includes(u.id) ? "is-selected" : ""}`}
            style={{ ...pointStyle(u), zIndex: Math.floor((u.y + 1) * 16) }}
            onClick={(e) => {
              if (suppressWallClick.current) { suppressWallClick.current = false; e.stopPropagation(); return }
              if (viewport.consumeDragClick()) {
                e.stopPropagation()
                return
              }
              if (build) setBuild(null)
              e.stopPropagation()
              setSelectedMilitaryIds([])
              setSelection({ kind: "unit", id: u.id })
            }}
            onDoubleClick={(e) => {
              if (u.kind !== "soldier" && u.kind !== "archer") return
              e.stopPropagation()
              const group = village.units.filter((unit) => unit.kind === u.kind && unit.job.kind !== "garrison")
              setSelection({ kind: "unit", id: u.id })
              setSelectedMilitaryIds(group.map((unit) => unit.id))
              setNotice(`${group.length} ${u.kind === "archer" ? "arqueiros" : "soldados"} selecionados. Clique no terreno para mover o grupo.`)
            }}
          >
            <UnitArt unit={u} village={village} selected={selectedMilitaryIds.includes(u.id) || selectedUnit?.id === u.id} />
            {u.health !== undefined && u.maxHealth !== undefined && (u.job.kind === "attackCreature" || village.creatures?.some((creature) => creature.hostileTo === u.id) || u.health < u.maxHealth) && <span className={`health-bar ${(u.health / u.maxHealth) < 0.3 ? "is-low" : ""}`}><i style={{ width: `${Math.max(0, u.health / u.maxHealth * 100)}%` }} /></span>}
          </button>
        ))}
        {build === "wall" && wallCells.map((point) => (
          <div key={`wall-preview-${point.x}-${point.y}`}
            className={`build-preview ${error ? "invalid" : "valid"}`}
            style={{ ...pointStyle(point), width: 16, height: 16 }}>
            <span className={`build-preview-cell ${footprintCellError(point) ? "blocked" : "free"}`} />
            <div className="building-visual" style={{ transform: `scale(${buildingVisualScale("wall", 1, 1)})` }}>
              <BuildingArt building={{ id: "preview", kind: "wall", ...point, width: 1, height: 1, level: 1, growth: 0 }} verticalWall={wallCells.length > 1 && wallCells[0].x === wallCells[1].x} />
            </div>
          </div>
        ))}
        {build && build !== "wall" && placementTile && footprint && (
          <div
            className={`build-preview ${error ? "invalid" : "valid"}`}
            style={{
              ...pointStyle(placementTile),
              width: footprint.width * 16,
              height: footprint.height * 16,
            }}
          >
            <div className="build-preview-grid" style={{ gridTemplateColumns: `repeat(${footprint.width}, 16px)` }}>
              {footprintCells.map((point) => <span key={`${point.x}-${point.y}`}
                className={`build-preview-cell ${footprintCellError(point) ? "blocked" : "free"}`} />)}
            </div>
            {build === "tree" ? (
              <Sprout className="sapling-preview" size={16} />
            ) : (
              <div className="building-visual" style={{ transform: `scale(${buildingVisualScale(build, footprint.width, footprint.height)})` }}>
                <BuildingArt
                  building={{
                    id: "preview",
                    kind: build,
                    ...placementTile,
                    width: footprint.width,
                    height: footprint.height,
                    level: 1,
                    growth: 0,
                    crop,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Viewport>

      <header className="village-header">
        <Link to="/" className="village-brand" title="Voltar ao menu">
          <span className="brand-mark">
            <TreePine size={23} />
          </span>
          <span>
            <strong>ROOKLAND</strong>
            <small>O começo de uma vila</small>
          </span>
        </Link>
        <div className="resource-bar" aria-label="Recursos da vila">
          {visibleResources.map((r) => {
            const Icon = ICONS[r]
            return (
              <button
                type="button"
                key={r}
                className={`resource-item resource-${r} ${capacity[r] > 0 && village.resources[r] >= capacity[r] ? "is-full" : ""}`}
                title={capacity[r] > 0 ? `${RESOURCE_NAMES[r]}: ${village.resources[r]} de ${capacity[r]}` : `${RESOURCE_NAMES[r]} · construa um celeiro para receber entregas`}
                aria-label={`${RESOURCE_NAMES[r]}: ${village.resources[r]} de ${capacity[r]}. Abrir estoque`}
                onClick={() => {
                  resetPanels()
                  if (readyBarn) setSelection({ kind: "building", id: readyBarn.id })
                  else setNotice("Construa um celeiro para receber comida e ampliar o estoque.")
                }}
              >
                <span className="resource-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <small>{RESOURCE_NAMES[r]}</small>
                  <strong data-testid={`resource-${r}`}>
                    {village.resources[r]}
                    {capacity[r] > 0 && <small className="resource-limit"> / {capacity[r]}</small>}
                  </strong>
                  {r === "food" && (
                    <em
                      className="food-rate"
                      title="Entregas de comida por segundo nos últimos 30 s de jogo"
                    >
                      +
                      {productionRate(
                        village,
                        village.economy.foodIncome,
                      ).toFixed(2)}{" "}
                      /s
                    </em>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <button
          className={`storage-summary ${full ? "full" : ""}`}
          onClick={() => {
            if (readyBarn) setSelection({ kind: "building", id: readyBarn.id })
            else setNotice("Construa um celeiro para receber comida e ampliar o estoque.")
          }}
          title={readyBarn ? "Clique para ver o estoque da vila." : "Construa um celeiro para ampliar o estoque."}
        >
          <Warehouse size={21} />
          <span>
            <span className="storage-line">
              <strong>
                {readyBarn ? "Armazém" : "Sem celeiro"}
              </strong>
              <b data-testid="storage-total">
                {fullResources.length}
                <em> / {trackedResources.length} cheios</em>
              </b>
            </span>
            <span className="storage-track">
              <i
                style={{
                  width: `${fullResources.length / Math.max(1, trackedResources.length) * 100}%`,
                }}
              />
            </span>
          </span>
        </button>
      </header>

      <nav className="village-quick-actions" aria-label="Ações da vila">
        <button className={catalogOpen || build ? "active" : ""} aria-label="Abrir construções" aria-pressed={catalogOpen || !!build} onClick={() => {
          const builder = selectedUnit?.kind === "villager" ? selectedUnit :
            village.units.find((unit) => unit.kind === "villager" && unit.job.kind === "idle")
          resetPanels()
          if (builder) {
            setSelection({ kind: "unit", id: builder.id })
            setCatalogOpen(true)
          } else {
            setTasksOpen(true)
            setNotice("Escolha um aldeão para construir.")
          }
        }}><Hammer size={21} /><span>Construir</span></button>
        <button className={tasksOpen ? "active" : ""} aria-label="Abrir tarefas" aria-pressed={tasksOpen} onClick={() => { const open = !tasksOpen; resetPanels(); setTasksOpen(open) }}><Users size={21} /><span>Tarefas</span></button>
        <button className={selectedBuilding?.kind === "barn" ? "active" : ""} aria-label="Abrir estoque" onClick={() => {
          resetPanels()
          if (readyBarn) setSelection({ kind: "building", id: readyBarn.id })
          else setNotice("Construa um celeiro para receber comida e ampliar o estoque.")
        }}><Warehouse size={21} /><span>Estoque</span></button>
        <button className={townMenu ? "active" : ""} aria-label="Abrir centro da vila" aria-pressed={townMenu} onClick={() => { const open = !townMenu; resetPanels(); setTownMenu(open) }}><Home size={21} /><span>Cidade</span></button>
        <button className={moreOpen ? "active" : ""} aria-label="Mais opções" aria-expanded={moreOpen} aria-controls="village-more-menu" onClick={() => { const open = !moreOpen; resetPanels(); setMoreOpen(open) }}><MoreHorizontal size={21} /><span>Mais</span></button>
      </nav>
      {moreOpen && <div id="village-more-menu" className="village-more-menu" aria-label="Mais opções">
        <Link to="/" onClick={() => setMoreOpen(false)}><TreePine size={20} /><span>Início</span></Link>
        <Link to="/map_editor/vila" onClick={() => setMoreOpen(false)}><MapIcon size={20} /><span>Editar mapa</span></Link>
        <a href="/guia.html" onClick={() => setMoreOpen(false)}><BookOpen size={20} /><span>Guia</span></a>
      </div>}
      {tasksOpen && <section className="selection-panel village-tasks" aria-label="Tarefas dos aldeões">
        <header><strong>Tarefas</strong><button onClick={() => setTasksOpen(false)} aria-label="Fechar tarefas"><X size={18} /></button></header>
        {village.units.filter((unit) => unit.kind !== "soldier" && unit.kind !== "archer").map((unit) => (
          <button key={unit.id} onClick={() => {
            setTasksOpen(false)
            setSelection({ kind: "unit", id: unit.id })
          }}><strong>{unit.name}</strong><span>{UNIT_STATUS[unit.status]}</span></button>
        ))}
      </section>}

      <div className={`population-chip ${village.units.length > populationCapacity(village) ? "over-capacity" : ""}`} title="População atual e capacidade das casas">
        <Users size={16} />
        <strong>{village.units.length} / {populationCapacity(village)}</strong>
        <span>População</span>
      </div>

      {(selectedUnit?.kind !== "soldier" && selectedUnit?.kind !== "archer" && (selectedUnit || build || catalogOpen)) && (
        <section className={`build-dock ${catalogOpen || build ? "catalog-visible" : ""}`} aria-label="Construções">
          <div className="dock-heading">
            <span className="hud-eyebrow">CONSTRUIR</span>
            {catalogOpen && <button onClick={resetPanels} aria-label="Fechar construções"><X size={16} /></button>}
            <button
              className={grid ? "active" : ""}
              onClick={() => setGrid(!grid)}
              title="Mostrar grade (G)"
            >
              Grade <span>G</span>
            </button>
          </div>
          <div className="build-options">
            <button
              className={`build-card ${build === "farm" ? "active" : ""}`}
              disabled={!connected || selectedUnit?.kind !== "villager" || !canAfford(BUILDINGS.farm.cost) || !availableCrops.length}
              onClick={() => {
                setBuild(build === "farm" ? null : "farm")
              }}
            >
              <span className="build-icon farm">
                <Sprout size={28} />
              </span>
              <span>
                <strong>
                  Fazenda <small>4 × 4</small>
                </strong>
                <span className="cost-line">
                  <ResourceAmount resource="wood" amount={15} available={village.resources.wood} />
                  <em>Produz comida</em>
                </span>
                <BuildCostSummary village={village} cost={BUILDINGS.farm.cost} />
              </span>
            </button>
            <button
              className={`build-card ${build === "barn" ? "active" : ""}`}
              disabled={!connected || selectedUnit?.kind !== "villager" || !canAfford(BUILDINGS.barn.cost)}
              onClick={() => {
                setBuild(build === "barn" ? null : "barn")
              }}
            >
              <span className="build-icon">
                <AtlasSprite sprite="barn1" scale={0.1} style={{ position: "absolute", left: 2, bottom: 2 }} />
              </span>
              <span>
                <strong>
                  Celeiro <small>3 × 3</small>
                </strong>
                <span className="cost-line">
                  <ResourceAmount resource="wood" amount={60} available={village.resources.wood} />
                  <ResourceAmount resource="stone" amount={25} available={village.resources.stone} />
                </span>
                <BuildCostSummary village={village} cost={BUILDINGS.barn.cost} />
              </span>
            </button>
            <button
              className={`build-card ${build === "house" ? "active" : ""}`}
              disabled={!connected || selectedUnit?.kind !== "villager" || !canAfford(BUILDINGS.house.cost)}
              onClick={() => setBuild(build === "house" ? null : "house")}
            >
              <span className="build-icon"><Home size={28} /></span>
              <span><strong>Casa <small>2 × 2</small></strong><span className="cost-line">
                <ResourceAmount resource="wood" amount={35} available={village.resources.wood} />
                <ResourceAmount resource="stone" amount={10} available={village.resources.stone} />
                <ResourceAmount resource="food" amount={BUILDINGS.house.cost.food} available={village.resources.food} />
                <em>+2 vagas</em>
              </span><BuildCostSummary village={village} cost={BUILDINGS.house.cost} /></span>
            </button>
            <button
              className={`build-card ${build === "well" ? "active" : ""}`}
              disabled={!connected || selectedUnit?.kind !== "villager" || !!wellLocked || !canAfford(BUILDINGS.well.cost)}
              onClick={() => setBuild(build === "well" ? null : "well")}
            >
              <span className="build-icon"><Droplets size={28} /></span>
              <span><strong>Poço <small>2 × 2</small></strong><span className="cost-line">
                <ResourceAmount resource="wood" amount={40} available={village.resources.wood} />
                <ResourceAmount resource="stone" amount={30} available={village.resources.stone} />
                <em>{wellLocked ?? "Crescimento ×2"}</em>
              </span><BuildCostSummary village={village} cost={BUILDINGS.well.cost} /></span>
            </button>
            {NEW_BUILDINGS.map(({ kind, hint, Icon }) => {
              const spec = BUILDINGS[kind]
              if (unlockReason(village, { kind: "building", value: kind })) return null
              return <button key={kind} className={`build-card ${build === kind ? "active" : ""}`}
                disabled={!connected || selectedUnit?.kind !== "villager" || !canAfford(spec.cost)}
                onClick={() => setBuild(build === kind ? null : kind)}>
                <span className={`build-icon ${kind}`}><Icon size={25} /></span>
                <span><strong>{spec.name} <small>{spec.width} × {spec.height}</small></strong>
                  <span className="cost-line">{Object.entries(spec.cost).map(([resource, amount]) => <ResourceAmount key={resource} resource={resource as Resource} amount={amount} available={village.resources[resource as Resource]} />)}</span>
                  <BuildCostSummary village={village} cost={spec.cost} />
                  <em>{hint}</em>
                </span>
              </button>
            })}
          </div>
          <button
            className={`tree-plant-card ${build === "tree" ? "active" : ""}`}
            disabled={!connected || selectedUnit?.kind !== "villager" || village.seeds.tree < 1}
            onClick={() => setBuild(build === "tree" ? null : "tree")}
          >
            <Sprout size={17} /> Plantar árvores · {village.seeds.tree} sementes
          </button>
          {build === "farm" && (
            <div className="crop-picker">
              <span>Cultivo</span>
              {availableCrops.map((c) => (
                <button
                  key={c}
                  className={(availableCrops.includes(crop) ? crop : availableCrops[0]) === c ? "active" : ""}
                  onClick={() => setCrop(c)}
                >
                  {CROPS[c].name} · {village.seeds[c]}
                </button>
              ))}
            </div>
          )}
          <div className={`dock-hint ${error && build ? "invalid" : ""}`}>
            <MousePointer2 size={12} />
            {build
              ? error ||
                (build === "townCenter"
                  ? "Clique no chão para realocar o centro urbano. Esc cancela."
                  : build === "tree"
                    ? "Clique em terra livre: o aldeão caminha até lá, planta por 30 segundos e a muda cresce em 10 minutos."
                    : build === "wall"
                      ? "Muro: arraste com o mouse ou toque no início e no fim."
                      : `Clique no chão para construir ${BUILDINGS[build].name.toLowerCase()}.`)
              : selectedUnit?.kind === "hero"
                ? "Selecione um aldeão para construir. O explorador pode explorar e coletar."
                : "Selecione uma unidade e clique para dar uma tarefa."}
            {build && (
              <button onClick={() => { setBuild(null); setWallStart(null); wallStartRef.current = null }}>
                Cancelar <kbd>Esc</kbd>
              </button>
            )}
          </div>
        </section>
      )}

      {!catalogOpen && !build && !townMenu && (selectedUnit || selectedBuilding || selectedCreature) && (
        <section className={`selection-panel ${selectedUnit ? "unit-panel" : ""} ${selectedWorkshop ? "workshop-window" : ""} ${selectedBuilding?.kind === "barn" ? "barn-window" : ""} ${selectedBuilding?.kind === "ranch" ? "ranch-window" : ""}`} aria-label="Seleção atual">
          {selectedUnit ? (
            <>
              <div className="selection-heading">
                <span className={`portrait large ${selectedUnit.kind}`}>
                  {selectedUnit.kind === "villager" ? <span className="farmer-portrait" /> :
                    selectedUnit.kind === "soldier" || selectedUnit.kind === "archer" ? <span className="soldier-portrait" /> :
                      <AtlasSprite sprite="explorer" scale={0.27} style={{ position: "absolute", left: 12, bottom: 1 }} />}
                </span>
                <div>
                  <span className="hud-eyebrow">
                    {selectedUnit.kind === "hero"
                      ? "PERSONAGEM"
                      : selectedUnit.kind === "soldier" || selectedUnit.kind === "archer" ? "UNIDADE MILITAR" : "TRABALHADOR"}
                  </span>
                  <h2>{selectedMilitary.length > 1 ? `${selectedMilitary.length} ${selectedUnit.kind === "archer" ? "arqueiros" : "soldados"}` : selectedUnit.name}</h2>
                  <p>
                    <span className="status-dot" />
                    {UNIT_STATUS[selectedUnit.status]}
                  </p>
                </div>
                <button
                  className="close-panel"
                  onClick={() => setSelection(null)}
                  aria-label="Desmarcar unidade"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="selection-description">
                {selectedMilitary.length > 1
                  ? "Grupo selecionado. Clique no terreno para mover em formação ou numa criatura para atacar com todos."
                  : selectedUnit.kind === "soldier" || selectedUnit.kind === "archer"
                  ? `${selectedUnit.kind === "archer" ? "Arqueiro" : "Soldado"} da vila. ${selectedUnit.armored ? "Armadura equipada." : "Pode receber uma armadura da ferraria."} Clique no terreno para mover ou numa criatura para atacar.`
                  : selectedUnit.job.kind === "build"
                  ? "Construindo no local."
                  : selectedUnit.job.kind === "farm"
                  ? "Cultiva e entrega comida automaticamente."
                  : selectedUnit.job.kind === "gather"
                    ? "Coleta e entrega recursos automaticamente."
                    : selectedUnit.job.kind === "move"
                      ? "Indo ao ponto marcado."
                      : "Clique numa fazenda, recurso ou criatura para dar uma tarefa."}
              </p>
              {selectedUnit.health !== undefined && selectedUnit.maxHealth !== undefined && <p className="selection-description">Vida {Math.ceil(selectedUnit.health)}/{selectedUnit.maxHealth}</p>}
              {(selectedUnit.kind === "soldier" || selectedUnit.kind === "archer") && <p className="selection-description">
                {selectedUnit.kind === "archer" ? "Ataque à distância · " : ""}Ataque {5 + (village.weaponLevel ?? 0) * 2} · Defesa {2 + (village.armorLevel ?? 0) * 2 + (selectedUnit.armored ? 4 : 0)} · armas nível {village.weaponLevel ?? 0}/4 · armaduras nível {village.armorLevel ?? 0}/4
              </p>}
              {selectedUnit.carrying && (
                <div className="carrying-line">
                  <Package size={14} />
                  Carregando{" "}
                  <ResourceAmount
                    resource={selectedUnit.carrying.resource}
                    amount={selectedUnit.carrying.amount}
                  />
                </div>
              )}
              {(selectedUnit.status === "storageFull" ||
                selectedUnit.status === "blocked") && (
                <p className="selection-warning">
                  {selectedUnit.status === "storageFull"
                    ? selectedUnit.carrying && capacity[selectedUnit.carrying.resource] === 0
                      ? `Construa um celeiro para receber ${RESOURCE_NAMES[selectedUnit.carrying.resource].toLowerCase()}.`
                      : `O estoque de ${selectedUnit.carrying ? RESOURCE_NAMES[selectedUnit.carrying.resource].toLowerCase() : "seu recurso"} está cheio.`
                    : "Abra um caminho até a tarefa ou o local de entrega."}
                </p>
              )}
              <div className="selection-footer">
                <span className="selection-buttons">
                  {selectedUnit.job.kind === "farm" && (
                    <button
                      onClick={() => {
                        if (selectedUnit.job.kind === "farm")
                          setSelection({
                            kind: "building",
                            id: selectedUnit.job.targetId,
                          })
                      }}
                    >
                      Ver plantação
                    </button>
                  )}
                  <button
                    disabled={
                      selectedUnit.job.kind === "idle" && !selectedUnit.carrying
                    }
                    onClick={async () => {
                      if (
                        await sendCommand({
                          type: "stopUnit",
                          unitId: selectedUnit.id,
                        })
                      )
                        deselectUnit(selectedUnit.id)
                    }}
                  >
                    Parar tarefa
                  </button>
                  {selectedUnit.kind === "villager" && (
                    <button
                      className="remove-unit-action"
                      onClick={async () => {
                        if (await sendCommand({ type: "killVillager", unitId: selectedUnit.id })) {
                          setSelection(null)
                          setNotice("Aldeão removido da vila.")
                        }
                      }}
                    >
                      Matar aldeão
                    </button>
                  )}
                  {(selectedUnit.kind === "soldier" || selectedUnit.kind === "archer") && !selectedUnit.armored && (
                    <button disabled={(village.crafts?.armor ?? 0) < 1} onClick={() => void sendCommand({ type: "equipSoldier", unitId: selectedUnit.id })}>
                      Equipar armadura · {village.crafts?.armor ?? 0} disponíveis
                    </button>
                  )}
                  {(selectedUnit.kind === "soldier" || selectedUnit.kind === "archer") && (
                    <button onClick={async () => {
                      if (await sendCommand({ type: "demobilizeUnit", unitId: selectedUnit.id })) {
                        setSelection(null)
                        setSelectedMilitaryIds([])
                        setNotice("Aldeão voltou ao trabalho; o kit foi guardado no estoque.")
                      }
                    }}>Voltar à vida civil</button>
                  )}
                </span>
              </div>
            </>
          ) : selectedCreature ? (
            <>
              <div className="selection-heading">
                <span className="selection-building-icon"><PawPrint size={28} /></span>
                <div><span className="hud-eyebrow">CRIATURA SELVAGEM</span><h2>{selectedCreature.kind === "wolf" ? "Lobo" : "Urso"}</h2><p>{selectedCreature.hostileTo ? "Revidando ao ataque" : "Passivo · não ataca sem ser provocado"}</p></div>
                <button className="close-panel" onClick={() => setSelection(null)} aria-label="Fechar seleção"><X size={15} /></button>
              </div>
              <div className="health-bar creature-panel-health"><i style={{ width: `${Math.max(0, selectedCreature.health / selectedCreature.maxHealth * 100)}%` }} /></div>
              <p className="selection-description">Vida {selectedCreature.health}/{selectedCreature.maxHealth}. Selecione qualquer aldeão ou unidade militar e depois clique nesta criatura para atacar.</p>
            </>
          ) : selectedBuilding ? (
            <>
              <div className="selection-heading">
                <span className="selection-building-icon">
                  {selectedWorkshop ? (
                    <img src={`/spritesheets/village/${selectedBuilding.kind}.png`} alt="" draggable={false} />
                  ) : selectedBuilding.kind === "farm" ? (
                    <Sprout size={30} />
                  ) : (
                    selectedBuilding.kind === "house" ? <Home size={28} /> :
                    SelectedBuildingIcon ? <SelectedBuildingIcon size={28} /> :
                    <AtlasSprite
                      sprite={selectedBuilding.kind === "barn"
                        ? `barn${Math.min(3, selectedBuilding.level)}` as "barn1" | "barn2" | "barn3"
                        : selectedBuilding.kind === "well" ? "well"
                          : `town${Math.min(3, selectedBuilding.level)}` as "town1" | "town2" | "town3"}
                      scale={selectedBuilding.kind === "well" ? 0.26 : 0.12}
                      style={{ position: "absolute", bottom: 0, left: 1 }}
                    />
                  )}
                </span>
                <div>
                  <h2 title={`${selectedBuilding.width} × ${selectedBuilding.height} quadrados`}>
                    {selectedBuilding.kind === "farm"
                      ? CROPS[selectedBuilding.crop!].name
                      : BUILDINGS[selectedBuilding.kind].name}
                  </h2>
                  {selectedBuilding.kind !== "farm" && (
                    <p>
                      {selectedBuilding.kind === "well" ? "Crescimento ×2" : `Nível ${selectedBuilding.level}`}
                    </p>
                  )}
                </div>
                <button
                  className="close-panel"
                  onClick={() => setSelection(null)}
                  aria-label="Fechar seleção"
                >
                  <X size={15} />
                </button>
              </div>
              {selectedBuilding.construction && (
                <div className="construction-details">
                  <small>{assignedBuilders} {assignedBuilders === 1 ? "aldeão designado" : "aldeões designados"} · selecione outro aldeão e clique nesta construção para acelerar a obra.</small>
                </div>
              )}
              {selectedBuilding.kind === "farm" ? (
                <FarmManagement
                  key={selectedBuilding.id}
                  village={village}
                  farm={selectedBuilding}
                  onDestroyed={() => {
                    setSelection(null)
                    setNotice(
                      "Fazenda destruída. O espaço está livre e os trabalhadores foram liberados.",
                    )
                  }}
                />
              ) : selectedBuilding.kind === "barn" ? (
                <BarnManagement
                  village={village}
                  barn={selectedBuilding}
                  onDestroyed={() => {
                    setSelection(null)
                    setNotice(
                      "Celeiro destruído. Os recursos guardados foram preservados.",
                    )
                  }}
                />
              ) : selectedBuilding.kind === "house" ? (
                <HouseManagement village={village} house={selectedBuilding} onDestroyed={() => setSelection(null)} />
              ) : selectedBuilding.kind === "well" ? (
                <WellManagement village={village} well={selectedBuilding} onDestroyed={() => setSelection(null)} />
              ) : selectedBuilding.kind === "ranch" ? (
                <RanchPanel key={selectedBuilding.id} village={village} building={selectedBuilding} onDestroyed={() => setSelection(null)} />
              ) : selectedBuilding.kind !== "townCenter" ? (
                <IndustryPanel key={selectedBuilding.id} village={village} building={selectedBuilding} onDestroyed={() => setSelection(null)} />
              ) : (
                <>
                  <p className="selection-description">
                    Recrute aldeões e pesquise melhorias de trabalho, cultivo,
                    adubação e irrigação.
                  </p>
                  <button
                    className="primary-action"
                    onClick={() => setTownMenu(true)}
                  >
                    Abrir centro da vila
                  </button>
                  <button
                    className="relocate-action town-relocate"
                    onClick={relocateCenter}
                  >
                    Realocar centro urbano
                  </button>
                </>
              )}
            </>
          ) : null}
        </section>
      )}

      {notice && (
        <div className="village-notice" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {full && (
        <div className="storage-alert" role="status" aria-label={`Estoque cheio: ${fullResources.map((r) => RESOURCE_NAMES[r]).join(", ")}`}>
          <Warehouse size={15} />
          <span className="storage-alert-short">Estoque cheio</span>
          <span className="storage-alert-detail">{readyBarn
            ? `Limite atingido: ${fullResources.map((r) => RESOURCE_NAMES[r]).join(", ")}. Evolua ou construa mais celeiros.`
            : `Limite atingido: ${fullResources.map((r) => RESOURCE_NAMES[r]).join(", ")}. Construa um celeiro para ampliar o estoque.`}</span>
        </div>
      )}
      {townMenu && (
        <TownCenterMenu
          village={village}
          onClose={() => setTownMenu(false)}
          onRelocate={relocateCenter}
        />
      )}
    </main>
  )
}
