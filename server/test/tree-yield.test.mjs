import { test } from "node:test"
import assert from "node:assert/strict"
import { createVillage, migrateVillage, updateVillage } from "../dist/village.mjs"

test("árvores naturais, plantadas e salvas respeitam 80 madeiras", () => {
  const fresh = createVillage()
  const trees = fresh.nodes.filter((node) => node.kind === "tree")
  assert.ok(trees.length > 0)
  assert.ok(trees.every((node) => node.amount === 80))

  fresh.creatureSpawnAt = 100_000
  fresh.saplings.push({ id: "test-grown", x: 50, y: 40, startedAt: 0, finishAt: 0.2 })
  updateVillage(fresh, 0.2)
  assert.equal(fresh.nodes.find((node) => node.id === "tree-test-grown")?.amount, 80)

  const oldSave = createVillage()
  const oldTree = oldSave.nodes.find((node) => node.kind === "tree")
  oldTree.amount = 240
  const restored = migrateVillage(oldSave)
  assert.equal(restored.nodes.find((node) => node.id === oldTree.id)?.amount, 80)
})
