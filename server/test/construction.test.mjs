import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as command,
  updateVillage as advance,
  migrateVillage,
} from "../dist/village.mjs"

test("aldeão anda até a obra, trabalha e só então ativa a construção", () => {
  const s = createVillage()
  s.resources = { wood: 300, stone: 200, food: 200, iron: 0, gold: 0 }
  const before = structuredClone(s.resources)
  assert.throws(
    () => command(s, { type: "build", kind: "house", x: 18, y: 20, unitId: "hero" }),
    /aldeão/,
  )
  assert.deepEqual(s.resources, before)
  command(s, { type: "build", kind: "house", x: 18, y: 20, unitId: "villager-1" })
  const house = s.buildings.find((b) => b.kind === "house")
  const worker = s.units.find((u) => u.id === "villager-1")
  assert.equal(worker.job.kind, "build")
  assert.equal(house.construction.duration, 30)
  assert.equal(s.resources.wood, 265)
  assert.equal(s.resources.stone, 190)
  advance(s, 10)
  assert.ok(house.construction.progress > 0)
  assert.ok(house.construction.progress < 30)
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(s))), s)
  advance(s, 35)
  assert.equal(house.construction, undefined)
  assert.equal(worker.job.kind, "idle")
})

test("construtor assume a fazenda pronta e inicia o plantio", () => {
  const s = createVillage()
  const worker = s.units.find((unit) => unit.kind === "villager")
  const farm = {
    id: "nova-fazenda", kind: "farm", x: 30, y: 30, width: 4, height: 4,
    level: 1, growth: 0, crop: "carrot",
    farmCycle: { phase: "planting", progress: 0, seedPaid: true },
    construction: { builderId: worker.id, progress: 0, duration: 1 },
  }
  s.nodes = []
  s.saplings = []
  s.buildings = [farm]
  s.units = [worker]
  worker.x = 29
  worker.y = 30
  worker.job = { kind: "build", targetId: farm.id }
  worker.path = []
  advance(s, 8)
  assert.equal(farm.construction, undefined)
  assert.deepEqual(worker.job, { kind: "farm", targetId: farm.id })
  assert.notEqual(worker.status, "blocked")
  assert.ok(farm.farmCycle.progress > 0 || farm.growth > 0)
})

test("poço exige 2 minutos de trabalho e uma obra pausada pode ser retomada", () => {
  const s = createVillage()
  s.resources = { wood: 300, stone: 200, food: 200, iron: 0, gold: 0 }
  command(s, { type: "build", kind: "well", x: 15, y: 20, unitId: "villager-1" })
  const well = s.buildings.find((b) => b.kind === "well")
  assert.equal(well.construction.duration, 120)
  advance(s, 20)
  const progress = well.construction.progress
  command(s, { type: "stopUnit", unitId: "villager-1" })
  advance(s, 20)
  assert.equal(well.construction.progress, progress)
  command(s, { type: "assignUnit", unitId: "villager-1", targetId: well.id })
  advance(s, 120)
  assert.equal(well.construction, undefined)
})

test("aldeões trabalham juntos na mesma obra e são liberados ao terminar", () => {
  const s = createVillage()
  s.resources = { wood: 500, stone: 300, food: 500, iron: 100, gold: 0 }
  command(s, { type: "build", kind: "house", x: 18, y: 20, unitId: "villager-1" })
  advance(s, 40)
  command(s, { type: "recruitVillager" })
  const second = s.units.find((u) => u.kind === "villager" && u.id !== "villager-1")
  assert.ok(second)

  command(s, { type: "build", kind: "barn", x: 21, y: 20, unitId: "villager-1" })
  const barn = s.buildings.find((b) => b.kind === "barn" && b.construction)
  assert.ok(barn)
  command(s, { type: "assignUnit", unitId: second.id, targetId: barn.id })
  assert.equal(s.units.find((u) => u.id === "villager-1").job.targetId, barn.id)
  assert.equal(second.job.targetId, barn.id)
  advance(s, 8)
  assert.equal(s.units.filter((u) => u.status === "building").length, 2)
  const before = barn.construction.progress
  advance(s, 5)
  assert.ok(Math.abs(barn.construction.progress - before - 10) < 0.001)

  command(s, { type: "stopUnit", unitId: second.id })
  const afterStop = barn.construction.progress
  advance(s, 5)
  assert.ok(Math.abs(barn.construction.progress - afterStop - 5) < 0.001)
  command(s, { type: "assignUnit", unitId: second.id, targetId: barn.id })
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(s))), s)
  advance(s, 45)
  assert.equal(barn.construction, undefined)
  assert.equal(s.units.find((u) => u.id === "villager-1").job.kind, "idle")
  assert.equal(second.job.kind, "idle")
})
