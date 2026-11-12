import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeft, DoorOpen, Droplets, Eraser, FilePlus2, Flag, FolderOpen, Hand, Home, Image, Layers, Maximize,
  Mountain, PawPrint, Pickaxe, Save, Sprout, Swords, TreePine, TriangleAlert, Undo2, Warehouse,
  ZoomIn, ZoomOut,
} from "lucide-react"
import { Grid } from "@/components/Grid/Grid"
import { PAINT_BRUSHES_DATA } from "@/engine/data/sprites/paintBrushes"
import { api } from "@/services/gameClient"
import { BUILDINGS } from "../../../../shared/village/config"
import { mapKey, mapTileAt, prepareVillageMapEdits, villageMapEditIssue } from "../../../../shared/village/map"
import { MAP_SURFACES, type MapSurface } from "../../../../shared/village/mapSurfaces"
import { createVillage } from "../../../../shared/village/simulation"
import { createVillageTerrain } from "../../../../shared/village/terrain"
import type { WorldSnapshot } from "../../../../shared/protocol"
import type { BuildingKind, MapResourceKind, Point, VillageMapEdit, VillageState } from "../../../../shared/village/types"
import { BuildingArt, wallUsesVerticalSprite } from "../village/VillageView"
import { buildingVisualScale } from "../village/buildingVisualScale"
import { NodeArt } from "../village/NodeArt"
import { useMapEditorCamera } from "./useMapEditorCamera"
import { AssetManager } from "./AssetManager"
import "./mapEditor.css"

const TILE = 16
type Tool = {
  id: string
  label: string
  Icon: typeof Flag
  edit: Omit<VillageMapEdit, "x" | "y">
  preview?: string
}
const BUILDING_TOOLS: Tool[] = (Object.keys(BUILDINGS) as BuildingKind[]).map((kind) => ({
  id: `building-${kind}`,
  label: BUILDINGS[kind].name,
  Icon: ({ townCenter: Flag, barn: Warehouse, farm: Sprout, house: Home, well: Droplets, wall: Layers,
    gate: DoorOpen, tower: Mountain, blacksmith: Pickaxe, weaving: Layers, sawmill: TreePine, barracks: Swords, ranch: PawPrint })[kind],
  edit: { building: kind },
}))
const TOOLS = {
  surface: (Object.keys(MAP_SURFACES) as MapSurface[]).filter((surface) => surface !== "grass1").map((surface): Tool => ({
    id: surface,
    label: MAP_SURFACES[surface].label,
    Icon: surface === "water" ? Droplets : Layers,
    edit: surface === "grass" || surface === "water" ? { surface, elevation: 0 } : { surface },
    preview: MAP_SURFACES[surface].preview,
  })),
  height: [
    { id: "hill", label: "1 · Colina", Icon: Mountain, edit: { elevation: 1 }, preview: "grass_hills" },
    { id: "mountain", label: "2 · Montanha", Icon: Mountain, edit: { elevation: 2 }, preview: "stone_hills" },
  ],
  resources: [
    { id: "tree", label: "Árvore", Icon: TreePine, edit: { resource: "tree" } },
    { id: "rock", label: "Pedra", Icon: Mountain, edit: { resource: "rock" } },
    { id: "iron", label: "Ferro", Icon: Pickaxe, edit: { resource: "iron" } },
    { id: "gold", label: "Ouro", Icon: Pickaxe, edit: { resource: "gold" } },
    { id: "berries", label: "Arbusto", Icon: Sprout, edit: { resource: "berryBush" } },
    ...BUILDING_TOOLS,
    { id: "erase", label: "Remover", Icon: Eraser, edit: { resource: null, building: null } },
  ],
} as const satisfies Record<string, readonly Tool[]>

type Group = keyof typeof TOOLS
const GROUPS = [
  { id: "surface", label: "Piso", Icon: Layers, hint: "Use Grama para aplainar. Use Água para abrir rios e lagos." },
  { id: "height", label: "Altura", Icon: Mountain, hint: "Pinte sobre terra firme. Para aplainar, use Piso → Grama." },
  { id: "resources", label: "Recursos", Icon: Pickaxe, hint: "Nas estruturas, clique no quadrado central; a área ocupada será distribuída ao redor dele." },
] as const
type Draft = { edits: Record<string, VillageMapEdit>; preview: ReturnType<typeof prepareVillageMapEdits> }
type BlockedCell = Point & { reason: string }
type Stroke = { id: number; last: string; origin: Point; scroll: Point; pan: boolean; moved: boolean }
const draftFor = (village: VillageState): Draft => ({ edits: {}, preview: { mapTiles: village.mapTiles ?? {}, nodes: village.nodes, buildings: village.buildings } })
const blankVillage = (): VillageState => ({ ...createVillage(), nodes: [], buildings: [], saplings: [], units: [] })

function ToolPreview({ tool }: { tool: Tool }) {
  const { Icon } = tool
  const sprite = PAINT_BRUSHES_DATA.sprites.find((item) => item.id === tool.preview)
  if (sprite) {
    const scale = 32 / (sprite.region.width * TILE)
    return <span className="map-editor-preview" aria-hidden="true" style={{
      backgroundImage: `url("/spritesheets/${PAINT_BRUSHES_DATA.meta.src}")`,
      backgroundPosition: `${-sprite.region.x * TILE * scale}px ${-sprite.region.y * TILE * scale}px`,
      backgroundSize: `${PAINT_BRUSHES_DATA.meta.width * scale}px ${PAINT_BRUSHES_DATA.meta.height * scale}px`,
    }} />
  }
  const kind: MapResourceKind | null | undefined = tool.edit.resource
  return <span className={`map-editor-preview ${kind ? "resource-preview" : ""}`} aria-hidden="true">
    {kind ? <NodeArt node={{ id: "", kind, x: 0, y: 0, variant: 0, amount: 0 }} /> : <Icon size={20} />}
  </span>
}

function planBrush(base: VillageState, draft: Draft, tool: Tool, brush: number, point: Point) {
  let edits = draft.edits
  const blocked: BlockedCell[] = []
  let changed = false
  const structure = tool.edit.building != null ? BUILDINGS[tool.edit.building] : null
  const origin = structure
    ? { x: point.x - Math.floor(structure.width / 2), y: point.y - Math.floor(structure.height / 2) }
    : point
  if (structure && (origin.x < 0 || origin.y < 0))
    return { edits, blocked: [{ ...point, reason: "Escolha um quadrado mais afastado da borda para centralizar a estrutura." }], changed }
  const radius = structure ? 0 : Math.floor(brush / 2)
  for (let y = origin.y - radius; y <= origin.y + radius; y++)
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      if (x < 0 || y < 0 || x >= base.width || y >= base.height) continue
      const key = mapKey({ x, y })
      const previous = edits[key]
      const edit: VillageMapEdit = { ...previous, ...tool.edit, x, y }
      const initial = mapTileAt(base, x, y)
      const planningVillage = { ...base, mapTiles: draft.preview.mapTiles, nodes: draft.preview.nodes, buildings: draft.preview.buildings }
      const node = planningVillage.nodes.find((candidate) => candidate.x === x && candidate.y === y)
      const building = planningVillage.buildings.find((candidate) => x >= candidate.x && y >= candidate.y && x < candidate.x + candidate.width && y < candidate.y + candidate.height)
      if (edit.surface === initial.surface) delete edit.surface
      if (edit.elevation === initial.elevation) delete edit.elevation
      if (edit.resource === (node?.kind ?? null)) delete edit.resource
      if (edit.building === building?.kind && building?.x === x && building?.y === y) delete edit.building
      if (edit.building === null && !building) delete edit.building
      if (edit.surface === previous?.surface && edit.elevation === previous?.elevation &&
        edit.resource === previous?.resource && edit.building === previous?.building) continue
      const hasEdit = edit.surface !== undefined || edit.elevation !== undefined || edit.resource !== undefined || edit.building !== undefined
      const reason = hasEdit ? villageMapEditIssue(planningVillage, edit, node) : null
      if (reason) {
        blocked.push({ x, y, reason })
        continue
      }
      if (edits === draft.edits) edits = { ...draft.edits }
      if (hasEdit) edits[key] = edit
      else delete edits[key]
      changed = true
    }
  return { edits, blocked, changed }
}

async function readVillage() {
  const { village } = await api<WorldSnapshot>("/world")
  if (!village) throw new Error("Vila indisponível.")
  return village
}

export function MapEditor({ openVillage = false }: { openVillage?: boolean }) {
  const [base, setBase] = useState(blankVillage)
  const [editingLive, setEditingLive] = useState(false)
  const [history, setHistory] = useState<Draft[]>(() => [draftFor(base)])
  const current = useRef(history[0])
  const draft = history[history.length - 1]
  const [group, setGroup] = useState<Group>("surface")
  const [resourceTab, setResourceTab] = useState<"resources" | "buildings">("resources")
  const [toolId, setToolId] = useState<string>("grass")
  const [brush, setBrush] = useState(1)
  const [hover, setHover] = useState<Point | null>(null)
  const [panning, setPanning] = useState(false)
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null)
  const [rejected, setRejected] = useState<BlockedCell[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingMap, setLoadingMap] = useState(openVillage)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const busy = saving || loadingMap
  const { scroller, board, scale, zoomBy, fitMap } = useMapEditorCamera(base.width * TILE, base.height * TILE)
  const stroke = useRef<Stroke | null>(null)
  const touches = useRef(new Map<number, Point>())
  const pinch = useRef<{ center: Point; distance: number } | null>(null)
  const resourceTools: readonly Tool[] = TOOLS.resources
  const options: readonly Tool[] = group === "resources"
    ? resourceTools.filter((option) => resourceTab === "buildings"
      ? option.edit.building !== undefined || option.id === "erase"
      : option.edit.building === undefined)
    : TOOLS[group]
  const tool: Tool = options.find((option) => option.id === toolId) ?? options[0]
  const changes = Object.keys(draft.edits).length
  const view = useMemo(() => ({ width: base.width, height: base.height, mapTiles: draft.preview.mapTiles }), [base.width, base.height, draft.preview.mapTiles])
  const terrain = useMemo(() => createVillageTerrain(view, editingLive), [view, editingLive])
  const sample = hover ? mapTileAt(view, hover.x, hover.y) : null
  const hoveredNode = hover ? draft.preview.nodes.find((node) => node.x === hover.x && node.y === hover.y) : undefined
  const hoveredResource = TOOLS.resources.find((option) => option.edit.resource === hoveredNode?.kind)?.label
  const previewBlocks = useMemo(() => hover && !panning ? planBrush(base, draft, tool, brush, hover).blocked : [],
    [base, draft, tool, brush, hover, panning])
  const highlighted = hover ? previewBlocks : rejected
  const feedback = notice ?? (previewBlocks.length ? { error: true, message: previewBlocks[0].reason } : null)

  useEffect(() => {
    if (!openVillage) return
    let active = true
    readVillage().then((village) => {
      if (active) startDraft(village, true)
    }).catch((failure: unknown) => {
      if (active) setNotice({ error: true, message: failure instanceof Error ? failure.message : "Não foi possível carregar a vila." })
    }).finally(() => {
      if (active) setLoadingMap(false)
    })
    return () => { active = false }
  }, [openVillage])

  function cellAt(event: PointerEvent<HTMLDivElement>) {
    const bounds = board.current?.getBoundingClientRect()
    if (!bounds || event.clientX < bounds.left || event.clientY < bounds.top || event.clientX >= bounds.right || event.clientY >= bounds.bottom) return null
    return {
      x: Math.floor((event.clientX - bounds.left) / bounds.width * base.width),
      y: Math.floor((event.clientY - bounds.top) / bounds.height * base.height),
    }
  }

  function paint(point: Point) {
    if (busy) return
    const { edits, blocked, changed } = planBrush(base, current.current, tool, brush, point)
    if (blocked.length) {
      setRejected(blocked)
      setNotice({ error: true, message: blocked.length === 1 ? blocked[0].reason : `${blocked.length} quadrados ignorados. ${blocked[0].reason}` })
    }
    if (!changed) return
    try {
      const next = { edits, preview: prepareVillageMapEdits(base, Object.values(edits)) }
      current.current = next
      setHistory((previous) => [...previous.slice(-39), next])
      if (!blocked.length && (tool.edit.resource !== undefined || tool.edit.building !== undefined))
        setNotice({ message: tool.edit.building != null
          ? "Estrutura colocada no rascunho. Clique em Aplicar à vila para salvar."
          : tool.edit.resource === null || tool.edit.building === null
            ? "Remoção no rascunho. Clique em Aplicar à vila para salvar."
            : "Recurso colocado no rascunho. Clique em Aplicar à vila para salvar." })
    } catch (failure) {
      setNotice({ error: true, message: failure instanceof Error ? failure.message : "Não foi possível pintar." })
    }
  }

  function clearFeedback() {
    setNotice(null)
    setRejected([])
  }

  function pinchFrame() {
    const [a, b] = touches.current.values()
    return a && b ? { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) } : null
  }

  function startPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return
    if (event.pointerType === "mouse" && event.target === event.currentTarget && !panning && event.button !== 1) return
    const screen = { x: event.clientX, y: event.clientY }
    if (event.pointerType === "touch") {
      touches.current.set(event.pointerId, screen)
      pinch.current = pinchFrame()
      if (pinch.current) {
        stroke.current = null
        setHover(null)
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }
    if (event.pointerType === "mouse") event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const position = cellAt(event)
    stroke.current = {
      id: event.pointerId, last: position ? mapKey(position) : "", origin: screen,
      scroll: { x: event.currentTarget.scrollLeft, y: event.currentTarget.scrollTop },
      pan: panning || event.button === 1, moved: false,
    }
    if (stroke.current.pan) setHover(null)
    else {
      clearFeedback()
      if (position && event.pointerType === "mouse") paint(position)
    }
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const screen = { x: event.clientX, y: event.clientY }
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, screen)
      const next = pinchFrame()
      if (next) {
        const previous = pinch.current
        if (previous && previous.distance > 0) zoomBy(next.distance / previous.distance, previous.center, next.center)
        pinch.current = next
        return
      }
    }
    const active = stroke.current?.id === event.pointerId ? stroke.current : null
    if (active && (active.pan || event.pointerType === "touch")) {
      const dx = active.origin.x - screen.x
      const dy = active.origin.y - screen.y
      if (active.pan || active.moved || Math.hypot(dx, dy) >= 8) {
        active.moved = true
        event.currentTarget.scrollLeft = active.scroll.x + dx
        event.currentTarget.scrollTop = active.scroll.y + dy
      }
      return
    }
    if (panning || event.pointerType === "touch") return
    const position = cellAt(event)
    const key = position ? mapKey(position) : ""
    setHover((previous) => (previous ? mapKey(previous) : "") === key ? previous : position)
    if (active && position && event.buttons === 1 && active.last !== key) {
      active.last = key
      paint(position)
    }
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    touches.current.delete(event.pointerId)
    pinch.current = pinchFrame()
    if (stroke.current?.id !== event.pointerId) return
    const active = stroke.current
    stroke.current = null
    if (!cancelled && !active.pan && !active.moved && event.pointerType !== "mouse") {
      const position = cellAt(event)
      setHover(null)
      if (position) paint(position)
    }
  }

  function undo() {
    const next = history.slice(0, -1)
    if (!next.length) return
    current.current = next[next.length - 1]
    setHistory(next)
    clearFeedback()
  }

  function startDraft(nextBase: VillageState, live: boolean) {
    const next = draftFor(nextBase)
    current.current = next
    setBase(nextBase)
    setEditingLive(live)
    setHistory([next])
    setHover(null)
    clearFeedback()
  }

  async function switchMap(live: boolean) {
    if (busy || (changes && !window.confirm("Descartar as alterações do rascunho?"))) return
    if (!live) {
      startDraft(blankVillage(), false)
      return
    }
    setLoadingMap(true)
    try {
      startDraft(await readVillage(), true)
    } catch (failure) {
      setNotice({ error: true, message: failure instanceof Error ? failure.message : "Não foi possível carregar a vila." })
    } finally {
      setLoadingMap(false)
    }
  }

  async function save() {
    if (!changes || busy) return
    setSaving(true)
    try {
      await api("/commands", { method: "POST", body: JSON.stringify({ type: "editVillageMap", edits: Object.values(draft.edits) }) })
      const updated = await readVillage().catch(() => null)
      startDraft(updated ?? { ...base, ...draft.preview }, !!updated || editingLive)
      setNotice({ message: "Mapa aplicado à vila." })
    } catch (failure) {
      setNotice({ error: true, message: failure instanceof Error ? failure.message : "Não foi possível aplicar o mapa." })
    } finally {
      setSaving(false)
    }
  }

  return <main className="map-editor">
    <header className="map-editor-header">
      <Link to="/" aria-label="Voltar ao menu" title="Voltar ao menu"><ArrowLeft size={20} /></Link>
      <div><h1>Criador de mapa</h1><small>{editingLive ? "Vila atual" : "Ilha vazia"} · {base.width} × {base.height}</small></div>
      <button type="button" aria-label="Desfazer última pincelada" title="Desfazer" disabled={history.length <= 1 || busy} onClick={undo}><Undo2 size={18} /></button>
      <button type="button" className="map-editor-save" disabled={!changes || busy} title="Aplicar à vila somente os quadrados modificados" onClick={() => void save()}>
        <Save size={17} /> {saving ? "Aplicando…" : changes ? `Aplicar à vila (${changes})` : "Aplicar à vila"}
      </button>
      <button type="button" onClick={() => setAssetsOpen(true)} title="Exportar e importar sprites do jogo"><Image size={17} /> Sprites</button>
    </header>
    {assetsOpen && <AssetManager onClose={() => setAssetsOpen(false)} />}
    <nav className="map-editor-source" aria-label="Mapa em edição">
      <button type="button" aria-pressed={!editingLive && !loadingMap} disabled={busy}
        onClick={() => { if (editingLive || changes) void switchMap(false) }}><FilePlus2 size={17} /> Novo mapa</button>
      <button type="button" aria-pressed={editingLive} disabled={busy}
        onClick={() => { if (!editingLive) void switchMap(true) }}>
        <FolderOpen size={17} />{loadingMap ? "Carregando vila…" : "Editar vila jogável"}
      </button>
    </nav>
    <div className="map-editor-layout">
      <aside className="map-editor-tools" aria-label="Ferramentas do mapa">
        <div className="map-editor-groups">
          {GROUPS.map(({ id, Icon, label }) => <button key={id} type="button" aria-pressed={group === id && !panning} onClick={() => {
            setGroup(id)
            if (id === "resources") setResourceTab("resources")
            setToolId(id === "resources" ? TOOLS.resources[0].id : TOOLS[id][0].id)
            setPanning(false)
            clearFeedback()
          }}><Icon size={20} />{label}</button>)}
        </div>
        {group === "resources" && <div className="map-editor-resource-tabs" role="tablist" aria-label="Tipo de item">
          <button type="button" role="tab" aria-selected={resourceTab === "resources"} onClick={() => {
            setResourceTab("resources")
            setToolId(TOOLS.resources[0].id)
            clearFeedback()
          }}>Naturais</button>
          <button type="button" role="tab" aria-selected={resourceTab === "buildings"} onClick={() => {
            setResourceTab("buildings")
            setToolId(BUILDING_TOOLS[0].id)
            clearFeedback()
          }}>Estruturas</button>
        </div>}
        <div className="map-editor-options" data-group={group} data-palette={resourceTab} aria-label="Paleta de pincéis">
          {options.map((option) => <button key={option.id} type="button" data-tool={option.id} title={option.label}
            aria-pressed={tool.id === option.id && !panning} onClick={() => {
              setToolId(option.id)
              setPanning(false)
              clearFeedback()
            }}>
            <ToolPreview tool={option} /><span>{option.label}</span>
          </button>)}
        </div>
        <div className="map-editor-brush" aria-label="Tamanho do pincel">
          <span>Pincel</span>
          {[1, 3, 5].map((size) => <button key={size} type="button" disabled={tool.edit.building != null} aria-pressed={brush === size} onClick={() => setBrush(size)}>{size}×{size}</button>)}
        </div>
        <p>{GROUPS.find(({ id }) => id === group)?.hint}</p>
        <footer><Link to="/crops_farm">Abrir vila</Link><Link to="/farm_laboratory">Editor clássico</Link></footer>
      </aside>
      <section className="map-editor-stage" aria-label="Mapa">
        <div className="map-editor-view-actions">
          <span className="map-editor-zoom-hint">Roda ou pinça para dar zoom</span>
          <button type="button" aria-label="Mover câmera" title="Mover câmera" aria-pressed={panning} onClick={() => { setPanning(!panning); setHover(null); clearFeedback() }}><Hand size={17} /></button>
          <button type="button" aria-label="Ajustar mapa à tela" title="Ajustar à tela" onClick={fitMap}><Maximize size={17} /></button>
          <button type="button" aria-label="Afastar" title="Afastar" onClick={() => zoomBy(1 / 1.4)}><ZoomOut size={17} /></button>
          <output className="map-editor-zoom" aria-label="Zoom">{Math.round(scale * 100)}%</output>
          <button type="button" aria-label="Aproximar" title="Aproximar" onClick={() => zoomBy(1.4)}><ZoomIn size={17} /></button>
        </div>
        <div className="map-editor-scroll" ref={scroller}
          onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={finishPointer}
          onPointerCancel={(event) => finishPointer(event, true)} onPointerLeave={() => setHover(null)}>
          <div className="map-editor-board" ref={board} style={{ width: base.width * TILE * scale, height: base.height * TILE * scale }}>
            <div className={`map-editor-board-inner ${panning ? "panning" : ""}`}
              style={{ width: base.width * TILE, height: base.height * TILE, transform: `scale(${scale})` }}>
              <Grid width={base.width} height={base.height} groundTiles={terrain} mode={panning ? "idle" : "paint"}
                mouseTile={hover} showGrid={scale >= 1} brushSize={brush} selectedGroundTile={0} raisedRelief />
              {draft.preview.nodes.map((node) => <span key={node.id}
                className={`world-object node-object ${node.kind}${node.regeneratesAt !== undefined ? " is-regenerating" : ""}`}
                style={{ left: node.x * TILE, top: node.y * TILE, zIndex: node.y + 2 }}><NodeArt node={node} /></span>)}
              {draft.preview.buildings.map((building) => <div key={building.id} className={`map-editor-building ${building.kind}`} title={BUILDINGS[building.kind].name}
                style={{ left: building.x * TILE, top: building.y * TILE, width: building.width * TILE, height: building.height * TILE }}>
                <div className="building-visual" style={{ transform: `scale(${buildingVisualScale(building.kind, building.width, building.height)})` }}>
                  <BuildingArt building={building} verticalWall={wallUsesVerticalSprite(building, draft.preview.buildings)} />
                </div>
              </div>)}
              {highlighted.map((cell) => <span key={mapKey(cell)} className="map-editor-blocked-cell"
                style={{ left: cell.x * TILE, top: cell.y * TILE }} aria-hidden="true" />)}
            </div>
          </div>
        </div>
        <p className={`map-editor-status${feedback?.error ? " map-editor-error" : ""}`} role={notice ? "status" : undefined}>
          {feedback?.error && <TriangleAlert size={15} aria-hidden="true" />}
          {feedback?.message ?? (sample && hover
            ? `${hover.x}, ${hover.y} · ${MAP_SURFACES[sample.surface].label} · altura ${sample.elevation}${hoveredResource ? ` · ${hoveredResource}` : ""}`
            : changes ? "Rascunho. Aplicar atualiza só os quadrados modificados." : "Selecione uma ferramenta e pinte no mapa.")}
        </p>
      </section>
    </div>
  </main>
}
