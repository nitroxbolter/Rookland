import { createStore } from "zustand/vanilla"
import { worldStore } from "@/engine/store"
import { buildItemsMap, inventoryStore } from "@/engine/inventoryStore"
import { dropsStore } from "@/engine/dropsStore"
import { useCropsGroundTilesStore } from "@/views/laboratory/crops/stores/cropsGroundTilesStore"
import type { GameCommand, WorldSnapshot } from "../../../shared/protocol"
import { villageStore } from "./villageStore"

export const connectionStore = createStore(() => ({
  connected: false,
  error: "Conectando ao servidor…",
}))

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Erro HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function sendCommand(command: GameCommand) {
  if (!connectionStore.getState().connected) return false
  try {
    await api("/commands", { method: "POST", body: JSON.stringify(command) })
    connectionStore.setState({ error: "" })
    return true
  } catch (error) {
    connectionStore.setState({
      error: error instanceof Error ? error.message : "Falha ao enviar ação",
    })
    return false
  }
}

export const remoteWorldActions = {
  togglePause: () => {
    void sendCommand({ type: "pause", paused: !worldStore.getState().isPaused })
  },
  setTimeScale: (scale: number) => {
    void sendCommand({ type: "speed", scale })
  },
}

export function connectGameServer() {
  const events = new EventSource("/api/events")
  let terrain = ""
  events.onmessage = (event) => {
    try {
      const state = JSON.parse(event.data) as WorldSnapshot
      if (state.village) villageStore.setState({ state: state.village })
      worldStore.setState({
        ...state.world,
        tilledSoil: new Map(state.world.tilledSoil),
      })
      inventoryStore.setState({
        slots: state.inventory,
        itemsMap: buildItemsMap(state.inventory),
      })
      dropsStore.setState({ items: state.drops })
      const nextTerrain = JSON.stringify(state.groundTiles)
      if (nextTerrain !== terrain) {
        terrain = nextTerrain
        useCropsGroundTilesStore
          .getState()
          .setGroundTiles(new Map(state.groundTiles))
      }
      connectionStore.setState({ connected: true })
      if (
        connectionStore.getState().error.startsWith("Conect") ||
        connectionStore.getState().error.startsWith("Sem conexão")
      ) {
        connectionStore.setState({ error: "" })
      }
    } catch {
      connectionStore.setState({
        connected: false,
        error: "Estado recebido inválido",
      })
    }
  }
  events.onerror = () =>
    connectionStore.setState({
      connected: false,
      error: "Sem conexão com o servidor. Reconectando…",
    })
  if (import.meta.hot) import.meta.hot.dispose(() => events.close())
}
