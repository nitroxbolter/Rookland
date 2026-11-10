import type { BuildingKind } from "../../../../shared/village/types"

const ART_BOUNDS: Record<BuildingKind, readonly [number, number]> = {
  townCenter: [72, 63], barn: [62, 45], farm: [32, 32], house: [48, 48],
  well: [30, 33], wall: [16, 16], gate: [40, 40], tower: [42, 42],
  blacksmith: [75, 69], weaving: [75, 69], barracks: [80, 55], ranch: [48, 48],
}

export function buildingVisualScale(kind: BuildingKind, width: number, height: number) {
  const [artWidth, artHeight] = ART_BOUNDS[kind]
  // O portão ocupa 2 × 1 tiles. A arte já inclui a perspectiva vertical;
  // limitá-la pela altura do footprint encolhe também a largura e abre vãos.
  // Towers have a 2×2 ground footprint, while the roof and lookout rise above it.
  // Keeping that vertical art at full size lets depth sorting hide a unit behind it.
  if (kind === "gate" || kind === "tower") return 1
  return Math.min(1, (width * 16 - 2) / artWidth, (height * 16 - 2) / artHeight)
}

/** Sprite height is visual only; the building's map footprint stays unchanged. */
export function buildingVisualTransform(kind: BuildingKind, width: number, height: number) {
  const horizontal = buildingVisualScale(kind, width, height)
  const rise: Partial<Record<BuildingKind, number>> = {
    townCenter: 8, barn: 6, house: 8, well: 6,
    blacksmith: 8, weaving: 8, barracks: 8, ranch: 8,
  }
  const extraHeight = rise[kind] ?? 0
  if (!extraHeight) return `scale(${horizontal})`
  const vertical = Math.max(horizontal, (height * 16 + extraHeight) / ART_BOUNDS[kind][1])
  return `scale(${horizontal}, ${vertical})`
}
