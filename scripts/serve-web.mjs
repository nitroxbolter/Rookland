import { createServer, request as proxyRequest } from "node:http"
import { createReadStream, existsSync, statSync } from "node:fs"
import { resolve, extname, sep } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../web/dist", import.meta.url))
const port = Number(process.env.WEB_PORT || 8080)
const host = process.env.WEB_HOST || "127.0.0.1"
const api = new URL(
  process.env.API_TARGET ||
    `http://127.0.0.1:${process.env.SERVER_PORT || 3001}`,
)
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
}
if (!existsSync(resolve(root, "index.html")))
  throw new Error("Execute npm run build antes de iniciar a página web")
const server = createServer((req, res) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
  } catch {
    res.writeHead(400)
    res.end()
    return
  }
  if (pathname.startsWith("/api/")) {
    const upstream = proxyRequest(
      new URL(req.url, api),
      { method: req.method, headers: { ...req.headers, host: api.host } },
      (reply) => {
        res.writeHead(reply.statusCode || 502, reply.headers)
        reply.pipe(res)
      },
    )
    upstream.on("error", () => {
      if (!res.headersSent)
        res.writeHead(502, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Servidor do jogo indisponível" }))
    })
    res.on("close", () => upstream.destroy())
    req.pipe(upstream)
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405)
    res.end()
    return
  }
  let file = resolve(root, `.${pathname}`)
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403)
    res.end()
    return
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    if (extname(pathname)) {
      res.writeHead(404)
      res.end()
      return
    }
    file = resolve(root, "index.html")
  }
  res.writeHead(200, {
    "Content-Type": types[extname(file)] || "application/octet-stream",
    "Cache-Control":
      extname(file) === ".html" || pathname.startsWith("/spritesheets/")
        ? "no-cache"
        : "public, max-age=3600",
  })
  if (req.method === "HEAD") res.end()
  else
    createReadStream(file)
      .on("error", () => res.destroy())
      .pipe(res)
})
server.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
server.listen(port, host, () =>
  console.log(`Página web: http://${host}:${port}`),
)
function stop() {
  server.close()
  server.closeAllConnections()
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
