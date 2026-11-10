import { createRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import MainMenu from "@/views/main_menu"
import { VillageView } from "@/views/village/VillageView"
import { RootLayout } from "./__root"

const FarmLaboratory = lazy(() =>
  import("@/views/laboratory/farm/farm_laboratory_view").then((module) => ({
    default: module.FarmLaboratory,
  })),
)
const CropsFarmView = lazy(() => import("@/views/laboratory/crops/crops_view"))
const MapEditor = lazy(() => import("@/views/mapEditor/MapEditor").then((module) => ({ default: module.MapEditor })))
const loading = <div className="village-loading">Carregando…</div>

export const Routes = [
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/",
    component: MainMenu,
  }),
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/map_editor",
    component: () => <Suspense fallback={loading}><MapEditor /></Suspense>,
  }),
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/map_editor/vila",
    component: () => <Suspense fallback={loading}><MapEditor openVillage /></Suspense>,
  }),
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/farm_laboratory",
    component: () => (
      <Suspense fallback={loading}>
        <FarmLaboratory />
      </Suspense>
    ),
  }),
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/crops_farm",
    component: VillageView,
  }),
  createRoute({
    getParentRoute: () => RootLayout,
    path: "/crops_laboratory",
    component: () => (
      <Suspense fallback={loading}>
        <CropsFarmView />
      </Suspense>
    ),
  }),
]
