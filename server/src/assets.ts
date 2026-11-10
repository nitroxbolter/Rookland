import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type Category = "Estruturas" | "Personagens" | "Animais" | "Itens" | "Recursos"
type Asset = { id: string; label: string; category: Category; path: string; footprint?: string; spriteSize?: string; region?: [number, number, number, number]; gameScale?: number }

const village = "spritesheets/village"
const resources = "spritesheets/resources"
const directions = ["down", "up", "left", "right"]
const activities = [
  ["walk", "Caminhar"], ["hoe", "Enxada"], ["axe", "Machado"],
  ["mine", "Picareta"], ["hammer", "Marreta"],
] as const

export const assets: Asset[] = [
  ...([['town-center-level-1','Centro urbano · nível 1','4×4',325,305,0.2],['town-center-level-2','Centro urbano · nível 2','4×4',325,310,0.2],['town-center-level-3','Centro urbano · nível 3','4×4',357,312,0.2],['barn-level-1','Celeiro · nível 1','3×3',328,255,0.17],['barn-level-2','Celeiro · nível 2','3×3',337,260,0.17],['barn-level-3','Celeiro · nível 3','3×3',360,260,0.17],['well','Poço','2×2',155,170,0.19]] as const).map(([id,label,footprint,w,h,gameScale]) => ({
    id, label, category: "Estruturas" as const, path: `${village}/${id}.png`, footprint, spriteSize: `${w}×${h}`, gameScale,
  })),
  ...(["house", "ranch"] as const).flatMap((kind) => Array.from({ length: kind === "house" ? 3 : 5 }, (_, index) => ({
    id: `${kind}-level-${index + 1}`, label: `${kind === "house" ? "Casa" : "Curral"} · nível ${index + 1}`,
    category: "Estruturas" as const, path: `${village}/${kind}-level-${index + 1}.png`, footprint: "2×2", spriteSize: "724×724",
  }))),
  ...(["horizontal", "vertical"] as const).flatMap((direction) => Array.from({ length: 3 }, (_, index) => ({
    id: `wall-${direction}-level-${index + 1}`, label: `Muro ${direction === "horizontal" ? "horizontal" : "vertical"} · nível ${index + 1}`,
    category: "Estruturas" as const, path: `${village}/wall-${direction}-level-${index + 1}.png`, footprint: "1×1", spriteSize: "724×724",
  }))),
  ...(["gate", "tower"] as const).flatMap((kind) => Array.from({ length: 3 }, (_, index) => ({
    id: `${kind}-level-${index + 1}`, label: `${kind === "gate" ? "Portão" : "Torre"} · nível ${index + 1}`,
    category: "Estruturas" as const, path: `${village}/${kind}-level-${index + 1}.png`,
    footprint: kind === "gate" ? "2×1" : "2×2", spriteSize: "724×724",
  }))),
  ...["blacksmith", "weaving", "barracks"].map((name) => ({
    id: name, label: ({ blacksmith: "Ferraria", weaving: "Tecelagem", barracks: "Quartel" } as Record<string, string>)[name],
    category: "Estruturas" as const, path: `${village}/${name}.png`,
    footprint: "3×3", spriteSize: name === "barracks" ? "1536×1024" : "1312×1199",
  })),
  { id: "soldier-directions", label: "Soldado · 4 direções", category: "Personagens", path: `${village}/soldier-directions.png`, footprint: "1×1", spriteSize: "por direção na folha" },
  { id: "explorer", label: "Explorador", category: "Personagens", path: `${village}/village-atlas.png`, footprint: "1×1", spriteSize: "84×151", region: [414, 758, 84, 151] },
  ...([['chicken','Galinha',1096,480,60,70],['cow','Vaca',1093,553,63,84],['pig','Porco',1095,642,60,72],['sheep','Ovelha',1088,713,68,80]] as const).map(([id,label,x,y,w,h]) => ({
    id, label, category: "Animais" as const, path: `${village}/village-atlas.png`, footprint: "curral · variável", spriteSize: `${w}×${h}`, region: [x,y,w,h] as [number,number,number,number],
  })),
  ...activities.flatMap(([activity, label]) => directions.map((direction) => ({
    id: `farmer-${activity}-${direction}`, label: `Aldeão · ${label} · ${({ down: "frente", up: "costas", left: "esquerda", right: "direita" } as Record<string, string>)[direction]}`,
    category: "Personagens" as const, path: `${village}/farmer/${activity}-${direction}.png`,
  }))),
  ...([['tree','Árvore'],['berryBush','Arbusto de frutas']] as const).map(([id,label]) => ({ id, label, category: "Recursos" as const, path: `${resources}/village-resource-atlas.png`, footprint: "1×1", spriteSize: "32×32 · árvore; 16×16 · arbusto" })),
  { id: "crops", label: "Plantações da fazenda", category: "Recursos", path: "spritesheets/cropsV2.png", footprint: "1×1 por canteiro", spriteSize: "quadros de cultivo" },
  ...([['food-items','Comida e produtos'],['materials-items','Materiais e ferramentas']] as const).map(([id,label]) => ({ id, label, category: "Itens" as const, path: `${resources}/items-spritesheet.png`, footprint: "inventário", spriteSize: "16×16 por ícone" })),
  ...["stone", "iron", "gold"].map((name) => ({
    id: `${name}-deposit`, label: ({ stone: "Pedra", iron: "Ferro", gold: "Ouro" } as Record<string, string>)[name],
    category: "Recursos" as const, path: `${resources}/${name}-deposit.png`, footprint: "1×1", spriteSize: "1254×1254 · folha de variações",
  })),
]

const sourceRoot = fileURLToPath(new URL("../../web/public/", import.meta.url))
const outputRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url))
const maximumBytes = 10 * 1024 * 1024

export function getAsset(id: string) {
  return assets.find((asset) => asset.id === id)
}

function pngSize(buffer: Buffer) {
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || buffer.toString("ascii", 12, 16) !== "IHDR" || buffer.readUInt32BE(8) !== 13)
    throw new Error("Escolha um PNG válido.")
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (!width || !height || width > 8192 || height > 8192)
    throw new Error("Dimensões do PNG inválidas.")
  let offset = 8
  let ended = false
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > buffer.length) throw new Error("PNG incompleto.")
    if (buffer.toString("ascii", offset + 4, offset + 8) === "IEND") {
      ended = length === 0 && end === buffer.length
      break
    }
    offset = end
  }
  if (!ended) throw new Error("PNG incompleto ou com dados extras.")
  return { width, height }
}

export function assetInfo(asset: Asset) {
  const file = resolve(sourceRoot, asset.path)
  const data = readFileSync(file)
  const size = pngSize(data)
  return { ...asset, region: asset.region, ...size,
    spriteSize: asset.gameScale === undefined ? asset.spriteSize : `${size.width}×${size.height}`,
    bytes: data.length, version: Math.round(statSync(file).mtimeMs) }
}

export function readAsset(asset: Asset) {
  return readFileSync(resolve(sourceRoot, asset.path))
}

export function saveAsset(asset: Asset, data: Buffer, backupRoot: string) {
  if (!data.length || data.length > maximumBytes) throw new Error("O PNG deve ter até 10 MB.")
  const original = readAsset(asset)
  const expected = pngSize(original)
  const actual = pngSize(data)
  if (asset.gameScale === undefined && (expected.width !== actual.width || expected.height !== actual.height))
    throw new Error(`Esta folha precisa manter ${expected.width} × ${expected.height} pixels; o arquivo enviado tem ${actual.width} × ${actual.height}.`)
  const backup = join(backupRoot, "asset-backups", asset.path)
  mkdirSync(dirname(backup), { recursive: true })
  try { copyFileSync(resolve(sourceRoot, asset.path), backup, constants.COPYFILE_EXCL) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error }
  for (const root of [sourceRoot, outputRoot]) {
    if (root === outputRoot && !existsSync(root)) continue
    const target = resolve(root, asset.path)
    mkdirSync(dirname(target), { recursive: true })
    const temporary = `${target}.upload-${process.pid}`
    try {
      writeFileSync(temporary, data)
      renameSync(temporary, target)
    } finally {
      rmSync(temporary, { force: true })
    }
  }
  return assetInfo(asset)
}

export { maximumBytes }
