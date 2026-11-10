import { build } from "esbuild"
await build({
  entryPoints: {
    index: "server/src/index.ts",
    village: "shared/village/simulation.ts",
  },
  outdir: "server/dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  packages: "external",
  tsconfig: "server/tsconfig.json",
})
