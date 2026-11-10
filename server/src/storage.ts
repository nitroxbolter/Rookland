import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { FarmSaveData } from "../../shared/protocol"

export function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw new Error(
      `Não foi possível ler ${file}. Preserve o arquivo antes de reparar.`,
      { cause: error },
    )
  }
}

export function writeJson(file: string, value: unknown) {
  writeFileSync(`${file}.tmp`, JSON.stringify(value), { mode: 0o600 })
  renameSync(`${file}.tmp`, file)
}

export function createStorage(directory: string) {
  mkdirSync(directory, { recursive: true })
  const file = join(directory, "farms.json")
  const farms = new Map(
    (readJson<FarmSaveData[]>(file) ?? []).map((f) => [f.id, f]),
  )
  return {
    list: () =>
      [...farms.values()].map(({ id, name, updatedAt }) => ({
        id,
        name,
        updatedAt,
      })),
    get: (id: string) => farms.get(id) ?? null,
    save: (id: string, value: FarmSaveData) => {
      if (
        !/^[a-zA-Z0-9_-]{1,80}$/.test(id) ||
        !value ||
        typeof value.name !== "string" ||
        !value.name.trim() ||
        value.name.length > 100 ||
        !value.data ||
        !Number.isInteger(value.data.width) ||
        value.data.width < 1 ||
        value.data.width > 256 ||
        !Number.isInteger(value.data.height) ||
        value.data.height < 1 ||
        value.data.height > 256 ||
        !Array.isArray(value.data.groundTiles) ||
        value.data.groundTiles.length > 65536 ||
        !Array.isArray(value.data.entities) ||
        value.data.entities.length > 10000 ||
        value.data.groundTiles.some(
          (entry) =>
            !Array.isArray(entry) ||
            entry.length !== 2 ||
            typeof entry[0] !== "string" ||
            !entry[1] ||
            !Array.isArray(entry[1].layers),
        ) ||
        value.data.entities.some(
          (entity) =>
            !entity ||
            typeof entity.id !== "string" ||
            !Number.isFinite(entity.x) ||
            !Number.isFinite(entity.y) ||
            !entity.sprite,
        )
      ) {
        throw new Error("Fazenda inválida (nome, dimensões ou conteúdo)")
      }
      const farm: FarmSaveData = {
        id,
        name: value.name.trim(),
        version: 1,
        createdAt: farms.get(id)?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        data: value.data,
      }
      const next = new Map(farms).set(id, farm)
      writeJson(file, [...next.values()])
      farms.set(id, farm)
      return farm
    },
    delete: (id: string) => {
      const next = new Map(farms)
      next.delete(id)
      writeJson(file, [...next.values()])
      farms.delete(id)
    },
  }
}
