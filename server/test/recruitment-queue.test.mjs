import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, migrateVillage, updateVillage } from "../dist/village.mjs"

test("aldeões entram na fila e chegam um por vez após 45 segundos", () => {
  const village = createVillage()
  village.economy.foundation = undefined
  village.resources.food = 200
  village.buildings.push({ id: "house-queue", kind: "house", x: 18, y: 20, width: 2, height: 2, level: 1, growth: 0 })
  const initial = village.units.length

  executeVillage(village, { type: "recruitVillager", amount: 5 })
  assert.equal(village.resources.food, 50)
  assert.deepEqual(village.recruitment, { remaining: 5, progress: 0 })
  assert.equal(village.units.length, initial)
  assert.throws(() => executeVillage(village, { type: "recruitVillager" }), /População/)

  updateVillage(village, 44)
  assert.equal(village.units.length, initial)
  assert.equal(Math.round(migrateVillage(structuredClone(village)).recruitment.progress), 44)
  updateVillage(village, 1)
  assert.equal(village.units.length, initial + 1)
  assert.deepEqual(village.recruitment, { remaining: 4, progress: 0 })
  updateVillage(village, 45)
  assert.equal(village.units.length, initial + 2)
  assert.deepEqual(village.recruitment, { remaining: 3, progress: 0 })
  updateVillage(village, 135)
  assert.equal(village.units.length, initial + 5)
  assert.deepEqual(village.recruitment, { remaining: 0, progress: 0 })
})
