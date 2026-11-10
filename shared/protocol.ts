import type { GroundTile } from "./src/engine/autotiling/groundAutotiling"
import type { DroppedItem } from "./src/engine/dropsStore"
import type { InventoryItem } from "./src/engine/inventoryStore"
import type { WorldState, Tool, TilledTile } from "./src/engine/store"
import type { VillageState, VillageCommand } from "./village/types"

export interface WorldSnapshot {
  version: 1
  world: Omit<WorldState, "activeTool" | "tilledSoil"> & {
    tilledSoil: [string, TilledTile][]
  }
  groundTiles: [string, GroundTile][]
  inventory: (InventoryItem | null)[]
  drops: DroppedItem[]
  village?: VillageState
}

export type GameCommand =
  | VillageCommand
  | {
      type: "useTool"
      x: number
      y: number
      tool: Tool | null
      itemId: string | null
    }
  | { type: "pause"; paused: boolean }
  | { type: "speed"; scale: number }
  | { type: "moveItem"; from: number; to: number }

export interface FarmSaveData {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  version: number
  data: {
    groundTiles: [string, GroundTile][]
    entities: WorldState["entities"]
    width: number
    height: number
  }
}

export type FarmListItem = Pick<FarmSaveData, "id" | "name" | "updatedAt">
