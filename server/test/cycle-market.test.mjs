import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as command,
  updateVillage as advance,
  migrateVillage,
  placementError,
} from "../dist/village.mjs"

function workerInField() {
  const s = createVillage()
  s.units = s.units.filter((u) => u.kind === "hero")
  const farm = s.buildings.find((b) => b.kind === "farm")
  const u = s.units[0]
  command(s, { type: "assignUnit", unitId: u.id, targetId: farm.id })
  u.x = farm.x
  u.y = farm.y + 3
  u.path = []
  return { s, farm, u }
}
test("fazenda tem plantio, crescimento natural, colheita e entrega separados", () => {
  const { s, farm, u } = workerInField()
  advance(s, 7.8)
  assert.equal(farm.farmCycle.phase, "planting")
  assert.equal(farm.growth, 0)
  assert.equal(u.carrying, null)
  advance(s, 0.4)
  assert.equal(farm.farmCycle.phase, "growing")
  assert.equal(u.status, "waiting")
  advance(s, 29)
  assert.equal(farm.farmCycle.phase, "growing")
  assert.equal(s.resources.food, 20)
  advance(s, 1.2)
  assert.equal(farm.farmCycle.phase, "harvesting")
  assert.equal(u.carrying, null)
  advance(s, 5.8)
  assert.equal(farm.farmCycle.phase, "planting")
  assert.equal(u.carrying.resource, "food")
  assert.equal(
    s.resources.food,
    20,
    "Comida só entra após caminhar até o celeiro",
  )
  advance(s, 12)
  assert.equal(s.resources.food, 26)
})
test("sem trabalhador não há plantio ou colheita, mas plantas já plantadas crescem", () => {
  const { s, farm, u } = workerInField()
  command(s, { type: "stopUnit", unitId: u.id })
  advance(s, 15)
  assert.deepEqual(farm.farmCycle, { phase: "planting", progress: 0 })
  farm.farmCycle = { phase: "growing", progress: 0 }
  advance(s, 31)
  assert.equal(farm.farmCycle.phase, "harvesting")
  advance(s, 20)
  assert.equal(farm.farmCycle.progress, 0)
  assert.equal(s.resources.food, 20)
})
test("salvar no meio de uma fase não reinicia nem duplica a colheita", () => {
  const { s } = workerInField()
  advance(s, 40)
  const loaded = migrateVillage(JSON.parse(JSON.stringify(s)))
  advance(s, 20)
  advance(loaded, 20)
  assert.deepEqual(loaded, s)
})
test("nova ordem executa com carga antiga e conserva ambos os recursos", () => {
  const s = createVillage()
  const u = s.units[0]
  s.resources.food = 500
  Object.assign(u, {
    x: 7,
    y: 9,
    carrying: { resource: "food", amount: 8 },
  })
  command(s, { type: "assignUnit", unitId: u.id, targetId: "tree-0" })
  assert.equal(u.carrying, null)
  assert.deepEqual(u.stowed, { food: 8 })
  advance(s, 3.2)
  assert.deepEqual(u.carrying, { resource: "wood", amount: 8 })
  advance(s, 20)
  assert.ok(s.resources.wood > 80)
  assert.equal(s.resources.food, 500)
  assert.equal(u.stowed.food, 8)
  const loaded = migrateVillage(JSON.parse(JSON.stringify(s)))
  assert.deepEqual(loaded.units[0].stowed, { food: 8 })
  command(s, { type: "sellResource", resource: "food", amount: 10 })
  advance(s, 20)
  assert.equal(s.resources.food, 497)
  assert.equal(u.stowed, undefined)
})
test("mover uma unidade carregada não espera o celeiro", () => {
  const s = createVillage()
  const u = s.units[0]
  s.resources.food = 500
  u.carrying = { resource: "food", amount: 6 }
  command(s, { type: "moveUnit", unitId: u.id, x: 16, y: 19 })
  advance(s, 5)
  assert.deepEqual([u.x, u.y], [16, 19])
  assert.deepEqual(u.stowed, { food: 6 })
})
test("vender comida, madeira, pedra e ferro cobra estoque e entrega ouro na cotação", () => {
  const s = createVillage()
  s.resources = { wood: 100, stone: 100, food: 100, iron: 100, gold: 0 }
  for (const resource of ["food", "wood", "stone", "iron"])
    command(s, { type: "sellResource", resource, amount: 10 })
  assert.deepEqual(s.resources, {
    wood: 90,
    stone: 90,
    food: 90,
    iron: 90,
    gold: 11,
  })
})
test("vendas inválidas, sem saldo ou sem espaço para ouro são atômicas", () => {
  const s = createVillage()
  s.resources.food = 100
  const before = structuredClone(s)
  for (const amount of [
    -10,
    0,
    1,
    15,
    1.5,
    Infinity,
    "10",
    Number.MAX_SAFE_INTEGER,
  ]) {
    assert.throws(() =>
      command(s, { type: "sellResource", resource: "food", amount }),
    )
    assert.deepEqual(s, before)
  }
  for (const resource of ["gold", "__proto__", "unknown"])
    assert.throws(() =>
      command(s, { type: "sellResource", resource, amount: 10 }),
    )
  assert.throws(
    () => command(s, { type: "sellResource", resource: "iron", amount: 10 }),
    /insuficientes/,
  )
  s.resources.gold = 299
  const full = structuredClone(s)
  assert.throws(
    () => command(s, { type: "sellResource", resource: "food", amount: 50 }),
    /espaço/,
  )
  assert.deepEqual(s, full)
  command(s, { type: "sellResource", resource: "food", amount: 10 })
  assert.equal(s.resources.gold, 300)
  assert.equal(s.resources.food, 90)
})
test("destruir celeiro preserva estoque, remove colisão e reencaminha entregas", () => {
  const s = createVillage()
  s.resources = { wood: 100, stone: 40, food: 20, iron: 0, gold: 0 }
  Object.assign(s.units[0], {
    x: 23,
    y: 14,
    carrying: { resource: "stone", amount: 8 },
  })
  const stock = { ...s.resources }
  command(s, { type: "demolishBarn", buildingId: "starter-barn" })
  assert.deepEqual(s.resources, stock)
  assert.equal(placementError(s, "barn", 20, 14), null)
  advance(s, 0.2)
  assert.equal(s.units[0].status, "storageFull")
  assert.equal(s.units[0].carrying.amount, 8)
  assert.throws(
    () => command(s, { type: "demolishBarn", buildingId: "starter-barn" }),
    /encontrado/,
  )
  command(s, { type: "build", kind: "barn", x: 20, y: 14 })
  advance(s, 60)
  assert.equal(s.resources.stone, 23)
  assert.equal(s.units[0].carrying, null)
})
test("migração retira galhos e pedras pequenas e preserva cargas já coletadas", () => {
  const old = createVillage()
  old.version = 3
  old.nodes.push(
    { id: "old-branch", kind: "branch", x: 19, y: 20, amount: 8, variant: 0 },
    { id: "old-pebble", kind: "rock", x: 9, y: 15, amount: 31, variant: 1 },
  )
  old.units[0].job = { kind: "gather", targetId: "old-pebble" }
  old.units[0].carrying = { resource: "stone", amount: 3 }
  const farm = old.buildings.find((b) => b.kind === "farm")
  farm.growth = 0.5
  delete farm.farmCycle
  const migrated = migrateVillage(old)
  assert.equal(migrated.version, 4)
  assert.ok(
    !migrated.nodes.some((n) => n.kind === "branch" || n.id === "old-pebble"),
  )
  assert.ok(migrated.nodes.some((n) => n.id === "rock-0"))
  assert.deepEqual(migrated.units[0].carrying, { resource: "stone", amount: 3 })
  assert.equal(migrated.units[0].job.kind, "idle")
  assert.equal(
    migrated.buildings.find((b) => b.kind === "farm").farmCycle.phase,
    "growing",
  )
  assert.deepEqual(migrated.resources, old.resources)
  assert.ok(
    old.nodes.some((n) => n.id === "old-pebble"),
    "Migração não muda o objeto original",
  )
})
