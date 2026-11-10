import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const host = process.env.TAURI_DEV_HOST

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, path.resolve(__dirname, ".."), ""),
    ...process.env,
  }
  return {
    root: __dirname,
    envDir: path.resolve(__dirname, ".."),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@/engine": path.resolve(__dirname, "../shared/src/engine"),
        "@/constants": path.resolve(__dirname, "../shared/src/constants"),
        "@/utils": path.resolve(__dirname, "../shared/src/utils"),
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: Number(env.WEB_PORT || 8080),
      strictPort: true,
      host: host || env.WEB_HOST || "127.0.0.1",
      proxy: {
        "/api": {
          target:
            env.API_TARGET || `http://127.0.0.1:${env.SERVER_PORT || 3001}`,
        },
      },
      fs: { allow: [path.resolve(__dirname, "..")] },
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  }
})
