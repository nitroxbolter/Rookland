import { gameLoop } from "@/engine/GameLoop"
import { worldStore, worldActions, type Tool } from "@/engine/store"
import {
  buildItemsMap,
  inventoryActions,
  inventoryStore,
} from "@/engine/inventoryStore"
import { dropsStore } from "@/engine/dropsStore"
import { ITEM_DEFINITIONS, ItemType } from "@/constants/items"
import { handleToolUse } from "@/engine/tools/toolRouter"
import type { GroundTile } from "@/engine/autotiling/groundAutotiling"
import map from "@/engine/data/maps/map_1.json"
import type { GameCommand, WorldSnapshot } from "../../shared/protocol"
import {
  createVillage,
  executeVillage,
  updateVillage,
  migrateVillage,
} from "../../shared/village/simulation"

const tools: Tool[] = ["axe", "pickaxe", "hoe", "wateringCan", "scythe"]
export const width = map.data.width
export const height = map.data.height
let groundTiles = new Map(map.data.groundTiles as [string, GroundTile][])
let village = createVillage()
let villageTimer: ReturnType<typeof setInterval> | null = null

export function snapshot(): WorldSnapshot {
  const { activeTool, tilledSoil, ...world } = worldStore.getState()
  return {
    version: 1,
    world: { ...world, tilledSoil: [...tilledSoil] },
    groundTiles: [...groundTiles],
    inventory: inventoryStore.getState().slots,
    drops: dropsStore.getState().items,
    village,
  }
}

export function restore(saved: WorldSnapshot) {
  if (
    saved.version !== 1 ||
    !saved.world ||
    !Array.isArray(saved.groundTiles) ||
    !Array.isArray(saved.inventory) ||
    saved.inventory.length !== inventoryStore.getState().slots.length
  ) {
    throw new Error("Formato de mundo salvo incompatível")
  }
  worldStore.setState({
    ...saved.world,
    tilledSoil: new Map(saved.world.tilledSoil),
    entities: saved.world.entities.map((e) => ({
      ...e,
      currentAnimation: undefined,
    })),
  })
  groundTiles = new Map(saved.groundTiles)
  inventoryStore.setState({
    slots: saved.inventory,
    itemsMap: buildItemsMap(saved.inventory),
  })
  if (saved.village) village = migrateVillage(saved.village)
}

const validIndex = (n: unknown, max: number): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n < max

export function execute(command: GameCommand) {
  if (!command || typeof command !== "object")
    throw new Error("Comando inválido")
  switch (command.type) {
    case "editVillageMap":
    case "build":
    case "buildWallLine":
    case "assignUnit":
    case "moveUnit":
    case "stopUnit":
    case "collectBranch":
    case "upgradeFarm":
    case "upgradeBarn":
    case "upgradeRanch":
    case "upgradeWeaving":
    case "upgradeDefense":
    case "upgradeHouse":
    case "upgradeTownCenter":
    case "demolishFarm":
    case "demolishBarn":
    case "demolishHouse":
    case "demolishWell":
    case "demolishBuilding":
    case "craftItem":
    case "upgradeTools":
    case "upgradeWeapons":
    case "upgradeArmor":
    case "trainSoldier":
    case "trainArcher":
    case "garrisonArcher":
    case "ungarrisonArcher":
    case "attackCreature":
    case "stockRanch":
    case "equipSoldier":
    case "sellResource":
    case "buyResource":
    case "buySeeds":
    case "plantTree":
    case "relocateTownCenter":
    case "recruitVillager":
    case "research":
      executeVillage(village, command)
      break
    case "pause":
      if (typeof command.paused !== "boolean") throw new Error("Pausa inválida")
      command.paused ? worldActions.pause() : worldActions.resume()
      break
    case "speed":
      if (![1, 2, 4, 8, 10].includes(command.scale))
        throw new Error("Velocidade inválida")
      worldActions.setTimeScale(command.scale)
      break
    case "moveItem": {
      const size = inventoryStore.getState().slots.length
      if (!validIndex(command.from, size) || !validIndex(command.to, size))
        throw new Error("Slot inválido")
      inventoryActions.moveItem(command.from, command.to)
      break
    }
    case "useTool": {
      if (!validIndex(command.x, width) || !validIndex(command.y, height))
        throw new Error("Posição inválida")
      if (command.tool !== null && !tools.includes(command.tool))
        throw new Error("Ferramenta inválida")
      let item = null
      if (command.itemId !== null) {
        if (
          typeof command.itemId !== "string" ||
          !Object.hasOwn(ITEM_DEFINITIONS, command.itemId)
        )
          throw new Error("Item inválido")
        item = ITEM_DEFINITIONS[command.itemId]
        if (
          item.type !== ItemType.SEED ||
          !inventoryActions.hasItem(item.id, 1)
        )
          throw new Error("Sementes insuficientes")
      }
      const state = worldStore.getState()
      handleToolUse({
        mouseTile: { x: command.x, y: command.y },
        activeTool: command.tool,
        activeItem: item,
        activeItemQuantity: item
          ? inventoryActions.getItem(item.id)!.quantity
          : 0,
        entities: state.entities,
        tilledSoil: state.tilledSoil,
        FARM_WIDTH: width,
        FARM_HEIGHT: height,
        groundTiles,
        setGroundTiles: (tiles) => {
          groundTiles = tiles
        },
      })
      break
    }
    default:
      throw new Error("Comando desconhecido")
  }
}

export const startGame = () => {
  gameLoop.start()
  if (!villageTimer)
    villageTimer = setInterval(() => {
      const state = worldStore.getState()
      if (!state.isPaused) updateVillage(village, 0.2 * state.timeScale)
    }, 200)
}
export const stopGame = () => {
  gameLoop.stop()
  if (villageTimer) clearInterval(villageTimer)
  villageTimer = null
}
