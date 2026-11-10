import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, updateVillage, migrateVillage } from "../dist/village.mjs"

function setupIndustry() {
  const village = createVillage()
  village.buildings.find((building) => building.kind === "townCenter").level = 3
  village.resources = { wood: 400, stone: 250, food: 400, iron: 250, gold: 250 }
  village.buildings.push(
    { id: "forge", kind: "blacksmith", x: 4, y: 4, width: 3, height: 3, level: 1, growth: 0 },
    { id: "loom", kind: "weaving", x: 8, y: 4, width: 3, height: 3, level: 1, growth: 0 },
    { id: "barracks", kind: "barracks", x: 12, y: 4, width: 3, height: 3, level: 1, growth: 0 },
  )
  return village
}

test("oficinas consomem materiais e entregam produtos só ao fim da produção", () => {
  const village = setupIndustry()
  executeVillage(village, { type: "craftItem", buildingId: "forge", item: "nails" })
  assert.equal(village.resources.iron, 242)
  assert.equal(village.crafts.nails, 0)
  assert.throws(() => executeVillage(village, { type: "craftItem", buildingId: "forge", item: "tools" }), /produzindo/)
  updateVillage(village, 19)
  assert.equal(village.crafts.nails, 0)
  updateVillage(village, 1)
  assert.equal(village.crafts.nails, 5)
  executeVillage(village, { type: "craftItem", buildingId: "forge", item: "tools" })
  updateVillage(village, 50)
  executeVillage(village, { type: "upgradeTools" })
  assert.equal(village.toolLevel, 0)
  assert.equal(village.improvements.find((item) => item.kind === "forge" && item.track === "tools").finishAt - village.economy.elapsed, 60)
  assert.throws(() => executeVillage(village, { type: "upgradeTools" }), /andamento/)
  assert.equal(village.crafts.tools, 0)
  village.crafts.weapons = 1
  village.crafts.armor = 1
  executeVillage(village, { type: "upgradeWeapons" })
  executeVillage(village, { type: "upgradeArmor" })
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(village))).improvements, village.improvements)
  assert.equal(village.weaponLevel, 0)
  assert.equal(village.armorLevel, 0)
  assert.equal(village.crafts.weapons, 0)
  assert.equal(village.crafts.armor, 0)
  updateVillage(village, 59.8)
  assert.equal(village.toolLevel, 0)
  updateVillage(village, 0.2)
  assert.equal(village.toolLevel, 1)
  assert.equal(village.weaponLevel, 1)
  assert.equal(village.armorLevel, 1)
  assert.equal(village.improvements.length, 0)
  village.resources = { wood: 1000, stone: 1000, food: 1000, iron: 1000, gold: 1000 }
  for (let level = 2; level <= 4; level++) {
    village.crafts.tools = 1
    village.crafts.weapons = 1
    village.crafts.armor = 1
    executeVillage(village, { type: "upgradeTools" })
    executeVillage(village, { type: "upgradeWeapons" })
    executeVillage(village, { type: "upgradeArmor" })
    updateVillage(village, [0, 0, 180, 300, 480][level])
    assert.equal(village.toolLevel, level)
    assert.equal(village.weaponLevel, level)
    assert.equal(village.armorLevel, level)
  }
  assert.throws(() => executeVillage(village, { type: "upgradeTools" }), /máximo/)
})

test("quartel treina soldado com roupa e arma, respeitando população", () => {
  const village = setupIndustry()
  assert.throws(() => executeVillage(village, { type: "trainSoldier", buildingId: "barracks" }), /arma e uma roupa/)
  village.crafts.weapons = 1
  village.crafts.clothing = 1
  executeVillage(village, { type: "trainSoldier", buildingId: "barracks" })
  assert.equal(village.crafts.weapons, 0)
  assert.equal(village.crafts.clothing, 0)
  assert.equal(village.units.length, 2)
  updateVillage(village, 60)
  assert.equal(village.units.length, 3)
  const soldier = village.units.find((unit) => unit.kind === "soldier")
  assert.ok(soldier)
  village.crafts.armor = 1
  executeVillage(village, { type: "equipSoldier", unitId: soldier.id })
  assert.equal(soldier.armored, true)
  assert.equal(village.crafts.armor, 0)
})
