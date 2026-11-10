import { createConnection } from "mysql2/promise"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

if (process.env.WORLD_STORAGE !== "mysql") throw new Error("Configure WORLD_STORAGE=mysql.")
const database = process.env.DB_NAME || "rookland"
const connection = await createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database,
  user: process.env.DB_USER || "rookland_world_local",
  password: process.env.DB_PASSWORD,
  connectTimeout: 5000,
  charset: "utf8mb4",
})
try {
  const [locks] = await connection.execute("SELECT GET_LOCK(?, 0) AS acquired", [`${database}:world:local`])
  if (locks[0]?.acquired !== 1) throw new Error("Feche o servidor do jogo antes de zerar a ferraria.")
  await connection.beginTransaction()
  const [rows] = await connection.execute("SELECT snapshot FROM world_saves WHERE world_id = ? FOR UPDATE", ["local"])
  if (!rows.length) throw new Error("Mundo local não encontrado no banco.")
  const raw = rows[0].snapshot
  const world = JSON.parse(raw)
  if (!world.village) throw new Error("O mundo não contém vila.")
  const before = [world.village.toolLevel ?? 0, world.village.weaponLevel ?? 0, world.village.armorLevel ?? 0]
  const backupDir = join("server", "data")
  mkdirSync(backupDir, { recursive: true })
  const backup = join(backupDir, `world.before-forge-reset-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  writeFileSync(backup, raw, { flag: "wx", mode: 0o600 })
  world.village.toolLevel = 0
  world.village.weaponLevel = 0
  world.village.armorLevel = 0
  world.village.improvements = (world.village.improvements ?? []).filter((item) => item.kind !== "forge")
  await connection.execute("UPDATE world_saves SET snapshot = ? WHERE world_id = ?", [JSON.stringify(world), "local"])
  await connection.commit()
  console.log(`Ferraria reiniciada: ferramentas ${before[0]}→0, armas ${before[1]}→0, armaduras ${before[2]}→0. Backup: ${backup}`)
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.destroy()
}
