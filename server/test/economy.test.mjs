import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as rawCommand,
  updateVillage,
  migrateVillage,
  validateVillage,
} from "../dist/village.mjs"
const advance = (s, seconds) => updateVillage(s, seconds)
// Existing economy tests set up completed buildings; construction timing has dedicated tests.
function command(s, value) {
  const builder = value.type === "build"
    ? s.units.find((u) => u.id === (value.unitId ?? "villager-1"))
    : null
  const previousJob = builder && structuredClone(builder.job)
  rawCommand(s, value)
  if (value.type === "build") {
    const building = s.buildings.at(-1)
    delete building.construction
    if (builder) {
      builder.job = previousJob
      builder.status = "idle"
      builder.path = []
    }
  }
}
function rich() {
  const s = createVillage()
  s.resources = { wood: 1000, stone: 1000, food: 1000, iron: 1000, gold: 0 }
  return s
}
function crew(size) {
  const s = createVillage()
  s.resources.food = 200
  if (size > 2) command(s, { type: "build", kind: "house", x: 18, y: 20 })
  if (size > 4) command(s, { type: "build", kind: "house", x: 18, y: 22 })
  while (s.units.length < size) command(s, { type: "recruitVillager" })
  const farm = s.buildings.find((b) => b.kind === "farm")
  farm.growth = 0
  s.units.slice(0, size).forEach((u, i) => {
    command(s, { type: "assignUnit", unitId: u.id, targetId: farm.id })
    u.x = i % 2 === 0 ? farm.x : farm.x + 3
    u.y = i < 2 ? farm.y + 3 : farm.y
    u.path = []
  })
  return s
}
test("vários celeiros somam limites independentes e upgrades multiplicam cada estoque", () => {
  const s = rich()
  command(s, { type: "build", kind: "barn", x: 20, y: 24 })
  const initial = { ...s.resources }
  command(s, { type: "upgradeBarn", buildingId: "starter-barn" })
  assert.equal(s.resources.wood, initial.wood - 80)
  assert.equal(s.resources.stone, initial.stone - 50)
  assert.equal(s.resources.iron, initial.iron - 15)
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 1)
  advance(s, 180)
  command(s, { type: "upgradeBarn", buildingId: "starter-barn" })
  advance(s, 300)
  assert.throws(
    () => command(s, { type: "upgradeBarn", buildingId: "starter-barn" }),
    /máximo/,
  )
  s.resources = { wood: 2498, stone: 0, food: 0, iron: 0, gold: 0 }
  Object.assign(s.units[0], {
    x: 19,
    y: 14,
    carrying: { resource: "wood", amount: 8 },
  })
  advance(s, 0.2)
  assert.equal(
    s.resources.wood,
    2500,
    "2000 madeira do nível 3 + 500 do novo celeiro",
  )
  assert.equal(s.units[0].carrying.amount, 6)
})
test("destruir fazenda libera espaço e equipe, preserva cargas e não gera realocação ou reembolso", () => {
  const s = rich()
  command(s, { type: "upgradeFarm", buildingId: "starter-farm" })
  command(s, {
    type: "assignUnit",
    unitId: "villager-1",
    targetId: "starter-farm",
  })
  s.units[1].carrying = { resource: "food", amount: 7 }
  const before = { ...s.resources }
  command(s, { type: "demolishFarm", buildingId: "starter-farm" })
  assert.equal(s.units[1].job.kind, "idle")
  assert.equal(s.units[1].carrying.amount, 7)
  assert.equal(s.farmBlueprints.length, 0)
  assert.ok(!s.buildings.some((b) => b.id === "starter-farm"))
  assert.deepEqual(s.resources, before)
  assert.throws(
    () => command(s, { type: "demolishFarm", buildingId: "starter-farm" }),
    /encontrada/,
  )
  assert.throws(
    () =>
      command(s, {
        type: "placeFarm",
        blueprintId: "starter-farm",
        x: 16,
        y: 25,
      }),
    /desconhecido/,
  )
  command(s, { type: "build", kind: "farm", x: 11, y: 18 })
  assert.equal(
    s.resources.wood,
    before.wood - 15,
    "Reconstruir uma fazenda nova tem custo normal",
  )
})
test("somente o centro urbano realoca, validando obstáculos e preservando pesquisas e economia", () => {
  const s = rich()
  command(s, { type: "research", research: "agriculture" })
  const original = structuredClone(s)
  assert.throws(
    () => command(s, { type: "relocateTownCenter", x: 20, y: 14 }),
    /construção/,
  )
  assert.throws(
    () => command(s, { type: "relocateTownCenter", x: 0, y: 0 }),
    /terra/,
  )
  assert.deepEqual(s, original)
  command(s, { type: "relocateTownCenter", x: 20, y: 24 })
  const center = s.buildings.find((b) => b.kind === "townCenter")
  assert.deepEqual(
    [center.x, center.y, center.width, center.height],
    [20, 24, 4, 4],
  )
  assert.deepEqual(s.research, original.research)
  assert.deepEqual(s.resources, original.resources)
  assert.equal(s.units.length, original.units.length)
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(s))), s)
})
test("comida cheia não bloqueia outros recursos e cada carga respeita seu próprio limite", () => {
  for (const resource of ["wood", "stone", "iron", "gold"]) {
    const s = createVillage()
    s.units = s.units.filter((u) => u.kind === "hero")
    s.resources = { wood: 0, stone: 0, food: 500, iron: 0, gold: 0 }
    Object.assign(s.units[0], {
      x: 19,
      y: 14,
      carrying: { resource, amount: 8 },
    })
    advance(s, 0.2)
    assert.equal(s.resources.food, 500)
    assert.equal(s.resources[resource], 8)
    assert.equal(s.units[0].carrying, null)
  }
  const s = createVillage()
  s.units = s.units.filter((u) => u.kind === "hero")
  s.resources.food = 500
  Object.assign(s.units[0], {
    x: 19,
    y: 14,
    carrying: { resource: "food", amount: 8 },
  })
  advance(s, 0.2)
  assert.equal(s.resources.food, 500)
  assert.equal(s.units[0].carrying.amount, 8)
  assert.equal(s.units[0].status, "storageFull")
})

test("cada estoque inicial aceita exatamente seu próprio limite", () => {
  for (const [resource, limit] of Object.entries({
    food: 500,
    wood: 500,
    stone: 300,
    iron: 300,
    gold: 300,
  })) {
    const s = createVillage()
    s.units = s.units.filter((u) => u.kind === "hero")
    s.resources = { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 }
    Object.assign(s.units[0], {
      x: 19,
      y: 14,
      carrying: { resource, amount: limit + 1 },
    })
    advance(s, 0.2)
    assert.equal(s.resources[resource], limit)
    assert.equal(s.units[0].carrying.amount, 1)
    assert.equal(s.units[0].status, "storageFull")
  }
})
test("migração v2 preserva estoques e devolve investimento de antigas fazendas já desmontadas uma única vez", () => {
  const old = createVillage()
  old.version = 2
  old.farmBlueprints = [
    { id: "old-disassembled", crop: "wheat", level: 2, growth: 0 },
  ]
  const next = migrateVillage(old)
  assert.equal(next.version, 4)
  assert.equal(next.resources.wood, old.resources.wood + 50)
  assert.equal(next.resources.food, old.resources.food + 20)
  assert.equal(next.farmBlueprints.length, 0)
  assert.equal(old.farmBlueprints.length, 1)
  assert.deepEqual(migrateVillage(JSON.parse(JSON.stringify(next))), next)
})
test("máximo de quatro trabalhadores é validado no servidor e uma vaga pode ser liberada", () => {
  const s = crew(4)
  s.resources.food = 100
  command(s, { type: "build", kind: "house", x: 18, y: 22 })
  command(s, { type: "recruitVillager" })
  const fifth = s.units[4]
  assert.throws(
    () =>
      command(s, {
        type: "assignUnit",
        unitId: fifth.id,
        targetId: "starter-farm",
      }),
    /quatro/,
  )
  assert.equal(fifth.job.kind, "idle")
  command(s, {
    type: "assignUnit",
    unitId: s.units[0].id,
    targetId: "starter-farm",
  })
  command(s, { type: "stopUnit", unitId: s.units[0].id })
  command(s, { type: "assignUnit", unitId: fifth.id, targetId: "starter-farm" })
  assert.equal(s.units.filter((u) => u.job.kind === "farm").length, 4)
})
test("equipe maior acelera crescimento e todos os presentes participam da colheita", () => {
  const solo = crew(1)
  solo.units[1].job = { kind: "idle" }
  const four = crew(4)
  advance(solo, 8)
  advance(four, 8)
  const farm = (s) => s.buildings.find((b) => b.kind === "farm")
  assert.ok(farm(four).growth > farm(solo).growth)
  advance(four, 15)
  assert.equal(
    farm(four).productionLog[0].amount,
    24,
    "4 trabalhadores × 6 comidas",
  )
  assert.equal(farm(solo).productionLog?.length ?? 0, 0)
})
test("recrutamento cobra comida, nasce fora dos prédios e não cobra se não houver espaço", () => {
  const s = createVillage()
  command(s, { type: "build", kind: "house", x: 18, y: 20 })
  assert.throws(() => command(s, { type: "recruitVillager" }), /insuficientes/)
  s.resources.food = 50
  command(s, { type: "recruitVillager" })
  assert.equal(s.resources.food, 20)
  const born = s.units[2]
  assert.equal(born.kind, "villager")
  assert.ok(
    !s.buildings
      .filter((b) => b.kind !== "farm")
      .some(
        (b) =>
          born.x >= b.x &&
          born.x < b.x + b.width &&
          born.y >= b.y &&
          born.y < b.y + b.height,
      ),
  )
  s.resources.food = 100
  s.buildings = s.buildings.filter((b) => b.kind !== "townCenter")
  assert.throws(() => command(s, { type: "recruitVillager" }), /espaço/)
  assert.equal(s.resources.food, 100)
})
test("refeições são periódicas, proporcionais aos aldeões e nunca tornam comida negativa", () => {
  const s = createVillage()
  command(s, { type: "build", kind: "house", x: 18, y: 20 })
  advance(s, 29.8)
  assert.equal(s.resources.food, 20)
  advance(s, 0.2)
  assert.equal(s.resources.food, 19, "Explorador não tem manutenção")
  s.resources.food = 80
  command(s, { type: "recruitVillager" })
  advance(s, 30)
  assert.equal(s.resources.food, 48)
  s.resources.food = 1
  advance(s, 30)
  assert.equal(s.resources.food, 0)
  assert.equal(s.economy.foodShortage, true)
  s.resources.food = 10
  advance(s, 30)
  assert.equal(s.resources.food, 8)
  assert.equal(s.economy.foodShortage, false)
})
test("quatro pesquisas cobram custos, melhoram a vila inteira e param no nível 3", () => {
  const s = rich()
  for (const research of [
    "workers",
    "agriculture",
    "fertilizer",
    "irrigation",
  ]) {
    for (const seconds of [60, 180, 300]) {
      command(s, { type: "research", research })
      advance(s, seconds)
    }
    assert.equal(s.research[research], 3)
    assert.throws(() => command(s, { type: "research", research }), /máximo/)
  }
  assert.ok(s.resources.iron < 1000)
  assert.throws(
    () => command(s, { type: "research", research: "__proto__" }),
    /inválida/,
  )
  const basic = crew(1),
    improved = structuredClone(basic)
  improved.research = {
    workers: 3,
    agriculture: 3,
    fertilizer: 3,
    irrigation: 3,
  }
  for (const state of [basic, improved])
    state.buildings.find((b) => b.kind === "farm").farmCycle = {
      phase: "growing",
      progress: 0,
    }
  advance(basic, 20)
  advance(improved, 20)
  assert.ok(
    improved.buildings.find((b) => b.kind === "farm").productionLog[0].amount >
      6,
  )
  assert.equal(
    basic.buildings.find((b) => b.kind === "farm").productionLog?.length ?? 0,
    0,
  )
})
test("produção, pesquisas, alimentação e destruição de fazendas sobrevivem ao salvamento", () => {
  const s = rich()
  command(s, { type: "research", research: "fertilizer" })
  command(s, { type: "demolishFarm", buildingId: "starter-farm" })
  advance(s, 12)
  const saved = JSON.parse(JSON.stringify(s))
  assert.deepEqual(migrateVillage(saved), s)
  saved.research.workers = 9
  assert.throws(() => validateVillage(saved), /Economia/)
})
test("migração amplia fazendas antigas sem sobreposição e preserva recursos e melhorias", () => {
  const old = createVillage()
  old.version = 1
  delete old.research
  delete old.farmBlueprints
  delete old.economy
  const first = old.buildings.find((b) => b.kind === "farm")
  Object.assign(first, { x: 12, y: 18, width: 2, height: 2, level: 2 })
  old.buildings.push({ ...first, id: "old-2", x: 14, level: 3 })
  const before = JSON.parse(JSON.stringify(old))
  const migrated = migrateVillage(old)
  assert.equal(old.version, 1, "Migração não altera o objeto de entrada")
  assert.deepEqual(migrated.resources, before.resources)
  const farms = migrated.buildings.filter((b) => b.kind === "farm")
  assert.equal(farms.length + migrated.farmBlueprints.length, 2)
  assert.ok(farms.every((b) => b.width === 4 && b.height === 4))
  assert.deepEqual(farms.map((b) => b.level).sort(), [2, 3])
  assert.ok(
    !migrated.buildings.some((a, i) =>
      migrated.buildings
        .slice(i + 1)
        .some(
          (b) =>
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ),
    ),
  )
  assert.doesNotThrow(() => validateVillage(migrated))
})
