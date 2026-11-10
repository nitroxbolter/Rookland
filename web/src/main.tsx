import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

// i18n initialization
import "@/i18n"

import { connectGameServer } from "./services/gameClient"
import { ServerStatus } from "./components/ServerStatus"
import "./index.css"
import { RootLayout } from "./routes/__root"
import { Routes } from "./routes/routes"

const routeTree = RootLayout.addChildren(Routes)

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// The browser observes the server; only the Node.js process runs GameLoop.
connectGameServer()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootElement = document.getElementById("app")!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
      <ServerStatus />
    </StrictMode>,
  )
}
