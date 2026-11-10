import { BUILDING_UNLOCK_LEVEL } from "./config"
import type { AnimalKind, BuildingKind, Crop, Research, Resource, VillageState } from "./types"

export const ERA_NAMES = { 1: "Fundação", 2: "Comércio", 3: "Fortaleza", 4: "Reino", 5: "Império" } as const
export const townLevel = (village: VillageState) =>
  village.buildings.find((building) => building.kind === "townCenter")?.level ?? 1

export function villageEra(village: VillageState): 1 | 2 | 3 | 4 | 5 {
  const level = townLevel(village)
  return level >= 8 ? 5 : level >= 6 ? 4 : level >= 4 ? 3 : level >= 2 ? 2 : 1
}

type Unlock =
  | { kind: "building"; value: Exclude<BuildingKind, "townCenter"> }
  | { kind: "crop"; value: Crop }
  | { kind: "animal"; value: AnimalKind }
  | { kind: "resource"; value: Resource }
  | { kind: "research"; value: Research; level: number }
  | { kind: "house"; level: number }
  | { kind: "market" | "recruit" | "armor" }

export function unlockReason(village: VillageState, unlock: Unlock): string | null {
  const era = villageEra(village)
  const foundation = village.economy.foundation
  if (unlock.kind === "building") {
    const level = unlock.value === "tower" && foundation ? 4 : BUILDING_UNLOCK_LEVEL[unlock.value]
    if (townLevel(village) < level) return `Requer Centro da Vila nível ${level}.`
  }
  if (!foundation) return null

  const commerce = "Avance para a Era do Comércio."
  if (unlock.kind === "market" && era < 2) return commerce
  if (unlock.kind === "armor" && era < 3) return "Avance para a Era da Fortaleza."
  if (unlock.kind === "house" && unlock.level > era) return unlock.level === 3
    ? "Avance para a Era da Fortaleza."
    : commerce
  if (unlock.kind === "research" && era < 2 && (
    unlock.level > 1 || unlock.value === "fertilizer" || unlock.value === "irrigation"
  )) return commerce
  if (unlock.kind === "crop" && unlock.value === "potato" && era < 2) return commerce
  if (unlock.kind === "animal" && unlock.value !== "pig" && era < 2) return commerce
  if (unlock.kind === "resource" && (unlock.value === "iron" || unlock.value === "gold")) {
    if (era < 2) return commerce
    if (unlock.value === "gold" && village.research.workers < 1) return "Pesquise Cestos de coleta para minerar ouro."
  }
  if (era > 1 || (foundation.firstDelivery && foundation.harvestedFood > 0)) return null
  if (
    unlock.kind === "recruit" || unlock.kind === "animal" ||
    (unlock.kind === "crop" && unlock.value === "wheat") ||
    (unlock.kind === "building" && (unlock.value === "well" || unlock.value === "ranch"))
  ) return "Entregue uma carga no celeiro e conclua a primeira colheita."
  return null
}

export function commerceGoals(village: VillageState) {
  const foundation = village.economy.foundation
  if (!foundation || villageEra(village) !== 1) return []
  const hasBuilding = (kind: BuildingKind) =>
    village.buildings.some((building) => building.kind === kind && !building.construction)
  const workers = village.units.filter((unit) =>
    unit.kind === "villager" && ["gather", "farm", "ranch"].includes(unit.job.kind),
  ).length
  return [
    { label: "Casa pronta", done: hasBuilding("house") },
    { label: "Celeiro pronto", done: hasBuilding("barn") },
    { label: `Aldeões produzindo (${Math.min(workers, 2)}/2)`, done: workers >= 2 },
    { label: `Comida colhida (${Math.min(foundation.harvestedFood, 60)}/60)`, done: foundation.harvestedFood >= 60 },
  ]
}
