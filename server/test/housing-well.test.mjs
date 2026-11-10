import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as command,
  updateVillage as advance,
  placementError,
  migrateVillage,
  populationCapacity,
} from "../dist/village.mjs"

function supplied() {
  const s = createVillage()
  s.resources = { wood: 1000, stone: 1000, food: 1000, iron: 1000, gold: 100 }
  return s
}

test("casas de 2x2 liberam vagas 2, 6 e 15 só após cada melhoria", () => {
  const s = supplied()
  assert.throws(() => command(s, { type: "recruitVillager" }), /População/)
  command(s, { type: "build", kind: "house", x: 18, y: 20 })
  const house = s.buildings.find((b) => b.kind === "house")
  assert.deepEqual([house.width, house.height, house.level], [2, 2, 1])
  assert.equal(populationCapacity(s), 2)
  advance(s, 40)
  assert.equal(populationCapacity(s), 4)
  command(s, { type: "recruitVillager" })
  command(s, { type: "recruitVillager" })
  assert.equal(s.units.length, 4)
  assert.throws(() => command(s, { type: "recruitVillager" }), /População/)
  command(s, { type: "upgradeHouse", buildingId: house.id })
  assert.equal(house.level, 1)
  advance(s, 179.8)
  assert.throws(() => command(s, { type: "recruitVillager" }), /População/)
  advance(s, 0.2)
  assert.equal(house.level, 2)
  assert.equal(populationCapacity(s), 8)
  command(s, { type: "upgradeHouse", buildingId: house.id })
  advance(s, 300)
  assert.equal(house.level, 3)
  assert.equal(populationCapacity(s), 17)
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(s))), s)
  command(s, { type: "demolishHouse", buildingId: house.id })
  assert.equal(s.units.length, 4)
  assert.equal(populationCapacity(s), 2)
  assert.throws(() => command(s, { type: "recruitVillager" }), /População/)
})

test("centro urbano tem três visuais/níveis e pesquisa continua independente", () => {
  const s = supplied()
  const center = s.buildings.find((b) => b.kind === "townCenter")
  command(s, { type: "upgradeTownCenter" })
  command(s, { type: "research", research: "agriculture" })
  assert.equal(center.level, 1)
  advance(s, 60)
  assert.equal(s.research.agriculture, 1)
  assert.equal(center.level, 1)
  advance(s, 120)
  assert.equal(center.level, 2)
  command(s, { type: "upgradeTownCenter" })
  advance(s, 300)
  assert.equal(center.level, 3)
  assert.throws(() => command(s, { type: "upgradeTownCenter" }), /máximo/)
})

test("poço próximo dobra o crescimento, não acumula e pode ser destruído", () => {
  const base = supplied()
  const watered = supplied()
  const farm = (s) => s.buildings.find((b) => b.kind === "farm")
  command(watered, { type: "build", kind: "well", x: 15, y: 20 })
  advance(watered, 130)
  command(watered, { type: "build", kind: "well", x: 17, y: 20 })
  advance(watered, 130)
  for (const s of [base, watered]) {
    farm(s).farmCycle = { phase: "growing", progress: 0 }
    farm(s).growth = 0
  }
  advance(base, 10)
  advance(watered, 10)
  assert.ok(Math.abs(farm(watered).growth - farm(base).growth * 2) < 0.00001)
  const wells = watered.buildings.filter((b) => b.kind === "well")
  assert.deepEqual(wells.map((b) => [b.width, b.height]), [[2, 2], [2, 2]])
  command(watered, { type: "demolishWell", buildingId: wells[0].id })
  advance(base, 3)
  advance(watered, 3)
  assert.ok(Math.abs(farm(watered).growth - farm(base).growth * 2) < 0.00001)
  command(watered, { type: "demolishWell", buildingId: wells[1].id })
  const before = farm(watered).growth
  advance(watered, 3)
  assert.ok(Math.abs(farm(watered).growth - before - 0.1) < 0.00001)
  assert.ok(
    Array.from({ length: 28 * 28 }, (_, i) => ({ x: 2 + i % 28, y: 2 + Math.floor(i / 28) }))
      .some((p) => placementError(watered, "well", p.x, p.y)?.includes("perto")),
  )
})
