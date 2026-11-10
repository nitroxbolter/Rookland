export const MAP_SURFACES = {
  grass: { label: "Grama", tile: 0, preview: "grass-terrain-preview" },
  darkGrass: { label: "Grama escura", tile: 1, preview: "darker-grass-terrain-preview" },
  dirt: { label: "Terra clara", tile: 2, preview: "soil-ground-terrain-preview" },
  darkDirt: { label: "Terra escura", tile: 3, preview: "darker-soil-ground-terrain-preview" },
  stone: { label: "Piso de pedra", tile: 4, preview: "sone-ground-terrain-preview" },
  grass1: { label: "Grama 1", tile: 100, preview: "grass_ground_1" },
  grass2: { label: "Grama 2", tile: 101, preview: "grass_ground_2" },
  darkGrass1: { label: "Grama escura 1", tile: 102, preview: "darker_grass_ground_1" },
  darkGrass2: { label: "Grama escura 2", tile: 103, preview: "darker_grass_ground_2" },
  snow1: { label: "Neve 1", tile: 104, preview: "snow_ground_1" },
  snow2: { label: "Neve 2", tile: 105, preview: "snow_ground_2" },
  path: { label: "Trilha", tile: 400, preview: "dirt" },
  widePath: { label: "Trilha larga", tile: 401, preview: "dirt_wider" },
  water: { label: "Água", tile: null, preview: undefined },
} as const

export type MapSurface = keyof typeof MAP_SURFACES

// Low to high. Water is not a floor and relief is rendered above this stack.
const FLOOR_ORDER = [0, 100, 101, 1, 102, 103, 2, 3, 4, 400, 401, 104, 105]
const FLOOR_PRIORITIES = new Map(FLOOR_ORDER.map((tile, rank) => [tile, rank]))

export const floorPriority = (tile: number) => FLOOR_PRIORITIES.get(tile) ?? 0
