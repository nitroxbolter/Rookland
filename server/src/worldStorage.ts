import { createConnection } from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { WorldSnapshot } from "../../shared/protocol"

const LOCAL_WORLD = "local"
const QUERY_TIMEOUT = 5000

interface SaveRow extends RowDataPacket {
  snapshot: string
}

export async function openWorldDatabase() {
  const database = process.env.DB_NAME || "rookland"
  const connection = await createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database,
    user: process.env.DB_USER || "rookland_world_local",
    password: process.env.DB_PASSWORD,
    connectTimeout: QUERY_TIMEOUT,
    charset: "utf8mb4",
  })

  try {
    // The lock stays with this connection, so two servers cannot write the same world.
    const [rows] = await connection.execute<(RowDataPacket & { acquired: number })[]>({
      sql: "SELECT GET_LOCK(?, 0) AS acquired",
      timeout: QUERY_TIMEOUT,
    }, [`${database}:world:${LOCAL_WORLD}`])
    if (rows[0]?.acquired !== 1) throw new Error("O mundo local já está aberto em outro servidor RookLand.")
  } catch (error) {
    connection.destroy()
    throw error
  }

  return {
    async load(): Promise<WorldSnapshot | null> {
      const [rows] = await connection.execute<SaveRow[]>({
        sql: "SELECT snapshot FROM world_saves WHERE world_id = ?",
        timeout: QUERY_TIMEOUT,
      }, [LOCAL_WORLD])
      return rows.length ? JSON.parse(rows[0].snapshot) as WorldSnapshot : null
    },
    async save(value: WorldSnapshot) {
      await connection.execute({
        sql: `INSERT INTO world_saves (world_id, snapshot) VALUES (?, ?)
              ON DUPLICATE KEY UPDATE snapshot = VALUES(snapshot)`,
        timeout: QUERY_TIMEOUT,
      }, [LOCAL_WORLD, JSON.stringify(value)])
    },
    close: () => connection.destroy(),
  }
}
