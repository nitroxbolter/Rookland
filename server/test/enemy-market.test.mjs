import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, migrateVillage, placementError, updateVillage, validateVillage } from "../dist/village.mjs"

test("a ilha cresce ao sul e salva a facção rival sem deslocar a vila", () => {
  const village = createVillage()
  assert.equal(village.width, 80)
  assert.equal(village.height, 160)
  assert.deepEqual([village.buildings[0].x, village.buildings[0].y], [38, 36])
  assert.ok(village.nodes.some((node) => node.y > 100))
  assert.equal(village.enemy.level, 1)
  assert.equal(validateVillage(village).height, 160)
  assert.equal(validateVillage(migrateVillage(village)).height, 160)
  assert.match(placementError(village, "house", village.enemy.base.x, village.enemy.base.y), /acampamento rival/)

  const old = structuredClone(village)
  old.height = 80
  old.nodes = old.nodes.filter((node) => node.y < 80)
  delete old.enemy
  const migrated = migrateVillage(old)
  assert.equal(migrated.height, 160)
  assert.deepEqual([migrated.buildings[0].x, migrated.buildings[0].y], [38, 36])
  assert.ok(migrated.enemy.units.length > 0)
  assert.ok(migrated.nodes.some((node) => node.y > 100))
})

test("rivais coletam, avançam e só revidam depois de receber um golpe", () => {
  const village = createVillage()
  village.creatureSpawnAt = 100_000
  const hero = village.units.find((unit) => unit.kind === "hero")
  hero.x = 39
  hero.y = 123
  const guard = village.enemy.units.find((unit) => unit.kind === "soldier")
  updateVillage(village, 5)
  assert.equal(hero.health, 100)
  assert.equal(village.enemy.hostileTo, undefined)
  executeVillage(village, { type: "attackEnemy", unitId: hero.id, enemyId: guard.id })
  updateVillage(village, 6)
  assert.ok(guard.health < guard.maxHealth)
  assert.ok(hero.health < 100)
  assert.equal(village.enemy.hostileTo, hero.id)

  const peaceful = createVillage()
  peaceful.creatureSpawnAt = 100_000
  updateVillage(peaceful, 120)
  assert.equal(peaceful.enemy.level, 2)
  assert.ok(peaceful.enemy.units.filter((unit) => unit.kind !== "villager").length >= 2)
  assert.ok(peaceful.enemy.units.some((unit) => unit.resource === "iron"))
  assert.equal(peaceful.enemy.hostileTo, undefined)
  updateVillage(peaceful, 1080)
  assert.equal(peaceful.enemy.level, 3)
  assert.ok(peaceful.enemy.units.some((unit) => unit.resource === "gold"))
  assert.equal(validateVillage(peaceful).enemy.level, 3)
})

test("aldeão rival segue a rota continuamente entre decisões da IA", () => {
  const village = createVillage()
  village.creatureSpawnAt = 100_000
  const worker = village.enemy.units.find((unit) => unit.id === "enemy-wood")
  const positions = []
  for (let step = 0; step < 10; step++) {
    updateVillage(village, 0.2)
    positions.push([worker.x, worker.y])
  }
  assert.ok(worker.path.length > 0)
  for (let index = 1; index < positions.length; index++) {
    const [x, y] = positions[index]
    const [previousX, previousY] = positions[index - 1]
    assert.ok(Math.abs(x - previousX) + Math.abs(y - previousY) > 0.15)
  }
})

test("atacar um guarda alerta soldados próximos, mas não os distantes", () => {
  const village = createVillage()
  village.creatureSpawnAt = 100_000
  const guard = village.enemy.units.find((unit) => unit.kind === "soldier")
  village.enemy.units.push(
    { ...structuredClone(guard), id: "near-guard", x: 41, y: 122, path: [] },
    { ...structuredClone(guard), id: "far-guard", x: 56, y: 125, path: [] },
  )
  const hero = village.units.find((unit) => unit.kind === "hero")
  hero.x = 39
  hero.y = 123
  executeVillage(village, { type: "attackEnemy", unitId: hero.id, enemyId: guard.id })
  updateVillage(village, 1.6)
  assert.equal(village.enemy.units.find((unit) => unit.id === "near-guard").job, "defend")
  assert.equal(village.enemy.units.find((unit) => unit.id === "near-guard").targetId, hero.id)
  assert.equal(village.enemy.units.find((unit) => unit.id === "far-guard").job, "guard")
  assert.equal(village.enemy.units.find((unit) => unit.id === "far-guard").targetId, undefined)
})

test("mercado compra e vende com o mesmo estoque de ouro minerado", () => {
  const village = createVillage()
  village.buildings.find((building) => building.kind === "townCenter").level = 2
  village.resources.gold = 0
  village.resources.wood = 100
  const treasury = village.city.treasury
  executeVillage(village, { type: "sellResource", resource: "wood", amount: 10 })
  assert.equal(village.resources.gold, 2)
  assert.equal(village.city.treasury, treasury)
  assert.throws(() => executeVillage(village, { type: "buyResource", resource: "wood", amount: 10 }), /Ouro insuficiente/)
  village.resources.gold = 4
  executeVillage(village, { type: "buyResource", resource: "wood", amount: 10 })
  assert.equal(village.resources.gold, 0)
  assert.equal(village.resources.wood, 100)
  village.resources.gold = 10
  executeVillage(village, { type: "buySeeds", seed: "carrot", amount: 5 })
  assert.equal(village.resources.gold, 5)
  assert.throws(() => executeVillage(village, { type: "mintGold", amount: 10 }), /diretamente/)
})
