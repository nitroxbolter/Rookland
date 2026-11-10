import { test } from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { once } from "node:events"
import { createServer } from "node:net"

async function freePort() {
  const server = createServer()
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

test(
  "servidor autoritativo, eventos, ferramentas, salvamentos e reinício",
  { timeout: 30000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "rookland-test-"))
    const port = await freePort()
    let child
    let logs = ""
    const url = `http://127.0.0.1:${port}`
    async function start() {
      child = spawn(process.execPath, ["server/dist/index.mjs"], {
        env: {
          ...process.env,
          SERVER_HOST: "127.0.0.1",
          SERVER_PORT: String(port),
          DATA_DIR: directory,
        },
        stdio: ["ignore", "pipe", "pipe"],
      })
      child.stdout.on("data", (data) => {
        logs += data
      })
      child.stderr.on("data", (data) => {
        logs += data
      })
      for (let n = 0; n < 100; n++) {
        if (child.exitCode !== null) throw new Error(logs)
        try {
          if ((await fetch(`${url}/api/health`)).ok) return
        } catch {}
        await delay(50)
      }
      throw new Error(`Servidor não iniciou: ${logs}`)
    }
    async function stop() {
      if (!child || child.exitCode !== null) return
      const exited = once(child, "exit")
      child.kill()
      await exited
    }
    t.after(async () => {
      await stop()
      await rm(directory, { recursive: true, force: true })
    })
    await start()
    const world = () => fetch(`${url}/api/world`).then((r) => r.json())
    const command = (value) =>
      fetch(`${url}/api/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      })
    assert.equal(
      (await fetch(`${url}/api/health`).then((r) => r.json())).simulation,
      "server",
    )
    assert.equal((await command({ type: "pause", paused: true })).status, 200)
    const pausedTime = (await world()).world.gameTime.totalMinutes
    const pausedVillage = (await world()).village
    assert.equal(
      pausedVillage.buildings.find((b) => b.kind === "townCenter").width,
      4,
    )
    await delay(1100)
    assert.equal((await world()).world.gameTime.totalMinutes, pausedTime)
    assert.deepEqual(
      (await world()).village,
      pausedVillage,
      "Pausa também interrompe a vila",
    )
    assert.equal(
      (await command({ type: "collectBranch", nodeId: "branch-0" })).status,
      400,
    )
    assert.equal((await world()).village.resources.wood, 80)
    assert.equal(
      (
        await command({
          type: "build",
          kind: "farm",
          x: 16,
          y: 25,
          crop: "wheat",
        })
      ).status,
      200,
    )
    assert.equal(
      (await command({ type: "build", kind: "farm", x: 16, y: 25 })).status,
      400,
    )
    assert.equal(
      (
        await command({
          type: "assignUnit",
          unitId: "villager-1",
          targetId: "starter-farm",
        })
      ).status,
      200,
    )
    assert.equal((await command({ type: "speed", scale: 0 })).status, 400)
    assert.equal((await world()).village.version, 4)
    assert.equal((await command({ type: "recruitVillager" })).status, 400)
    assert.equal(
      (await command({ type: "research", research: "agriculture" })).status,
      200,
    )
    const researching = (await world()).village
    assert.equal(researching.research.agriculture, 0)
    assert.equal(researching.improvements.find((item) => item.kind === "research").targetLevel, 1)
    assert.equal(
      (await command({ type: "sellResource", resource: "wood", amount: 10 }))
        .status,
      200,
    )
    assert.equal((await world()).village.resources.gold, 2)
    assert.equal(
      (await command({ type: "sellResource", resource: "gold", amount: 10 }))
        .status,
      400,
    )
    const stockBeforeBarn = (await world()).village.resources
    assert.equal(
      (await command({ type: "demolishBarn", buildingId: "starter-barn" }))
        .status,
      200,
    )
    assert.deepEqual((await world()).village.resources, stockBeforeBarn)
    assert.equal(
      (await command({ type: "upgradeBarn", buildingId: "starter-barn" }))
        .status,
      400,
    )
    const movable = (await world()).village.buildings.find(
      (b) => b.x === 16 && b.y === 25,
    )
    assert.equal(
      (await command({ type: "demolishFarm", buildingId: movable.id })).status,
      200,
    )
    assert.equal((await world()).village.farmBlueprints.length, 0)
    assert.equal(
      (
        await command({
          type: "placeFarm",
          blueprintId: movable.id,
          x: 16,
          y: 25,
        })
      ).status,
      400,
    )
    assert.equal(
      (await command({ type: "relocateTownCenter", x: 16, y: 25 })).status,
      200,
    )
    assert.equal(
      (await world()).village.buildings.find((b) => b.kind === "townCenter").x,
      16,
    )

    assert.equal(
      (
        await command({
          type: "useTool",
          x: -1,
          y: 0,
          tool: "hoe",
          itemId: null,
        })
      ).status,
      400,
    )
    assert.equal(
      (
        await command({
          type: "useTool",
          x: 5,
          y: 5,
          tool: null,
          itemId: "__proto__",
        })
      ).status,
      400,
    )
    assert.equal(
      (await command({ type: "moveItem", from: 0, to: 999 })).status,
      400,
    )
    assert.equal(
      (
        await fetch(`${url}/api/commands`, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "{}",
        })
      ).status,
      400,
    )
    assert.equal(
      (
        await fetch(`${url}/api/commands`, {
          method: "POST",
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status,
      403,
    )

    // Two independent streaming clients must both receive changes after connecting.
    const streamAbort = new AbortController()
    t.after(() => streamAbort.abort())
    const streams = await Promise.all(
      [1, 2].map(async () => {
        const response = await fetch(`${url}/api/events`, {
          signal: streamAbort.signal,
        })
        assert.equal(response.headers.get("content-type"), "text/event-stream")
        const reader = response.body.getReader()
        let pending = ""
        return async () => {
          for (;;) {
            const end = pending.indexOf("\n\n")
            if (end >= 0) {
              const message = pending.slice(0, end)
              pending = pending.slice(end + 2)
              if (message.startsWith("data: "))
                return JSON.parse(message.slice(6))
              continue
            }
            const { value, done } = await reader.read()
            if (done)
              throw new Error("Stream foi encerrado antes da atualização")
            pending += new TextDecoder().decode(value)
          }
        }
      }),
    )
    await Promise.all(streams.map((next) => next()))
    await command({ type: "useTool", x: 5, y: 5, tool: "hoe", itemId: null })
    const updated = await Promise.all(streams.map((next) => next()))
    for (const state of updated)
      assert.ok(
        state.groundTiles.find(
          ([key, tile]) => key === "5-5" && tile.layers[1].type === 401,
        ),
      )
    streamAbort.abort()

    const initial = await world()
    const seed = initial.inventory.find((item) => item?.id.endsWith("-seed"))
    await command({ type: "useTool", x: 5, y: 5, tool: null, itemId: seed.id })
    let planted = await world()
    assert.equal(
      planted.inventory.find((item) => item?.id === seed.id).quantity,
      seed.quantity - 1,
    )
    assert.ok(
      planted.world.entities.some(
        (entity) => entity.type === "crop" && entity.x === 5 && entity.y === 5,
      ),
    )
    await command({
      type: "useTool",
      x: 5,
      y: 5,
      tool: "wateringCan",
      itemId: null,
    })
    assert.equal((await world()).world.entities[0].isWatered, true)
    await command({ type: "speed", scale: 10 })
    await command({ type: "pause", paused: false })
    await delay(1500)
    await command({ type: "pause", paused: true })
    const grown = await world()
    assert.ok(grown.world.gameTime.totalMinutes > pausedTime)
    assert.ok(
      grown.world.entities[0].totalGrowthMinutes > 0,
      "Planta cresce no backend sem navegador",
    )
    assert.equal(
      (await command({ type: "moveItem", from: 0, to: 29 })).status,
      200,
    )
    assert.equal((await world()).inventory[29].id, seed.id)

    const farm = {
      name: "Fazenda de teste",
      data: {
        width: 16,
        height: 16,
        groundTiles: grown.groundTiles,
        entities: grown.world.entities,
      },
    }
    const save = await fetch(`${url}/api/farms/test-farm`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(farm),
    })
    assert.equal(save.status, 200)
    assert.equal(
      (await fetch(`${url}/api/farms`).then((r) => r.json())).length,
      1,
    )
    assert.equal(
      (await fetch(`${url}/api/farms/test-farm`).then((r) => r.json())).name,
      farm.name,
    )
    const invalid = await fetch(`${url}/api/farms/invalid`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "bad", data: { width: -1 } }),
    })
    assert.equal(invalid.status, 400)

    // Wait for the autosave, then kill/restart (Windows terminate does not send POSIX signals).
    await delay(5100)
    const beforeRestart = await world()
    await stop()
    await start()
    const afterRestart = await world()
    assert.deepEqual(afterRestart.world, beforeRestart.world)
    assert.deepEqual(afterRestart.inventory, beforeRestart.inventory)
    assert.deepEqual(afterRestart.groundTiles, beforeRestart.groundTiles)
    assert.deepEqual(
      afterRestart.village,
      beforeRestart.village,
      "Recursos, prédios, tarefas e cargas da vila persistem",
    )
    assert.equal(
      (await fetch(`${url}/api/farms/test-farm`).then((r) => r.json())).name,
      farm.name,
    )
    assert.equal(
      (await fetch(`${url}/api/farms/test-farm`, { method: "DELETE" })).status,
      200,
    )
    assert.equal((await fetch(`${url}/api/farms/test-farm`)).status, 404)
    await stop()

    // Upgrade an old save by adding a fresh village and preserving a backup.
    const legacy = { ...beforeRestart }
    delete legacy.village
    await writeFile(join(directory, "world.json"), JSON.stringify(legacy))
    await start()
    assert.ok((await world()).village.units.some((u) => u.kind === "hero"))
    assert.deepEqual(
      JSON.parse(
        await readFile(join(directory, "world.json.pre-village.bak"), "utf8"),
      ),
      legacy,
    )
    await stop()

    const legacyEconomy = structuredClone(beforeRestart)
    legacyEconomy.village.version = 1
    delete legacyEconomy.village.research
    delete legacyEconomy.village.economy
    delete legacyEconomy.village.farmBlueprints
    for (const b of legacyEconomy.village.buildings)
      if (b.kind === "farm") {
        b.width = 2
        b.height = 2
      }
    await writeFile(
      join(directory, "world.json"),
      JSON.stringify(legacyEconomy),
    )
    await start()
    assert.equal((await world()).village.version, 4)
    assert.deepEqual(
      (await world()).village.resources,
      legacyEconomy.village.resources,
    )
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(directory, "world.json.pre-economy-v2.bak"),
          "utf8",
        ),
      ),
      legacyEconomy,
    )
    await stop()

    // Corrupted data must fail startup without overwriting the file with a fresh world.
    await writeFile(join(directory, "world.json"), "invalid-json")
    child = spawn(process.execPath, ["server/dist/index.mjs"], {
      env: { ...process.env, SERVER_PORT: String(port), DATA_DIR: directory },
      stdio: "ignore",
    })
    const [exitCode] = await once(child, "exit")
    assert.notEqual(exitCode, 0)
    assert.equal(
      await readFile(join(directory, "world.json"), "utf8"),
      "invalid-json",
    )
  },
)
