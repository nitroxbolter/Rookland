import type { GroundTile } from "../src/engine/autotiling/groundAutotiling"
import {
  calculateBlobBitmask,
  getBlobTileIndex,
} from "../src/engine/autotiling/blobAutotiling"
import { VILLAGE_SIZE, VILLAGE_HEIGHT } from "./config"
import { mapKey, mapTileAt } from "./map"
import { floorPriority, MAP_SURFACES } from "./mapSurfaces"
import type { VillageState } from "./types"

export function createVillageTerrain(
  map: Pick<VillageState, "width" | "height" | "mapTiles"> = { width: VILLAGE_SIZE, height: VILLAGE_HEIGHT },
  naturalPatches = true,
) {
  const tiles = new Map<string, GroundTile>()
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const tile = mapTileAt(map, x, y)
      const surface = MAP_SURFACES[tile.surface].tile
      if (surface === null) continue
      const key = mapKey({ x, y })
      const patch = naturalPatches && !map.mapTiles?.[key] && ((x < 9 && y < 12) || (x > 23 && y > 19) || (x > 20 && y < 8))
      // Material changes must never cut a shoreline through the solid land layer.
      tiles.set(key, {
        layers: [
          { type: 0, spriteIndex: 0 },
          surface > 0 ? { type: surface, spriteIndex: 0 } : patch ? { type: 101, spriteIndex: 0 } : null,
          tile.elevation > 0 ? { type: 200, spriteIndex: 0 } : null,
          tile.elevation === 2 ? { type: 204, spriteIndex: 0 } : null,
        ],
      })
    }
  for (const [key, tile] of tiles) {
    const [x, y] = key.split("-").map(Number)
    const landMask = calculateBlobBitmask(x, y, 0, 0, tiles, map.width, map.height)
    for (let layer = 0; layer < 4; layer++) {
      const item = tile.layers[layer]
      if (item)
        item.spriteIndex = getBlobTileIndex(
          layer === 0 ? landMask : calculateBlobBitmask(
            x,
            y,
            item.type,
            layer,
            tiles,
            map.width,
            map.height,
            layer === 1
              ? (neighbor) => floorPriority(neighbor.layers[1]?.type ?? 0) >= floorPriority(item.type)
              : undefined,
          ),
          x,
          y,
          item.type,
        )
    }
  }
  return tiles
}
