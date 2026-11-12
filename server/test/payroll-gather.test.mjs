import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage, executeVillage, gatherCarryCapacity, migrateVillage,
  soldierDamage, storageCapacities, updateVillage,
} from "../dist/village.mjs"

test("carga e tempo de extração variam por recurso", () => {
  const village = createVillage()
  village.creatureSpawnAt = 100_000
  const worker = village.units.find((unit) => unit.kind === "villager")
  village.nodes = [{ id: "test-tree", kind: "tree", x: 15, y: 19, amount: 80, variant: 0 }]
  worker.job = { kind: "gather", targetId: "test-tree" }
  worker.x = 15
  worker.y = 18
  worker.path = []
  updateVillage(village, 1.8)
  assert.equal(village.nodes[0].amount, 80)
  updateVillage(village, 0.2)
  assert.equal(village.nodes[0].amount, 79)
  assert.deepEqual(worker.gathering, { resource: "wood", amount: 1 })
  updateVillage(village, 2)
  assert.equal(worker.gathering.amount, 2)

  const first = { wood: 8, stone: 2, food: 8, iron: 8, gold: 1 }
  const maximum = { wood: 12, stone: 7, food: 15, iron: 10, gold: 6 }
  for (const resource of Object.keys(first))
    assert.equal(gatherCarryCapacity(village, resource), first[resource])
  village.research.workers = 3
  village.toolLevel = 4
  for (const resource of Object.keys(maximum))
    assert.equal(gatherCarryCapacity(village, resource), maximum[resource])

  village.nodes = [{ id: "test-gold", kind: "gold", x: 15, y: 19, amount: 240, variant: 0 }]
  worker.job = { kind: "gather", targetId: "test-gold" }
  worker.gathering = undefined
  worker.work = 0
  updateVillage(village, 3.8)
  assert.equal(village.nodes[0].amount, 240)
  updateVillage(village, 0.2)
  assert.equal(village.nodes[0].amount, 239)
  assert.deepEqual(worker.gathering, { resource: "gold", amount: 1 })
})

test("ração é cobrada por minuto, soma 50/100 por hora e soldo continua horário", () => {
  const village = createVillage()
  village.creatureSpawnAt = 100_000
  assert.equal(village.city.provisions.villagerFood, 50)
  assert.equal(village.city.provisions.soldierFood, 100)
  const soldier = { ...structuredClone(village.units[1]), id: "test-soldier", kind: "soldier", job: { kind: "idle" }, health: 110, maxHealth: 110 }
  village.units.push(soldier)
  village.resources.gold = 40
  village.resources.food = 500
  village.city.rationElapsed = 59.8
  updateVillage(village, 0.2)
  assert.equal(village.resources.food, 497)
  assert.equal(village.resources.gold, 40)
  assert.equal(village.city.lastPayroll.foodDue, 3)
  for (let minute = 1; minute < 60; minute++) updateVillage(village, 60)
  assert.equal(village.resources.food, 350)
  assert.equal(village.city.rationRemainder, 59)
  assert.equal(village.resources.gold, 40)
  assert.equal(soldierDamage(village, "soldier"), 14)

  village.resources.gold = 40
  village.city.payrollElapsed = 3599.8
  updateVillage(village, 0.2)
  assert.equal(village.resources.gold, 0)
  assert.equal(village.resources.food, 350)
  assert.equal(village.city.lastPayroll.goldDue, 40)
  assert.equal(village.city.lastPayroll.goldPaid, 40)

  executeVillage(village, { type: "setProvisions", provisions: {
    villagerGold: 20, villagerFood: 50, soldierGold: 40, soldierFood: 120,
  } })
  village.resources.gold = 60
  village.resources.food = 160
  village.city.rationElapsed = 59.8
  updateVillage(village, 0.2)
  assert.equal(village.city.lastPayroll.foodDue, 3)
  village.city.payrollElapsed = 3599.8
  updateVillage(village, 0.2)
  assert.equal(soldierDamage(village, "soldier"), 18)
  assert.equal(village.city.unpaidCycles, 0)

  village.resources.food = 0
  village.city.rationElapsed = 59.8
  updateVillage(village, 0.2)
  assert.equal(village.city.lastPayroll.foodServed, 0)
  village.city.payrollElapsed = 3599.8
  updateVillage(village, 0.2)
  assert.equal(village.city.lastPayroll.goldPaid, 0)
  assert.equal(soldierDamage(village, "soldier"), 8)
  assert.equal(village.city.unpaidCycles, 1)
  assert.throws(() => executeVillage(village, { type: "setProvisions", provisions: {
    villagerGold: 20, villagerFood: 50, soldierGold: 41, soldierFood: 120,
  } }), /inválidos/)
})

test("celeiro N8 atinge os novos limites e o save antigo recebe política padrão", () => {
  const village = createVillage()
  village.buildings.push({ ...village.buildings[0], id: "test-barn", kind: "barn", level: 8, width: 3, height: 3 })
  assert.equal(storageCapacities(village).gold, 100_000)
  assert.equal(storageCapacities(village).food, 50_000)
  const oldSave = structuredClone(village)
  delete oldSave.city.provisions
  delete oldSave.city.payrollElapsed
  delete oldSave.city.activeSoldierProvision
  delete oldSave.city.lastPayroll
  const restored = migrateVillage(oldSave)
  assert.equal(restored.city.provisions.soldierFood, 100)
  assert.equal(restored.city.payrollElapsed, 0)
  assert.equal(restored.city.rationElapsed, 0)
  assert.equal(restored.city.rationRemainder, 59)
})

test("migração atualiza a ração antiga sem substituir escolha feita na nova versão", () => {
  const legacy = createVillage()
  legacy.city.provisions.villagerFood = 40
  legacy.city.provisions.soldierFood = 80
  legacy.city.activeSoldierProvision.food = 80
  delete legacy.city.rationElapsed
  delete legacy.city.rationRemainder
  const upgraded = migrateVillage(legacy)
  assert.equal(upgraded.city.provisions.villagerFood, 50)
  assert.equal(upgraded.city.provisions.soldierFood, 100)
  assert.equal(upgraded.city.activeSoldierProvision.food, 100)
  const custom = createVillage()
  custom.city.provisions.villagerFood = 40
  custom.city.provisions.soldierFood = 80
  const preserved = migrateVillage(custom)
  assert.equal(preserved.city.provisions.villagerFood, 40)
  assert.equal(preserved.city.provisions.soldierFood, 80)
})
