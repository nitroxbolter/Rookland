import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createVillage,
  executeVillage as command,
  updateVillage as advance,
  migrateVillage,
  validateVillage,
} from "../dist/village.mjs"

function supplied() {
  const s = createVillage()
  s.resources = { wood: 1000, stone: 1000, food: 1000, iron: 1000, gold: 0 }
  return s
}

test("pesquisas do centro urbano levam 1, 3 e 5 minutos de jogo", () => {
  const s = supplied()
  for (const [level, duration] of [[1, 60], [2, 180], [3, 300]]) {
    command(s, { type: "research", research: "agriculture" })
    assert.equal(s.research.agriculture, level - 1)
    assert.equal(s.improvements[0].targetLevel, level)
    assert.equal(s.improvements[0].finishAt - s.improvements[0].startedAt, duration)
    const paid = structuredClone(s.resources)
    assert.throws(() => command(s, { type: "research", research: "agriculture" }), /andamento/)
    assert.deepEqual(s.resources, paid)
    advance(s, duration - 0.2)
    assert.equal(s.research.agriculture, level - 1)
    advance(s, 0.2)
    assert.equal(s.research.agriculture, level)
    assert.equal(s.improvements.length, 0)
  }
})

test("melhoria do celeiro só amplia o estoque quando a barra termina", () => {
  const s = supplied()
  command(s, { type: "upgradeBarn", buildingId: "starter-barn" })
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 1)
  const saved = migrateVillage(JSON.parse(JSON.stringify(s)))
  assert.deepEqual(saved, s)
  advance(s, 179.8)
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 1)
  advance(s, 0.2)
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 2)
  command(s, { type: "upgradeBarn", buildingId: "starter-barn" })
  advance(s, 300)
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 3)
})

test("melhorias independentes avançam juntas e salvamentos inválidos são rejeitados", () => {
  const s = supplied()
  command(s, { type: "research", research: "workers" })
  command(s, { type: "research", research: "agriculture" })
  command(s, { type: "upgradeBarn", buildingId: "starter-barn" })
  advance(s, 60)
  assert.equal(s.research.workers, 1)
  assert.equal(s.research.agriculture, 1)
  assert.equal(s.buildings.find((b) => b.id === "starter-barn").level, 1)
  assert.equal(s.improvements.length, 1)
  const invalid = structuredClone(s)
  invalid.improvements[0].finishAt = Infinity
  assert.throws(() => validateVillage(invalid), /melhoria/)
  command(s, { type: "demolishBarn", buildingId: "starter-barn" })
  assert.equal(s.improvements.length, 0)
})
