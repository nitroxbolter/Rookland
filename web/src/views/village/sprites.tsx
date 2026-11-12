import type { CSSProperties } from "react"

const atlas = "/spritesheets/village/village-atlas.png"
const regions = {
  town1: { x: 20, y: 15, width: 325, height: 305 },
  town2: { x: 370, y: 10, width: 325, height: 310 },
  town3: { x: 0, y: 0, width: 325, height: 310 },
  town4: { x: 0, y: 0, width: 357, height: 312 },
  town5: { x: 0, y: 0, width: 357, height: 312 },
  town6: { x: 0, y: 0, width: 357, height: 312 },
  town7: { x: 0, y: 0, width: 357, height: 312 },
  town8: { x: 0, y: 0, width: 357, height: 312 },
  barn1: { x: 20, y: 390, width: 328, height: 255 },
  barn2: { x: 355, y: 385, width: 337, height: 260 },
  barn3: { x: 0, y: 0, width: 337, height: 260 },
  barn4: { x: 0, y: 0, width: 360, height: 260 },
  barn5: { x: 0, y: 0, width: 360, height: 260 },
  barn6: { x: 0, y: 0, width: 360, height: 260 },
  barn7: { x: 0, y: 0, width: 360, height: 260 },
  barn8: { x: 0, y: 0, width: 360, height: 260 },
  well: { x: 1213, y: 187, width: 155, height: 170 },
  explorer: { x: 414, y: 758, width: 84, height: 151 },
  explorerLeft: { x: 500, y: 758, width: 82, height: 151 },
  explorerRight: { x: 583, y: 758, width: 82, height: 151 },
  chicken: { x: 1096, y: 480, width: 60, height: 70 },
  cow: { x: 1093, y: 553, width: 63, height: 84 },
  pig: { x: 1095, y: 642, width: 60, height: 72 },
  sheep: { x: 1088, y: 713, width: 68, height: 80 },
} as const
export type VillageSprite = keyof typeof regions
export const townSprite = (level: number): VillageSprite => `town${Math.max(1, Math.min(8, level))}` as VillageSprite
export const barnSprite = (level: number): VillageSprite => `barn${Math.max(1, Math.min(8, level))}` as VillageSprite
export const animalSprites = [
  { id: "chicken", name: "Galinha" },
  { id: "cow", name: "Vaca" },
  { id: "pig", name: "Porco" },
  { id: "sheep", name: "Ovelha" },
] as const

export function AtlasSprite({
  sprite,
  scale,
  className = "",
  style,
}: {
  sprite: VillageSprite
  scale: number
  className?: string
  style?: CSSProperties
}) {
  const region = regions[sprite]
  const independentSprites: Partial<Record<VillageSprite, string>> = {
    town1: "/spritesheets/village/town-center-level-1.png",
    town2: "/spritesheets/village/town-center-level-2.png",
    town3: "/spritesheets/village/town-center-level-3.png",
    town4: "/spritesheets/village/town-center-level-4.png",
    town5: "/spritesheets/village/town-center-level-5.png",
    town6: "/spritesheets/village/town-center-level-6.png",
    town7: "/spritesheets/village/town-center-level-7.png",
    town8: "/spritesheets/village/town-center-level-8.png",
    barn1: "/spritesheets/village/barn-level-1.png",
    barn2: "/spritesheets/village/barn-level-2.png",
    barn3: "/spritesheets/village/barn-level-3.png",
    barn4: "/spritesheets/village/barn-level-4.png",
    barn5: "/spritesheets/village/barn-level-5.png",
    barn6: "/spritesheets/village/barn-level-6.png",
    barn7: "/spritesheets/village/barn-level-7.png",
    barn8: "/spritesheets/village/barn-level-8.png",
    well: "/spritesheets/village/well.png",
  }
  const independent = independentSprites[sprite]
  if (independent) return <img
    aria-hidden="true"
    alt=""
    draggable={false}
    className={`atlas-sprite ${className}`}
    src={independent}
    style={{
      display: "block",
      width: "auto",
      height: "auto",
      maxWidth: "none",
      maxHeight: "none",
      imageRendering: "pixelated",
      transform: `scale(${scale})`,
      transformOrigin: "bottom left",
      ...style,
    }}
  />
  return (
    <span
      aria-hidden="true"
      className={`atlas-sprite ${className}`}
      style={{
        display: "block",
        width: region.width,
        height: region.height,
        backgroundImage: `url(${independent ?? atlas})`,
        backgroundPosition: independent ? "0 0" : `-${region.x}px -${region.y}px`,
        backgroundSize: independent ? `${region.width}px ${region.height}px` : "1536px 1024px",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: `scale(${scale})`,
        transformOrigin: "bottom left",
        ...style,
      }}
    />
  )
}
