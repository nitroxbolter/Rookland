import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as rawCommand,
  updateVillage,
  findPath,
  placementError,
  migrateVillage,
  validateVillage,
} from "../dist/village.mjs"

// These map/economy cases use finished structures; builder travel is covered separately.
function executeVillage(s, value) {
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

function advance(s, seconds) {
  for (let n = 0; n < seconds * 5; n++) updateVillage(s, 0.2)
}
test("vila começa com cabana 4x4, duas unidades, celeiro e fazenda 4x4", () => {
  const s = createVillage()
  assert.deepEqual(
    s.buildings
      .filter((b) => b.kind === "townCenter")
      .map((b) => [b.width, b.height]),
    [[4, 4]],
  )
  assert.equal(s.units.filter((u) => u.kind === "villager").length, 1)
  assert.equal(s.units.filter((u) => u.kind === "hero").length, 1)
  assert.ok(s.buildings.some((b) => b.kind === "barn"))
  assert.ok(
    s.buildings.some(
      (b) => b.kind === "farm" && b.width === 4 && b.height === 4,
    ),
  )
  assert.ok(
    ["tree", "rock", "iron", "gold"].every((kind) =>
      s.nodes.some((n) => n.kind === kind),
    ),
  )
})
test("mapa contém apenas pedras grandes e nenhum galho bloqueando construção", () => {
  const s = createVillage()
  assert.ok(!s.nodes.some((n) => n.kind === "branch"))
  assert.ok(
    s.nodes.filter((n) => n.kind === "rock").every((n) => n.variant % 3 === 0),
  )
  executeVillage(s, { type: "build", kind: "farm", x: 16, y: 20 })
  assert.ok(
    s.buildings.some((b) => b.kind === "farm" && b.x === 16 && b.y === 20),
  )
})
test("construção cobra custo e valida terreno, sobreposição, unidades e cultivo", () => {
  const s = createVillage()
  assert.throws(
    () => executeVillage(s, { type: "build", kind: "farm", x: 14, y: 12 }),
    /construção/,
  )
  assert.throws(
    () => executeVillage(s, { type: "build", kind: "farm", x: 0, y: 0 }),
    /terra/,
  )
  const occupied = structuredClone(s)
  occupied.nodes = []
  assert.throws(
    () =>
      executeVillage(occupied, { type: "build", kind: "farm", x: 16, y: 17 }),
    /unidade/,
  )
  assert.throws(
    () =>
      executeVillage(s, {
        type: "build",
        kind: "farm",
        crop: "__proto__",
        x: 17,
        y: 20,
      }),
    /Plantação/,
  )
  assert.throws(
    () => executeVillage(s, { type: "build", kind: "farm", x: 10.5, y: 10 }),
    /inválida/,
  )
  executeVillage(s, {
    type: "build",
    kind: "farm",
    x: 16,
    y: 25,
    crop: "wheat",
  })
  assert.equal(s.resources.wood, 65)
  assert.ok(
    s.buildings.some((b) => b.x === 16 && b.y === 25 && b.crop === "wheat"),
  )
  executeVillage(s, { type: "build", kind: "barn", x: 20, y: 24 })
  assert.equal(s.resources.wood, 5)
  assert.equal(s.resources.stone, 15)
  const count = s.buildings.length
  assert.throws(
    () => executeVillage(s, { type: "build", kind: "farm", x: 2, y: 26 }),
    /insuficientes/,
  )
  assert.equal(s.buildings.length, count)
})
test("aldeão caminha, colhe, entrega comida e repete a tarefa", () => {
  const s = createVillage()
  executeVillage(s, {
    type: "assignUnit",
    unitId: "villager-1",
    targetId: "starter-farm",
  })
  const worker = s.units.find((u) => u.id === "villager-1")
  updateVillage(s, 0.2)
  assert.notEqual(worker.x, 15)
  advance(s, 100)
  assert.ok(
    s.resources.food > 20,
    "Comida precisa chegar ao celeiro em mais de uma colheita",
  )
  assert.deepEqual(worker.job, { kind: "farm", targetId: "starter-farm" })
})
test("celeiro cheio retém a carga e novo celeiro retoma a entrega", () => {
  const s = createVillage()
  s.resources = { wood: 180, stone: 100, food: 500, iron: 0, gold: 0 }
  executeVillage(s, {
    type: "assignUnit",
    unitId: "villager-1",
    targetId: "starter-farm",
  })
  advance(s, 70)
  const worker = s.units.find((u) => u.id === "villager-1")
  assert.equal(worker.status, "storageFull")
  assert.equal(worker.carrying.resource, "food")
  assert.equal(s.resources.food, 500)
  executeVillage(s, { type: "build", kind: "barn", x: 20, y: 24 })
  advance(s, 80)
  assert.ok(s.resources.food > 506)
  assert.notEqual(worker.status, "storageFull")
})
test("recursos coletados por unidades só entram no estoque após entrega", () => {
  const s = createVillage()
  executeVillage(s, { type: "assignUnit", unitId: "hero", targetId: "rock-0" })
  advance(s, 8)
  assert.equal(s.resources.stone, 40, "Não depositar no início da coleta")
  advance(s, 80)
  assert.ok(s.resources.stone > 40)
  assert.ok(s.nodes.find((n) => n.id === "rock-0").amount < 60)
})
test("fazendas evoluem com custo até nível 3; não há teto artificial de quantidade", () => {
  const s = createVillage()
  s.resources = { wood: 10000, stone: 10000, food: 10000, iron: 0, gold: 0 }
  executeVillage(s, { type: "upgradeFarm", buildingId: "starter-farm" })
  advance(s, 180)
  executeVillage(s, { type: "upgradeFarm", buildingId: "starter-farm" })
  advance(s, 300)
  assert.equal(s.buildings.find((b) => b.id === "starter-farm").level, 3)
  assert.equal(s.resources.wood, 9905)
  assert.equal(s.resources.food, 9924)
  assert.throws(
    () =>
      executeVillage(s, { type: "upgradeFarm", buildingId: "starter-farm" }),
    /máximo/,
  )
  for (let y = 2; y < 28; y += 3)
    for (let x = 2; x < 28; x += 3) {
      if (!placementError(s, "farm", x, y))
        executeVillage(s, { type: "build", kind: "farm", x, y })
    }
  assert.ok(s.buildings.filter((b) => b.kind === "farm").length > 10)
})
test("rotas contornam construções e nova ordem no meio do caminho não atravessa paredes", () => {
  const s = createVillage()
  const route = findPath(s, { x: 13, y: 13 }, [{ x: 18, y: 13 }])
  assert.ok(route.length > 5)
  assert.ok(
    route.every((p) => !(p.x >= 14 && p.x < 18 && p.y >= 12 && p.y < 16)),
  )
  executeVillage(s, { type: "moveUnit", unitId: "hero", x: 18, y: 17 })
  updateVillage(s, 0.2)
  executeVillage(s, { type: "moveUnit", unitId: "hero", x: 19, y: 11 })
  advance(s, 20)
  assert.equal(s.units[0].x, 19)
  assert.equal(s.units[0].y, 11)
  assert.throws(
    () => executeVillage(s, { type: "moveUnit", unitId: "hero", x: 15, y: 13 }),
    /pode/,
  )
})
test("unidades contornam montanhas e estruturas sem atravessar plantações alheias", () => {
  const s = createVillage()
  const hero = s.units[0]
  s.units = [hero]
  hero.x = 30
  hero.y = 30
  s.nodes = []
  s.saplings = []
  s.buildings = [
    { id: "muro-teste", kind: "wall", x: 32, y: 30, width: 1, height: 1, level: 1, growth: 0 },
    { id: "fazenda-teste", kind: "farm", x: 35, y: 29, width: 2, height: 2, level: 1, growth: 0, crop: "carrot" },
  ]
  s.mapTiles = { "31-30": { surface: "grass", elevation: 1 } }
  for (const point of [{ x: 31, y: 30 }, { x: 32, y: 30 }, { x: 35, y: 30 }]) {
    assert.equal(findPath(s, hero, [point]), null)
    assert.throws(() => executeVillage(s, { type: "moveUnit", unitId: hero.id, ...point }), /pode/)
  }
  const route = findPath(s, hero, [{ x: 38, y: 30 }])
  assert.ok(route)
  assert.ok(route.every((point) => point.x !== 31 || point.y !== 30))
  assert.ok(route.every((point) => point.x !== 32 || point.y !== 30))
  assert.ok(route.every((point) => point.x < 35 || point.x >= 37 || point.y < 29 || point.y >= 31))
  const worker = { ...hero, x: 34, y: 28, job: { kind: "farm", targetId: "fazenda-teste" } }
  assert.ok(findPath(s, worker, [{ x: 35, y: 30 }]))
})
test("quatro aldeões trabalham na mesma fazenda e alcançam uma fazenda vizinha", () => {
  const s = createVillage()
  const original = s.units.find((unit) => unit.kind === "villager")
  s.nodes = []
  s.saplings = []
  s.buildings = [
    { id: "fazenda-1", kind: "farm", x: 30, y: 30, width: 4, height: 4, level: 1, growth: 0, crop: "carrot" },
    { id: "fazenda-2", kind: "farm", x: 34, y: 30, width: 4, height: 4, level: 1, growth: 0, crop: "wheat" },
  ]
  s.units = Array.from({ length: 5 }, (_, index) => ({
    ...structuredClone(original), id: `aldeao-${index + 1}`,
    x: 28, y: 28 + index, job: { kind: "idle" }, path: [], status: "idle",
  }))
  for (const worker of s.units.slice(0, 4))
    executeVillage(s, { type: "assignUnit", unitId: worker.id, targetId: "fazenda-1" })
  assert.equal(s.units.filter((unit) => unit.job.kind === "farm" && unit.job.targetId === "fazenda-1").length, 4)
  assert.throws(
    () => executeVillage(s, { type: "assignUnit", unitId: s.units[4].id, targetId: "fazenda-1" }),
    /quatro/,
  )
  executeVillage(s, { type: "assignUnit", unitId: s.units[4].id, targetId: "fazenda-2" })
  s.units[0].x = 30
  s.units[0].y = 32
  executeVillage(s, { type: "assignUnit", unitId: s.units[0].id, targetId: "fazenda-2" })
  assert.ok(findPath(s, s.units[0], [{ x: 34, y: 33 }]))
  assert.equal(s.units[0].job.targetId, "fazenda-2")
})
test("parar tarefa preserva a carga e entrega antes de ficar ocioso", () => {
  const s = createVillage()
  const worker = s.units[1]
  worker.carrying = { resource: "gold", amount: 4 }
  executeVillage(s, { type: "stopUnit", unitId: worker.id })
  advance(s, 20)
  assert.equal(s.resources.gold, 4)
  assert.equal(worker.carrying, null)
  assert.equal(worker.status, "idle")
})
