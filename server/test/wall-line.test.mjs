import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, executeVillage, updateVillage } from "../dist/village.mjs"

test("arrastar uma linha cobra todos os trechos e o aldeão constrói em sequência", () => {
  const village = createVillage()
  village.nodes = []
  const wood = village.resources.wood
  const stone = village.resources.stone
  executeVillage(village, { type: "buildWallLine", unitId: "villager-1", x1: 18, y1: 20, x2: 20, y2: 20 })
  const walls = village.buildings.filter((building) => building.kind === "wall")
  assert.deepEqual(walls.map(({ x, y }) => [x, y]), [[18, 20], [19, 20], [20, 20]])
  assert.equal(village.resources.wood, wood - 24)
  assert.equal(village.resources.stone, stone - 36)
  assert.equal(village.units.find((unit) => unit.id === "villager-1").wallQueue.length, 2)
  updateVillage(village, 120)
  assert.ok(walls.every((wall) => !wall.construction))
  assert.equal(village.units.find((unit) => unit.id === "villager-1").job.kind, "idle")
})

test("linha bloqueada é rejeitada sem gastar recursos", () => {
  const village = createVillage()
  const before = structuredClone(village.resources)
  assert.throws(() => executeVillage(village, { type: "buildWallLine", unitId: "villager-1", x1: 14, y1: 12, x2: 17, y2: 12 }), /construção/)
  assert.deepEqual(village.resources, before)
  assert.equal(village.buildings.filter((building) => building.kind === "wall").length, 0)
})

test("aldeão conclui muros pendentes de outra linha antes de ficar livre", () => {
  const village = createVillage()
  village.nodes = []
  village.resources = { wood: 400, stone: 400, food: 200, iron: 0, gold: 0 }
  executeVillage(village, { type: "buildWallLine", unitId: "villager-1", x1: 18, y1: 20, x2: 20, y2: 20 })
  updateVillage(village, 4)
  executeVillage(village, { type: "buildWallLine", unitId: "villager-1", x1: 18, y1: 22, x2: 20, y2: 22 })
  updateVillage(village, 180)
  assert.equal(village.buildings.filter((building) => building.kind === "wall" && building.construction).length, 0)
  assert.equal(village.units.find((unit) => unit.id === "villager-1").job.kind, "idle")
})

test("aldeão busca muros pendentes após construir outro tipo de estrutura", () => {
  const village = createVillage()
  village.nodes = []
  village.resources = { wood: 400, stone: 400, food: 200, iron: 0, gold: 0 }
  executeVillage(village, { type: "buildWallLine", unitId: "villager-1", x1: 18, y1: 20, x2: 20, y2: 20 })
  executeVillage(village, { type: "build", kind: "house", unitId: "villager-1", x: 24, y: 20 })
  updateVillage(village, 180)
  assert.ok(village.buildings.some((building) => building.kind === "house" && !building.construction))
  assert.equal(village.buildings.filter((building) => building.kind === "wall" && building.construction).length, 0)
  assert.equal(village.units.find((unit) => unit.id === "villager-1").job.kind, "idle")
})
