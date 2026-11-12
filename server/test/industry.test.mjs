import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, updateVillage, migrateVillage, placementError } from "../dist/village.mjs"

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

test("serralheria produz tábuas e palanques, acelera em três níveis e abastece construções", () => {
  const village = setupIndustry()
  village.buildings.push({ id: "sawmill", kind: "sawmill", x: 18, y: 4, width: 3, height: 3, level: 1, growth: 0 })
  executeVillage(village, { type: "craftItem", buildingId: "sawmill", item: "planks", amount: 2 })
  assert.equal(village.resources.wood, 384)
  updateVillage(village, 48)
  assert.equal(village.crafts.planks, 8)
  executeVillage(village, { type: "craftItem", buildingId: "sawmill", item: "posts", amount: 2 })
  updateVillage(village, 60)
  assert.equal(village.crafts.posts, 6)
  executeVillage(village, { type: "upgradeSawmill", buildingId: "sawmill" })
  assert.equal(village.crafts.planks, 0)
  assert.equal(village.crafts.posts, 2)
  assert.throws(() => executeVillage(village, { type: "craftItem", buildingId: "sawmill", item: "planks" }), /melhorada/)
  updateVillage(village, 180)
  assert.equal(village.buildings.find((building) => building.id === "sawmill").level, 2)
  executeVillage(village, { type: "craftItem", buildingId: "sawmill", item: "planks" })
  assert.equal(village.buildings.find((building) => building.id === "sawmill").production.duration, 18)
  updateVillage(village, 18)
  village.crafts.planks = 16
  village.crafts.posts = 8
  executeVillage(village, { type: "upgradeSawmill", buildingId: "sawmill" })
  updateVillage(village, 300)
  assert.equal(village.buildings.find((building) => building.id === "sawmill").level, 3)
  executeVillage(village, { type: "craftItem", buildingId: "sawmill", item: "posts" })
  assert.equal(village.buildings.find((building) => building.id === "sawmill").production.duration, 17)
  updateVillage(village, 17)
  assert.throws(() => executeVillage(village, { type: "upgradeSawmill", buildingId: "sawmill" }), /máximo/)

  const site = Array.from({ length: 80 * 80 }, (_, index) => ({ x: index % 80, y: Math.floor(index / 80) }))
    .find(({ x, y }) => !placementError(village, "gate", x, y))
  assert.ok(site)
  const before = village.resources.wood
  assert.throws(() => executeVillage(village, { type: "build", kind: "gate", ...site }), /tábuas ou palanques/)
  assert.equal(village.resources.wood, before)
  village.crafts.planks = 4
  village.crafts.posts = 2
  executeVillage(village, { type: "build", kind: "gate", ...site })
  assert.equal(village.crafts.planks, 0)
  assert.equal(village.crafts.posts, 0)
})

test("salvamentos anteriores recebem estoques vazios de tábuas e palanques", () => {
  const oldSave = createVillage()
  delete oldSave.crafts.planks
  delete oldSave.crafts.posts
  const restored = migrateVillage(oldSave)
  assert.equal(restored.crafts.planks, 0)
  assert.equal(restored.crafts.posts, 0)
})

test("serralheria pode ser construída na vila inicial", () => {
  const village = createVillage()
  const builder = village.units.find((unit) => unit.kind === "villager")
  assert.equal(village.buildings.find((building) => building.kind === "townCenter").level, 1)
  assert.equal(placementError(village, "sawmill", 30, 30), null)
  executeVillage(village, { type: "build", kind: "sawmill", x: 30, y: 30, unitId: builder.id })
  assert.equal(village.buildings.at(-1).kind, "sawmill")
  assert.equal(village.resources.wood, 25)
  assert.equal(village.resources.stone, 20)
})
