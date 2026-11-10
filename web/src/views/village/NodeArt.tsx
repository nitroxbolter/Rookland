import type { ResourceNode } from "../../../../shared/village/types"

export function NodeArt({ node }: { node: ResourceNode }) {
  if (node.kind === "branch") return <span className="node-art branch-art" />
  if (node.kind === "rock" || node.kind === "gold" || node.kind === "iron") {
    const size = node.kind === "rock" ? node.variant === 6 ? " deposit-small" : node.variant === 3 ? " deposit-medium" : "" : ""
    return <span className={`node-art deposit-art resource-art-${node.kind}${size}`} />
  }
  const frame = node.kind === "berryBush" ? 16 : 32
  const row = node.kind === "berryBush" ? 3 : 0
  return (
    <span
      className={`node-art atlas-resource-art resource-art-${node.kind}`}
      style={{
        backgroundPosition: `-${(node.variant % 4) * frame}px -${row * frame}px`,
      }}
    />
  )
}

