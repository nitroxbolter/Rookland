import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { fileURLToPath } from "node:url"
import { copyFileSync, constants, writeFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { execute, restore, snapshot, startGame, stopGame, setPlayerConnected } from "./game"
import { createStorage, readJson, writeJson } from "./storage"
import { openWorldDatabase } from "./worldStorage"
import { assets, assetInfo, getAsset, maximumBytes, readAsset, saveAsset } from "./assets"
import type {
  GameCommand,
  FarmSaveData,
  WorldSnapshot,
} from "../../shared/protocol"

const host = process.env.SERVER_HOST || "127.0.0.1"
const port = Number(process.env.SERVER_PORT || 3001)
const directory = resolve(
  process.env.DATA_DIR || fileURLToPath(new URL("../data", import.meta.url)),
)
const storage = createStorage(directory)
const worldFile = join(directory, "world.json")
const importOnly = process.argv.includes("--import-world")
const resetLocalWorld = process.argv.includes("--reset-local-world")
const mode = process.env.WORLD_STORAGE || "json"
if (mode !== "json" && mode !== "mysql") throw new Error("WORLD_STORAGE deve ser json ou mysql.")
if (importOnly && mode !== "mysql") throw new Error("Configure WORLD_STORAGE=mysql antes de importar.")
if (resetLocalWorld && (mode !== "mysql" || importOnly))
  throw new Error("O reset local exige WORLD_STORAGE=mysql e deve ser executado sozinho.")
const database = mode === "mysql" ? await openWorldDatabase() : null
const databaseSave = await database?.load()
if (resetLocalWorld && database) {
  try {
    if (!databaseSave) throw new Error("Não há mundo local no banco para reiniciar.")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backup = join(directory, `world.before-reset-${timestamp}.json`)
    writeFileSync(backup, JSON.stringify(databaseSave), { flag: "wx", mode: 0o600 })
    await database.save(snapshot())
    console.log(`Vila reiniciada. Save anterior: ${backup}`)
  } finally {
    database.close()
  }
  process.exit(0)
}
const fileSave = databaseSave ? null : readJson<WorldSnapshot>(worldFile)
const saved = databaseSave ?? fileSave
if (fileSave?.village && Number(fileSave.village.version) < 4) {
  try {
    copyFileSync(
      worldFile,
      `${worldFile}.pre-cycle-v4.bak`,
      constants.COPYFILE_EXCL,
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
}
if (fileSave?.village && Number(fileSave.village.version) < 3) {
  try {
    copyFileSync(
      worldFile,
      `${worldFile}.pre-storage-v3.bak`,
      constants.COPYFILE_EXCL,
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
}
if (fileSave?.village && Number(fileSave.village.version) === 1) {
  try {
    copyFileSync(
      worldFile,
      `${worldFile}.pre-economy-v2.bak`,
      constants.COPYFILE_EXCL,
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
}
if (fileSave && !fileSave.village) {
  try {
    copyFileSync(
      worldFile,
      `${worldFile}.pre-village.bak`,
      constants.COPYFILE_EXCL,
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
}
if (saved) restore(saved)
if (importOnly && !saved) throw new Error("Não há world.json para importar.")
if (database && !databaseSave) {
  await database.save(snapshot())
  if (fileSave) console.log("Save local importado no banco. world.json foi preservado.")
}
if (importOnly) {
  database?.close()
  console.log(databaseSave ? "O banco já contém o mundo local." : "Importação concluída.")
  process.exit(0)
}

async function saveWorld() {
  if (database) await database.save(snapshot())
  else writeJson(worldFile, snapshot())
}

const clients = new Set<ServerResponse>()
let databaseSaveFailed = false
let stopping = false

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(JSON.stringify(value))
}

async function body(request: IncomingMessage) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new Error("Use application/json")
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    bytes += chunk.length
    if (bytes > 5 * 1024 * 1024) throw new Error("Conteúdo excede 5 MB")
    chunks.push(Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

async function pngBody(request: IncomingMessage) {
  if (request.headers["content-type"] !== "image/png")
    throw new Error("Envie um arquivo PNG.")
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    bytes += chunk.length
    if (bytes > maximumBytes) throw new Error("O PNG deve ter até 10 MB.")
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

let lastState = ""
function broadcast() {
  const data = JSON.stringify(snapshot())
  if (data === lastState) return
  lastState = data
  for (const client of clients) {
    // write(false) means buffered, not failed. A full map can exceed highWaterMark.
    if (client.writableLength > 1024 * 1024) client.destroy()
    else client.write(`data: ${data}\n\n`)
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost")
    const method = request.method
    // Same-origin API through Vite, the web server, Apache or Nginx.
    // No permissive CORS; JSON writes also reject browser cross-site requests.
    if (request.headers["sec-fetch-site"] === "cross-site")
      return json(response, 403, { error: "Origem não permitida" })
    if (method === "GET" && url.pathname === "/api/health")
      return json(response, databaseSaveFailed ? 503 : 200, {
        status: databaseSaveFailed ? "save_unavailable" : "ok",
        simulation: "server",
        worldStorage: mode,
        clients: clients.size,
      })
    if (method === "GET" && url.pathname === "/api/world")
      return json(response, 200, snapshot())
    if (method === "GET" && url.pathname === "/api/events") {
      if (clients.size >= 100)
        return json(response, 503, { error: "Limite de conexões" })
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      })
      response.write(`data: ${JSON.stringify(snapshot())}\n\n`)
      clients.add(response)
      setPlayerConnected(true)
      response.on("close", () => {
        clients.delete(response)
        setPlayerConnected(clients.size > 0)
      })
      return
    }
    if (method === "POST" && url.pathname === "/api/commands") {
      const command = (await body(request)) as GameCommand
      if (stopping || databaseSaveFailed)
        return json(response, 503, { error: "Salvamento indisponível. Verifique o MariaDB no XAMPP." })
      execute(command)
      broadcast()
      return json(response, 200, { ok: true })
    }
    if (method === "GET" && url.pathname === "/api/assets")
      return json(response, 200, assets.map(assetInfo))
    const assetMatch = /^\/api\/assets\/([a-z0-9-]+)$/.exec(url.pathname)
    if (assetMatch) {
      const asset = getAsset(assetMatch[1])
      if (!asset) return json(response, 404, { error: "Sprite não encontrado" })
      if (method === "GET") {
        const image = readAsset(asset)
        response.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${asset.id}.png"`,
          "Content-Length": image.length,
          "Cache-Control": "no-store",
        })
        return response.end(image)
      }
      if (method === "POST")
        return json(response, 200, saveAsset(asset, await pngBody(request), directory))
    }
    if (method === "GET" && url.pathname === "/api/farms")
      return json(response, 200, storage.list())
    const match = /^\/api\/farms\/([a-zA-Z0-9_-]{1,80})$/.exec(url.pathname)
    if (match) {
      const id = match[1]
      if (method === "GET") {
        const farm = storage.get(id)
        return json(
          response,
          farm ? 200 : 404,
          farm ?? { error: "Fazenda não encontrada" },
        )
      }
      if (method === "PUT")
        return json(
          response,
          200,
          storage.save(id, (await body(request)) as FarmSaveData),
        )
      if (method === "DELETE") {
        storage.delete(id)
        return json(response, 200, { ok: true })
      }
    }
    json(response, 404, { error: "Rota não encontrada" })
  } catch (error) {
    const ioError = Boolean((error as NodeJS.ErrnoException).code)
    if (ioError) console.error(error)
    if (!response.headersSent)
      json(response, ioError ? 500 : 400, {
        error: ioError
          ? "Falha ao gravar os dados no servidor"
          : error instanceof Error
            ? error.message
            : "Requisição inválida",
      })
    else response.destroy()
  }
})

server.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
server.listen(port, host, () => {
  startGame()
  console.log(`Servidor: http://${host}:${port} | mundo: ${database ? "MariaDB/MySQL" : worldFile}`)
})
const sync = setInterval(broadcast, 100)
const heartbeat = setInterval(() => {
  for (const client of clients) client.write(": ping\n\n")
}, 15000)
let pendingSave: Promise<void> | null = null
const autosave = setInterval(() => {
  if (pendingSave) return
  pendingSave = saveWorld()
    .then(() => {
      if (!databaseSaveFailed) return
      databaseSaveFailed = false
      if (!stopping) startGame()
    })
    .catch((error) => {
      if (!databaseSaveFailed) console.error("Falha no salvamento automático:", error)
      if (database) {
        databaseSaveFailed = true
        stopGame()
      }
    })
    .finally(() => { pendingSave = null })
}, 5000)

async function shutdown() {
  if (stopping) return
  stopping = true
  stopGame()
  clearInterval(sync)
  clearInterval(heartbeat)
  clearInterval(autosave)
  for (const client of clients) client.end()
  server.close()
  server.closeIdleConnections()
  try {
    await pendingSave
    await saveWorld()
  } catch (error) {
    console.error("Falha ao salvar mundo:", error)
    process.exitCode = 1
  } finally {
    database?.close()
  }
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
