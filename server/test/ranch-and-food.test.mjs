import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, migrateVillage, updateVillage } from "../dist/village.mjs"

test("curral reproduz automaticamente a partir de um animal até o limite do nível", () => {
  const village = createVillage()
  village.buildings.find((building) => building.kind === "townCenter").level = 2
  village.resources.food = 500
  const pen = { id: "auto-pen", kind: "ranch", x: 7, y: 7, width: 2, height: 2, level: 1, growth: 0, ranch: { kind: null, animals: [] } }
  village.buildings.push(pen)
  executeVillage(village, { type: "stockRanch", buildingId: pen.id, animal: "sheep" })
  assert.equal(pen.ranch.animals.length, 1)
  const worker = village.units.find((unit) => unit.kind === "villager")
  executeVillage(village, { type: "assignUnit", unitId: worker.id, targetId: pen.id })
  updateVillage(village, 600)
  assert.equal(pen.ranch.animals.length, 2)
  updateVillage(village, 600)
  assert.equal(pen.ranch.animals.length, 2)
  pen.level = 2
  updateVillage(village, 1200)
  assert.equal(pen.ranch.animals.length, 4)
})

test("fazenda continua produzindo mesmo depois que acaba o estoque de sementes", () => {
  const village = createVillage()
  village.seeds.carrot = 0
  village.resources.food = 0
  const farm = village.buildings.find((building) => building.kind === "farm")
  farm.farmCycle.seedPaid = false // partida salva com o ciclo antigo
  const restored = migrateVillage(village)
  assert.equal(restored.resources.food, 100)
  const worker = restored.units.find((unit) => unit.kind === "villager")
  executeVillage(restored, { type: "assignUnit", unitId: worker.id, targetId: farm.id })
  updateVillage(restored, 120)
  assert.ok(restored.resources.food > 0)
  assert.equal(restored.seeds.carrot, 0)
})

test("curral exige aldeão, amadurece e guarda comida e lã separadamente", () => {
  const village = createVillage()
  village.resources.food = 300
  village.buildings.push({ id: "pen", kind: "ranch", x: 7, y: 7, width: 2, height: 2, level: 1, growth: 0, ranch: { kind: null, animals: [] } })
  executeVillage(village, { type: "stockRanch", buildingId: "pen", animal: "sheep", amount: 2 })
  assert.equal(village.resources.food, 240)
  updateVillage(village, 160)
  assert.equal(village.animalProducts.wool, 0)
  const worker = village.units.find((unit) => unit.kind === "villager")
  executeVillage(village, { type: "assignUnit", unitId: worker.id, targetId: "pen" })
  updateVillage(village, 50)
  assert.equal(village.buildings.find((building) => building.id === "pen").ranch.animals.length, 0)
  assert.equal(village.animalProducts.wool, 16)
  assert.ok(village.resources.food >= 300)
})

test("oficina e quartel produzem em lotes com custo integral antecipado", () => {
  const village = createVillage()
  village.resources.iron = 100
  village.resources.wood = 100
  village.buildings.push({ id: "forge", kind: "blacksmith", x: 4, y: 4, width: 3, height: 3, level: 1, growth: 0 })
  executeVillage(village, { type: "craftItem", buildingId: "forge", item: "nails", amount: 3 })
  assert.equal(village.resources.iron, 76)
  updateVillage(village, 60)
  assert.equal(village.crafts.nails, 15)
  assert.equal(village.buildings.find((building) => building.id === "forge").production, undefined)
  village.buildings.push(
    { id: "home", kind: "house", x: 8, y: 4, width: 2, height: 2, level: 2, growth: 0 },
    { id: "barracks", kind: "barracks", x: 4, y: 8, width: 3, height: 3, level: 1, growth: 0 },
  )
  village.resources.food = 200
  village.resources.gold = 100
  village.crafts.weapons = 2
  village.crafts.clothing = 2
  executeVillage(village, { type: "trainSoldier", buildingId: "barracks", amount: 2 })
  assert.equal(village.resources.food, 110)
  updateVillage(village, 120)
  assert.equal(village.units.filter((unit) => unit.kind === "soldier").length, 2)
})

test("tecelagem usa lã e o limite do leite não ocupa o limite da lã", () => {
  const village = createVillage()
  village.resources.wood = 100
  village.animalProducts = { milk: 100, wool: 8 }
  village.buildings.push({ id: "loom", kind: "weaving", x: 4, y: 4, width: 3, height: 3, level: 1, growth: 0 })
  executeVillage(village, { type: "craftItem", buildingId: "loom", item: "cloth", amount: 2 })
  assert.equal(village.animalProducts.wool, 0)
  assert.equal(village.animalProducts.milk, 100)
  updateVillage(village, 60)
  assert.equal(village.crafts.cloth, 6)
})

test("celeiro cheio de comida ainda recebe lã da ovelha", () => {
  const village = createVillage()
  village.resources.food = 100
  village.buildings.push({ id: "pen", kind: "ranch", x: 7, y: 7, width: 2, height: 2, level: 1, growth: 0, ranch: { kind: null, animals: [] } })
  executeVillage(village, { type: "stockRanch", buildingId: "pen", animal: "sheep" })
  village.resources.food = 500
  const worker = village.units.find((unit) => unit.kind === "villager")
  executeVillage(village, { type: "assignUnit", unitId: worker.id, targetId: "pen" })
  updateVillage(village, 180)
  assert.equal(village.animalProducts.wool, 8)
  assert.equal(village.buildings.find((building) => building.id === "pen").ranch.animals.length, 0)
})

test("consumo de comida é cobrado a cada dez minutos", () => {
  const village = createVillage()
  village.resources.food = 20
  updateVillage(village, 599)
  assert.equal(village.resources.food, 20)
  updateVillage(village, 1)
  assert.equal(village.resources.food, 18) // explorador e aldeão
})
