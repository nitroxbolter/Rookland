/**
 * Farm Storage Service
 *
 * Handles saving/loading multiple farms through the server API
 * and sharing via URL with Base64 encoding.
 */

import type { GroundTile } from "@/engine/autotiling/groundAutotiling"
import type { Entity } from "@/engine/interfaces/entity"

import { api } from "./gameClient"
import type { FarmSaveData, FarmListItem } from "../../../shared/protocol"
export type { FarmSaveData, FarmListItem } from "../../../shared/protocol"

// Layout drafts stay in the editor until saved. Saved farms live on the server.
export async function saveFarm(
  id: string,
  name: string,
  groundTiles: Map<string, GroundTile>,
  entities: Entity[],
  width: number,
  height: number,
): Promise<FarmSaveData> {
  return api(`/farms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      name,
      data: { groundTiles: [...groundTiles], entities, width, height },
    }),
  })
}

export async function loadFarm(id: string): Promise<FarmSaveData | null> {
  return api(`/farms/${encodeURIComponent(id)}`)
}

export async function listFarms(): Promise<FarmListItem[]> {
  return api("/farms")
}
export async function deleteFarm(id: string): Promise<void> {
  await api(`/farms/${encodeURIComponent(id)}`, { method: "DELETE" })
}

/**
 * Convert GroundTile entries back to Map
 */
export function entriesToGroundTiles(
  entries: [string, GroundTile][],
): Map<string, GroundTile> {
  return new Map(entries)
}

// ============ URL SHARING ============

/**
 * Create a shareable URL for a farm
 * Returns null if data is too large
 */
export function createShareUrl(farm: FarmSaveData): string | null {
  try {
    const json = JSON.stringify(farm)
    const base64 = btoa(encodeURIComponent(json))

    // Check URL length limit (~2000 chars safe)
    if (base64.length > 1800) {
      console.warn("Farm data too large for URL sharing")
      return null
    }

    const url = new URL(window.location.href)
    url.hash = `farm=${base64}`
    return url.toString()
  } catch (e) {
    console.error("Failed to create share URL:", e)
    return null
  }
}

/**
 * Parse farm data from current URL hash
 */
export function parseFarmFromUrl(): FarmSaveData | null {
  try {
    const hash = window.location.hash
    if (!hash.startsWith("#farm=")) return null

    const base64 = hash.slice(6) // Remove "#farm="
    const json = decodeURIComponent(atob(base64))
    return JSON.parse(json) as FarmSaveData
  } catch (e) {
    console.error("Failed to parse farm from URL:", e)
    return null
  }
}

/**
 * Download farm as JSON file (fallback for large farms)
 */
export function downloadFarmAsFile(farm: FarmSaveData): void {
  const json = JSON.stringify(farm, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `${farm.name.replace(/[^a-z0-9]/gi, "_")}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import farm from JSON file
 */
export function importFarmFromFile(file: File): Promise<FarmSaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const farm = JSON.parse(json) as FarmSaveData
        resolve(farm)
      } catch (err) {
        reject(new Error("Invalid farm file"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Generate a new unique farm ID
 */
export function generateFarmId(): string {
  return crypto.randomUUID()
}
