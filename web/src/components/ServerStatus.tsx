import { useStore } from "zustand"
import { connectionStore } from "@/services/gameClient"

export function ServerStatus() {
  const { connected, error } = useStore(connectionStore)
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 10000,
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 12,
        pointerEvents: "none",
        background: "#17221ee8",
        color: connected && !error ? "#9ce9b7" : "#ffd49a",
      }}
    >
      {error || (connected ? "● Servidor conectado" : "Conectando…")}
    </div>
  )
}
