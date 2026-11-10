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
  if (kind === "gate") return 1
  return Math.min(1, (width * 16 - 2) / artWidth, (height * 16 - 2) / artHeight)
}
