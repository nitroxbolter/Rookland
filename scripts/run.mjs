import { spawn } from "node:child_process"
import { loadEnvFile } from "node:process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

process.chdir(fileURLToPath(new URL("..", import.meta.url)))
if (existsSync(".env")) loadEnvFile(".env")
const dev = process.argv.includes("--dev")
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) child.kill("SIGTERM")
}
function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  })
  children.push(child)
  child.on("error", (error) => {
    console.error(error)
    stop(1)
  })
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1)
  })
}
run(["--env-file-if-exists=.env", "server/dist/index.mjs"])
run(
  dev
    ? [
        resolve("node_modules/vite/bin/vite.js"),
        "--config",
        "web/vite.config.ts",
      ]
    : ["scripts/serve-web.mjs"],
)
process.on("SIGINT", () => stop())
process.on("SIGTERM", () => stop())
