import { createStore } from "zustand/vanilla"
import type { VillageState } from "../../../shared/village/types"

export const villageStore = createStore<{ state: VillageState | null }>(() => ({
  state: null,
}))
