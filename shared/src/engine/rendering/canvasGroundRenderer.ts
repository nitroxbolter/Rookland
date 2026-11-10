/**
 * Canvas Ground Renderer
 * Draws ground tiles on canvas instead of DOM
 */

import type { GroundTile } from "../autotiling/groundAutotiling"
import { getBlobTileIndex } from "../autotiling/blobAutotiling"
import { floorPriority } from "../../../village/mapSurfaces"
import { dirtRegistry } from "../data/autotiling/dirtData"
import { groundRegistry } from "../data/autotiling/groundData"
import { hillsRegistry } from "../data/autotiling/hillsData"
import { terrainRegistry } from "../data/autotiling/terrainData"

import { TILE_SIZE } from "./config"
import { getCachedImage } from "./spritesheetLoader"
import { roundedReliefOutline } from "./terrainOutline"

/**
 * Get spritesheet config by tile type
 * Checks terrainRegistry (0-99), groundRegistry (100-199), hillsRegistry (200-299), dirtRegistry (400+)
 */
function getSpritesheetForType(type: number) {
  // Layer 0: Terrains (0-99)
  const terrainId = terrainRegistry.tileTypeToId[type]
  if (terrainId) {
    return terrainRegistry.getCachedSpritesheet(terrainId)
  }

  // Grounds (100-199)
  const groundId = groundRegistry.tileTypeToId[type]
  if (groundId) {
    return groundRegistry.getCachedSpritesheet(groundId)
  }

  // Hills (200-299)
  const hillId = hillsRegistry.tileTypeToId[type]
  if (hillId) {
    return hillsRegistry.getCachedSpritesheet(hillId)
  }

  // Dirt (400+)
  const dirtId = dirtRegistry.tileTypeToId[type]
  if (dirtId) {
    return dirtRegistry.getCachedSpritesheet(dirtId)
  }

  return null
}

/**
 * Draw a single tile on canvas
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  tileType: number,
  spriteIndex: number,
  tileX: number,
  tileY: number,
): void {
  const sheet = getSpritesheetForType(tileType)
  if (!sheet) return

  const image = getCachedImage(sheet.src)
  if (!image) return

  const cols = sheet.sheetWidth / sheet.width
  const srcX = (spriteIndex % cols) * sheet.width
  const srcY = Math.floor(spriteIndex / cols) * sheet.height

  ctx.drawImage(
    image,
    srcX,
    srcY,
    sheet.width,
    sheet.height,
    tileX * TILE_SIZE,
    tileY * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE,
  )
}

/**
 * Clear a single tile position
 */
export function clearTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
): void {
  ctx.clearRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}

const FLOOR_EDGE_WIDTH = 6
const FLOOR_EDGES = [
  { dx: 0, dy: -1, x: 0, y: 0, w: TILE_SIZE, h: FLOOR_EDGE_WIDTH },
  { dx: 1, dy: 0, x: TILE_SIZE - FLOOR_EDGE_WIDTH, y: 0, w: FLOOR_EDGE_WIDTH, h: TILE_SIZE },
  { dx: 0, dy: 1, x: 0, y: TILE_SIZE - FLOOR_EDGE_WIDTH, w: TILE_SIZE, h: FLOOR_EDGE_WIDTH },
  { dx: -1, dy: 0, x: 0, y: 0, w: FLOOR_EDGE_WIDTH, h: TILE_SIZE },
] as const

export function drawVillageSurfaces(ctx: CanvasRenderingContext2D, tiles: Map<string, GroundTile>) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = false
  for (const [key, tile] of tiles) {
    const floor = tile.layers[1]
    if (!floor) continue
    const [x, y] = key.split("-").map(Number)
    const left = x * TILE_SIZE
    const top = y * TILE_SIZE
    const neighbors = FLOOR_EDGES.map((edge) => {
      const neighbor = tiles.get(`${x + edge.dx}-${y + edge.dy}`)
      return { edge, neighbor, type: neighbor?.layers[1]?.type ?? 0 }
    })
    // Expose the adjacent lower material through the rounded edge of this sprite.
    const lower = neighbors.filter(({ type }) => type > 0 && floorPriority(type) < floorPriority(floor.type))
      .sort((a, b) => floorPriority(a.type) - floorPriority(b.type))
    if (lower.length) {
      const [north, east, south, west] = neighbors.map(({ neighbor }) => neighbor ? 0 : 4)
      ctx.save()
      ctx.beginPath()
      ctx.rect(left + west, top + north, TILE_SIZE - west - east, TILE_SIZE - north - south)
      ctx.clip()
      for (const { edge, type } of lower) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(left + edge.x, top + edge.y, edge.w, edge.h)
        ctx.clip()
        drawTile(ctx, type, getBlobTileIndex(255, x, y, type), x, y)
        ctx.restore()
      }
      ctx.restore()
    }
    drawTile(ctx, floor.type, floor.spriteIndex, x, y)
  }
}

const terrainRise = (tile?: GroundTile) => tile?.layers[3] ? 24 : tile?.layers[2] ? 8 : 0

function clipTerrainCorners(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
  [tl, tr, br, bl]: [number, number, number, number],
) {
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + width - tr, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr)
  ctx.lineTo(x + width, y + height - br)
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height)
  ctx.lineTo(x + bl, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl)
  ctx.lineTo(x, y + tl)
  ctx.quadraticCurveTo(x, y, x + tl, y)
  ctx.closePath()
  ctx.clip()
}

function drawTerrainCap(
  ctx: CanvasRenderingContext2D, tiles: Map<string, GroundTile>, x: number, y: number, height: number,
) {
  const left = x * TILE_SIZE
  const top = y * TILE_SIZE - height
  const rock = height === 24
  const edge = (dx: number, dy: number) => terrainRise(tiles.get(`${x + dx}-${y + dy}`)) < height
  const north = edge(0, -1)
  const east = edge(1, 0)
  const south = edge(0, 1)
  const west = edge(-1, 0)
  const radius = rock ? 6 : 5
  ctx.save()
  clipTerrainCorners(ctx, left, top, TILE_SIZE, TILE_SIZE, [
    north && west ? radius : 0, north && east ? radius : 0,
    south && east ? radius : 0, south && west ? radius : 0,
  ])
  // An opaque cap joins neighboring tiles without revealing the grass underneath.
  ctx.fillStyle = rock ? "#a3aa96" : "#a5bc66"
  ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)

  const grain = (x * 17 + y * 11) % 11
  ctx.fillStyle = rock ? "#b8bfa9" : "#b8cb78"
  ctx.fillRect(left + 2 + grain, top + 3, 2, 1)
  ctx.fillRect(left + 3, top + 8 + grain % 5, 3, 1)
  ctx.fillStyle = rock ? "#909882" : "#92ab55"
  ctx.fillRect(left + 8, top + 8 + grain % 4, 3, 2)

  ctx.fillStyle = rock ? "#c4ccb4" : "#c0d582"
  if (north) ctx.fillRect(left, top, TILE_SIZE, 2)
  if (west) ctx.fillRect(left, top, 1, TILE_SIZE)
  ctx.fillStyle = rock ? "#777f6c" : "#788f4b"
  if (east) ctx.fillRect(left + TILE_SIZE - 1, top, 1, TILE_SIZE)
  if (south) ctx.fillRect(left, top + TILE_SIZE - 2, TILE_SIZE, 2)
  ctx.restore()
}

/** Render village heights as a raised cap and the rock exposed beneath it. */
export function drawRaisedTerrain(ctx: CanvasRenderingContext2D, tiles: Map<string, GroundTile>) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = false

  const raised: { x: number; y: number; height: number; depth: number }[] = []
  for (const [key, tile] of tiles) {
    const height = terrainRise(tile)
    if (!height) continue
    const [x, y] = key.split("-").map(Number)
    const southHeight = terrainRise(tiles.get(`${x}-${y + 1}`))
    raised.push({ x, y, height, depth: Math.max(0, height - southHeight) })
  }
  if (!raised.length) return

  const outline = roundedReliefOutline(raised.map(({ x, y, height, depth }) => ({
    x: x * TILE_SIZE, y: y * TILE_SIZE - height, width: TILE_SIZE, height: TILE_SIZE + depth,
  })), 6)
  ctx.save()
  ctx.clip(outline, "evenodd")
  // Back the small rounded inside corners where two faces meet.
  ctx.fillStyle = "#666e55"
  ctx.fill(outline, "evenodd")

  // Village terrain is generated north to south so nearer caps overlap distant faces.
  for (const { x, y, height, depth } of raised) {
    const left = x * TILE_SIZE
    const top = y * TILE_SIZE - height
    const face = top + TILE_SIZE

    if (depth > 0) {
      const mountain = height === 24
      ctx.fillStyle = mountain ? "#62665c" : "#786b49"
      ctx.fillRect(left, face - 2, TILE_SIZE, depth + 2)
      ctx.fillStyle = mountain ? "#8e9481" : "#a08c59"
      ctx.fillRect(left, face, TILE_SIZE, 2)

      // Offset the stone strata so neighboring tiles don't form a continuous stripe.
      const offset = (x * 5 + y * 3) % 6
      for (let step = 3; step < depth - 2; step += 5) {
        const seam = (offset + step * 3) % 8
        ctx.fillStyle = mountain ? "#747a6b" : "#8b7950"
        ctx.fillRect(left + seam, face + step, TILE_SIZE - seam, 2)
        ctx.fillStyle = mountain ? "#53594f" : "#615438"
        ctx.fillRect(left, face + step + 2, seam + 4, 1)
      }
      ctx.fillStyle = mountain ? "#4b5149" : "#5b5138"
      ctx.fillRect(left, face + depth - 2, TILE_SIZE, 2)
    }

    drawTerrainCap(ctx, tiles, x, y, height)
  }

  ctx.lineWidth = 2
  ctx.strokeStyle = "#30382a66"
  ctx.stroke(outline)
  ctx.restore()
}

/**
 * Draw entire layer from groundTiles
 */
export function drawLayer(
  ctx: CanvasRenderingContext2D,
  groundTiles: Map<string, GroundTile>,
  layer: number,
): void {
  // Clear entire canvas first
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Draw all tiles in this layer
  for (const [key, tile] of groundTiles) {
    const layerTile = tile.layers[layer]
    if (!layerTile) continue

    const [xStr, yStr] = key.split("-")
    const x = parseInt(xStr)
    const y = parseInt(yStr)

    drawTile(ctx, layerTile.type, layerTile.spriteIndex, x, y)
  }
}

/**
 * Update only specific tiles (incremental update)
 */
export function updateTiles(
  ctx: CanvasRenderingContext2D,
  changedKeys: Set<string>,
  groundTiles: Map<string, GroundTile>,
  layer: number,
): void {
  for (const key of changedKeys) {
    const [xStr, yStr] = key.split("-")
    const x = parseInt(xStr)
    const y = parseInt(yStr)

    // Clear the tile position
    clearTile(ctx, x, y)

    // Draw new tile if exists
    const tile = groundTiles.get(key)
    const layerTile = tile?.layers[layer]
    if (layerTile) {
      drawTile(ctx, layerTile.type, layerTile.spriteIndex, x, y)
    }
  }
}

/**
 * Find keys that changed between two groundTiles maps
 */
export function findChangedKeys(
  prev: Map<string, GroundTile>,
  next: Map<string, GroundTile>,
): Set<string> {
  const changed = new Set<string>()

  // Check all keys in next
  for (const [key, tile] of next) {
    const prevTile = prev.get(key)
    if (!prevTile || !tilesEqual(prevTile, tile)) {
      changed.add(key)
    }
  }

  // Check removed keys
  for (const key of prev.keys()) {
    if (!next.has(key)) {
      changed.add(key)
    }
  }

  return changed
}

/**
 * Compare two GroundTiles for equality
 */
function tilesEqual(a: GroundTile, b: GroundTile): boolean {
  for (let i = 0; i < 4; i++) {
    const aLayer = a.layers[i]
    const bLayer = b.layers[i]
    if (aLayer === null && bLayer === null) continue
    if (aLayer === null || bLayer === null) return false
    if (
      aLayer.type !== bLayer.type ||
      aLayer.spriteIndex !== bLayer.spriteIndex
    ) {
      return false
    }
  }
  return true
}
/**
 * Get all spritesheet sources for preloading
 */
export function getSpritesheetSources(): string[] {
  // Get all terrain spritesheets (Layer 0)
  const terrainSources = terrainRegistry
    .getAllIds()
    .map((terrainId) => terrainRegistry.getCachedSpritesheet(terrainId).src)

  // Get all ground spritesheets
  const groundSources = groundRegistry
    .getAllIds()
    .map((groundId) => groundRegistry.getCachedSpritesheet(groundId).src)

  // Get all hills spritesheets
  const hillsSources = hillsRegistry
    .getAllIds()
    .map((hillId) => hillsRegistry.getCachedSpritesheet(hillId).src)

  // Get all dirt spritesheets
  const dirtSources = dirtRegistry
    .getAllIds()
    .map((dirtId) => dirtRegistry.getCachedSpritesheet(dirtId).src)

  return [...terrainSources, ...groundSources, ...hillsSources, ...dirtSources]
}
