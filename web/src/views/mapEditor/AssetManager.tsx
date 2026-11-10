import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react"
import { Crop, Download, Image, Move, RotateCcw, Upload, X, ZoomIn, ZoomOut } from "lucide-react"
import { api } from "@/services/gameClient"

type Category = "Estruturas" | "Personagens" | "Animais" | "Itens" | "Recursos"
type AssetInfo = {
  id: string
  label: string
  category: Category
  path: string
  width: number
  height: number
  bytes: number
  version: number
  footprint?: string
  spriteSize?: string
  region?: [number, number, number, number]
  gameScale?: number
}
const categories: Category[] = ["Estruturas", "Personagens", "Animais", "Itens", "Recursos"]

function AssetThumbnail({ asset }: { asset: AssetInfo }) {
  if (!asset.region) return <img src={`/${asset.path}?v=${asset.version}`} alt="" loading="lazy" />
  const [x, y, width, height] = asset.region
  const scale = Math.min(42 / width, 42 / height)
  return <i aria-hidden="true" className="asset-manager-thumbnail" style={{
    width: width * scale, height: height * scale,
    backgroundImage: `url(/${asset.path}?v=${asset.version})`,
    backgroundSize: `${asset.width * scale}px ${asset.height * scale}px`,
    backgroundPosition: `${-x * scale}px ${-y * scale}px`,
  }} />
}

function SpriteImageEditor({ asset, busy, showGrid, onSave }: {
  asset: AssetInfo
  busy: boolean
  showGrid: boolean
  onSave: (blob: Blob) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  type Box = { x: number; y: number; width: number; height: number }
  type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number; crop: boolean; handle?: Handle; startBox?: Box } | null>(null)
  const dimensions = asset.footprint?.match(/^(\d+)×(\d+)/)
  const tilesWide = Number(dimensions?.[1] ?? 1)
  const tilesHigh = Number(dimensions?.[2] ?? 1)
  // Show the real game footprint enlarged for editing; keep PNG export at native dimensions.
  const scale = asset.gameScale ?? Math.min(tilesWide * 16 / asset.width, tilesHigh * 16 / asset.height)
  const stageZoom = 4
  const stageWidth = tilesWide * 16 * stageZoom
  const stageHeight = tilesHigh * 16 * stageZoom
  const sourceToStage = scale * stageZoom
  const originX = (stageWidth - asset.width * sourceToStage) / 2
  const originY = stageHeight - asset.height * sourceToStage
  const outputWidth = Math.max(asset.width, Math.ceil(stageWidth / sourceToStage))
  const outputHeight = Math.max(asset.height, Math.ceil(stageHeight / sourceToStage))
  const outputOriginX = (stageWidth - outputWidth * sourceToStage) / 2
  const outputOriginY = stageHeight - outputHeight * sourceToStage
  const initialBox = useMemo(() => ({ width: asset.width * sourceToStage, height: asset.height * sourceToStage,
    x: originX, y: originY }), [asset.width, asset.height, sourceToStage, originX, originY])
  const [box, setBox] = useState<Box>(initialBox)
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [viewZoom, setViewZoom] = useState(() => Math.min(6, Math.max(1.5, 480 / stageWidth)))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  function renderOutput() {
    const image = imageRef.current
    if (!image) return null
    const output = document.createElement("canvas")
    output.width = outputWidth
    output.height = outputHeight
    const context = output.getContext("2d")
    if (!context) return null
    context.imageSmoothingEnabled = false
    context.save()
    context.beginPath()
    context.rect(-outputOriginX / sourceToStage, -outputOriginY / sourceToStage,
      stageWidth / sourceToStage, stageHeight / sourceToStage)
    context.clip()
    context.drawImage(image, (box.x - outputOriginX) / sourceToStage, (box.y - outputOriginY) / sourceToStage,
      box.width / sourceToStage, box.height / sourceToStage)
    context.restore()
    return output
  }

  useEffect(() => {
    const image = new window.Image()
    image.onload = () => { imageRef.current = image; setReady(true) }
    image.onerror = () => setError("Não foi possível carregar este PNG.")
    image.src = `/${asset.path}?v=${asset.version}`
    setBox(initialBox)
    setCropRect(null)
    setReady(false)
    setError("")
  }, [asset.id, asset.path, asset.version, initialBox])
  useEffect(() => { setViewZoom(Math.min(6, Math.max(1.5, 480 / stageWidth))) }, [asset.id, stageWidth])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const context = canvas.getContext("2d")
    if (!context) return
    const { width, height } = canvas
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = false
    context.drawImage(image, box.x, box.y, box.width, box.height)
    if (cropMode && cropRect) {
      context.fillStyle = "#0b0c0a88"
      context.fillRect(0, 0, width, cropRect.y)
      context.fillRect(0, cropRect.y + cropRect.height, width, height - cropRect.y - cropRect.height)
      context.fillRect(0, cropRect.y, cropRect.x, cropRect.height)
      context.fillRect(cropRect.x + cropRect.width, cropRect.y, width - cropRect.x - cropRect.width, cropRect.height)
      context.strokeStyle = "#ff5548"
      context.lineWidth = Math.max(1, width / 800)
      context.setLineDash([width / 100, width / 180])
      context.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height)
      context.setLineDash([])
    }
    if (showGrid) {
      context.strokeStyle = "#e9483dcc"
      context.lineWidth = Math.max(1, width / 1200)
      context.beginPath()
      const cell = 16 * stageZoom
      for (let x = 0; x <= width; x += cell) { context.moveTo(x, 0); context.lineTo(x, height) }
      for (let y = 0; y <= height; y += cell) { context.moveTo(0, y); context.lineTo(width, y) }
      context.stroke()
    }
    context.strokeStyle = "#ffe08a"
    context.lineWidth = Math.max(2, width / 700)
    context.strokeRect(1, 1, width - 2, height - 2)
    if (!cropMode) {
      context.strokeStyle = "#fff0a8"
      context.lineWidth = Math.max(2, width / 700)
      context.strokeRect(box.x, box.y, box.width, box.height)
      const size = Math.max(9, width / 45)
      const half = size / 2
      const handles = [[box.x,box.y],[box.x+box.width/2,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height/2],[box.x+box.width,box.y+box.height/2],[box.x,box.y+box.height],[box.x+box.width/2,box.y+box.height],[box.x+box.width,box.y+box.height]]
      context.fillStyle = "#f05246"
      context.strokeStyle = "#fff0a8"
      for (const [x,y] of handles) { context.fillRect(x-half,y-half,size,size); context.strokeRect(x-half,y-half,size,size) }
    }
  }, [asset.height, asset.width, box, cropMode, cropRect, stageZoom, showGrid])

  useEffect(() => { if (ready) draw() }, [ready, draw])

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }
  }

  function hitHandle(p: { x: number; y: number }): Handle | undefined {
    const canvas = canvasRef.current!
    const viewScale = canvas.width / canvas.getBoundingClientRect().width
    const t = Math.max(10, 10 * viewScale)
    const left = Math.abs(p.x - box.x) <= t
    const right = Math.abs(p.x - box.x - box.width) <= t
    const top = Math.abs(p.y - box.y) <= t
    const bottom = Math.abs(p.y - box.y - box.height) <= t
    if (left && top) return "nw"
    if (right && top) return "ne"
    if (left && bottom) return "sw"
    if (right && bottom) return "se"
    if (top && p.x >= box.x && p.x <= box.x + box.width) return "n"
    if (bottom && p.x >= box.x && p.x <= box.x + box.width) return "s"
    if (left && p.y >= box.y && p.y <= box.y + box.height) return "w"
    if (right && p.y >= box.y && p.y <= box.y + box.height) return "e"
    return undefined
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!ready) return
    const p = point(event)
    const handle = !cropMode ? hitHandle(p) : undefined
    dragRef.current = { ...p, startX: p.x, startY: p.y, crop: cropMode, handle, startBox: { ...box } }
    if (cropMode) setCropRect({ x: p.x, y: p.y, width: 0, height: 0 })
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    if (!drag) return
    const p = point(event)
    if (drag.crop) setCropRect({ x: Math.min(drag.startX, p.x), y: Math.min(drag.startY, p.y), width: Math.abs(drag.startX - p.x), height: Math.abs(drag.startY - p.y) })
    else if (drag.handle && drag.startBox) {
      const dx = p.x - drag.startX
      const dy = p.y - drag.startY
      const initial = drag.startBox
      let left = initial.x, right = initial.x + initial.width
      let top = initial.y, bottom = initial.y + initial.height
      if (drag.handle.includes("w")) left = Math.min(right - 8, initial.x + dx)
      if (drag.handle.includes("e")) right = Math.max(left + 8, initial.x + initial.width + dx)
      if (drag.handle.includes("n")) top = Math.min(bottom - 8, initial.y + dy)
      if (drag.handle.includes("s")) bottom = Math.max(top + 8, initial.y + initial.height + dy)
      setBox({ x: left, y: top, width: right - left, height: bottom - top })
    } else if (drag.startBox) {
      const initial = drag.startBox
      setBox({ ...initial,
        x: initial.x + p.x - drag.startX,
        y: initial.y + p.y - drag.startY,
      })
    }
    dragRef.current = { ...drag, x: p.x, y: p.y }
  }

  function cropImage() {
    const source = renderOutput()
    const rect = cropRect
    if (!source || !rect || rect.width < 1 || rect.height < 1) return
    const output = document.createElement("canvas")
    output.width = source.width
    output.height = source.height
    const context = output.getContext("2d")
    if (context) {
      context.imageSmoothingEnabled = false
      context.save()
      context.beginPath()
      context.rect(-outputOriginX / sourceToStage, -outputOriginY / sourceToStage,
        stageWidth / sourceToStage, stageHeight / sourceToStage)
      context.clip()
      const sourceRect = { x: (rect.x - outputOriginX) / sourceToStage, y: (rect.y - outputOriginY) / sourceToStage,
        width: rect.width / sourceToStage, height: rect.height / sourceToStage }
      const destRect = { x: (box.x - outputOriginX) / sourceToStage, y: (box.y - outputOriginY) / sourceToStage,
        width: box.width / sourceToStage, height: box.height / sourceToStage }
      context.drawImage(source, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
        destRect.x, destRect.y, destRect.width, destRect.height)
      context.restore()
    }
    output.toBlob((blob) => { if (blob) onSave(blob) }, "image/png")
  }

  function saveImage() {
    const canvas = renderOutput()
    if (canvas) canvas.toBlob((blob) => { if (blob) onSave(blob) }, "image/png")
  }

  function zoomBox(factor: number) {
    setBox((current) => {
      const width = Math.max(8, current.width * factor)
      const height = Math.max(8, current.height * factor)
      return { x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height }
    })
  }
  function zoomView(factor: number) {
    setViewZoom((current) => Math.max(0.75, Math.min(8, Math.round(current * factor * 10) / 10)))
  }

  return <div className="sprite-image-editor">
    <div className="sprite-editor-toolbar">
      <button type="button" aria-pressed={!cropMode} onClick={() => { setCropMode(false); setCropRect(null) }}><Move size={15} /> Selecionar</button>
      <button type="button" aria-pressed={cropMode} onClick={() => { setCropMode(true); setCropRect(null) }}><Crop size={15} /> Recortar</button>
      <span>Tamanho do sprite</span>
      <button type="button" title="Diminuir sprite" onClick={() => zoomBox(0.9)}><ZoomOut size={15} /></button>
      <span>{Math.round(box.width / initialBox.width * 100)}% × {Math.round(box.height / initialBox.height * 100)}%</span>
      <button type="button" title="Ampliar sprite" onClick={() => zoomBox(1.1)}><ZoomIn size={15} /></button>
      <button type="button" title="Redefinir" onClick={() => { setBox(initialBox); setCropRect(null) }}><RotateCcw size={15} /></button>
      <button type="button" disabled={!cropRect || cropRect.width < 1 || busy} onClick={cropImage}>Aplicar corte</button>
      <span>Zoom da tela</span>
      <button type="button" title="Afastar visualização" onClick={() => zoomView(1 / 1.25)}><ZoomOut size={15} /></button>
      <span>{Math.round(viewZoom * 100)}%</span>
      <button type="button" title="Aproximar visualização" onClick={() => zoomView(1.25)}><ZoomIn size={15} /></button>
    </div>
    <div className="sprite-editor-canvas-wrap">
      <canvas ref={canvasRef} width={stageWidth} height={stageHeight} style={{ width: stageWidth * viewZoom, height: stageHeight * viewZoom }} aria-label="Editor visual do sprite"
        className={cropMode ? "crop-mode" : "drag-mode"} onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }}
        onWheel={(event) => { event.preventDefault(); zoomView(event.deltaY < 0 ? 1.1 : 1 / 1.1) }} />
      {!ready && !error && <span>Carregando imagem…</span>}
      {error && <span>{error}</span>}
    </div>
    <div className="sprite-editor-footer">
      <small>{tilesWide}×{tilesHigh} tiles · {tilesWide * 16}×{tilesHigh * 16} px no jogo · PNG {outputWidth}×{outputHeight} px</small>
      <button type="button" className="sprite-editor-save" disabled={!ready || busy} onClick={saveImage}><Upload size={15} /> {busy ? "Salvando…" : "Salvar imagem"}</button>
    </div>
  </div>
}

export function AssetManager({ onClose }: { onClose: () => void }) {
  const [assets, setAssets] = useState<AssetInfo[]>([])
  const [category, setCategory] = useState<Category>("Estruturas")
  const [selectedId, setSelectedId] = useState("village-atlas")
  const [busy, setBusy] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState("")
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    api<AssetInfo[]>("/assets").then((items) => { if (active) setAssets(items) })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Não foi possível carregar os sprites.") })
    return () => { active = false }
  }, [])

  const listed = assets.filter((asset) => asset.category === category)
  const selected = assets.find((asset) => asset.id === selectedId && asset.category === category) ?? listed[0]

  async function importFile(file: File | undefined) {
    if (!file || !selected) return
    if (!file.name.toLowerCase().endsWith(".png") || file.size > 10 * 1024 * 1024) {
      setMessage("Escolha um PNG de até 10 MB.")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      const updated = await api<AssetInfo>(`/assets/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "image/png" }, body: await file.arrayBuffer(),
      })
      setAssets((previous) => previous.map((asset) => asset.id === updated.id ? updated : asset))
      setEditing(false)
      setMessage(`${updated.label} importado. Recarregue a página para ver a nova imagem no mapa e no jogo.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar o PNG.")
    } finally {
      setBusy(false)
    }
  }

  function importPng(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    void importFile(file)
  }

  return <div className="asset-manager-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`asset-manager${editing ? " is-editing" : ""}`} role="dialog" aria-modal="true" aria-label="Sprites do jogo">
      <header>
        <Image size={22} /><div><h2>Sprites do jogo</h2><small>Exporte o PNG, edite e importe a mesma folha.</small></div>
        <button type="button" aria-label="Fechar sprites" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="asset-manager-content">
        <aside className="asset-manager-sidebar">
        <nav className="asset-manager-tabs" aria-label="Categorias de sprites">
          {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setMessage("") }}>{item}</button>)}
        </nav>
        <div className="asset-manager-list" aria-label="Sprites disponíveis">
          {listed.map((asset) => <button key={asset.id} type="button" aria-pressed={selected?.id === asset.id} onClick={() => { setSelectedId(asset.id); setMessage("") }}>
            <AssetThumbnail asset={asset} />
            <span>{asset.label}<small>{asset.footprint ?? "Área não definida"} · {asset.spriteSize ?? `${asset.width} × ${asset.height} px`}</small></span>
          </button>)}
          {!assets.length && <p>Carregando sprites…</p>}
        </div>
        </aside>
        <div className="asset-manager-detail">
          {selected && <>
            <div className="asset-manager-preview-heading">
              <strong>{editing ? selected.label : "Prévia no mapa"}</strong>
              <span className="asset-manager-preview-actions">
                <button type="button" className="asset-manager-grid-toggle" aria-pressed={showGrid} onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Grade 16×16: ligada" : "Mostrar grade 16×16"}</button>
                <button type="button" className="asset-manager-grid-toggle" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{editing ? "Fechar editor" : "Editar imagem"}</button>
              </span>
            </div>
            {editing ? <SpriteImageEditor asset={selected} busy={busy} showGrid={showGrid} onSave={(blob) => void importFile(new File([blob], `${selected.id}.png`, { type: "image/png" }))} /> : <div className={`asset-manager-map-preview ${showGrid ? "with-grid" : ""}`}>
              {(() => {
                const dimensions = selected.footprint?.match(/^(\d+)×(\d+)/)
                const tileWidth = Number(dimensions?.[1] ?? 4)
                const tileHeight = Number(dimensions?.[2] ?? 4)
                const cell = 64
                const scale = selected.gameScale
                  ? selected.gameScale * 4
                  : Math.min(cell * tileWidth / selected.width, cell * tileHeight / selected.height)
                return <div className="asset-manager-map-ground" style={{ width: tileWidth * cell, height: tileHeight * cell, backgroundSize: `${cell}px ${cell}px` }}>
                  <img src={`/${selected.path}?v=${selected.version}`} alt={`Prévia no mapa: ${selected.label}`} style={{ transform: `translateX(-50%) scale(${scale})` }} />
                </div>
              })()}
            </div>}
            <h3>{selected.label}</h3>
            <div className="asset-manager-sizes">
              <span><small>Ocupa no mapa</small><strong>{selected.footprint ?? "—"}</strong></span>
              <span><small>Tamanho do sprite</small><strong>{selected.spriteSize ?? `${selected.width} × ${selected.height} px`}</strong></span>
              <span><small>Folha PNG</small><strong>{selected.width} × {selected.height} px</strong></span>
            </div>
            <p>PNG · {(selected.bytes / 1024 / 1024).toFixed(1)} MB. {selected.gameScale ? "O editor pode ampliar a tela do PNG para caber todo o quadro do jogo." : "Mantenha as dimensões da folha ao reimportar."}</p>
            <p>A importação substitui este sprite no jogo e guarda uma cópia do original no servidor.</p>
            <div className="asset-manager-actions">
              <a href={`/api/assets/${selected.id}`} download={`${selected.id}.png`}><Download size={17} /> Exportar PNG</a>
              <button type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={17} /> {busy ? "Importando…" : "Importar PNG"}</button>
              <input ref={input} type="file" accept="image/png,.png" onChange={(event) => void importPng(event)} hidden />
            </div>
          </>}
          {message && <p className="asset-manager-message" role="status">{message}</p>}
        </div>
      </div>
    </section>
  </div>
}
