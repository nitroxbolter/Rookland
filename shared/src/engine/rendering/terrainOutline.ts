interface Point { x: number; y: number }
interface Rect extends Point { width: number; height: number }
interface Edge { from: Point; to: Point; direction: number }

const STEP = 8
const pointKey = ({ x, y }: Point) => `${x},${y}`
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

function addRoundedLoop(path: Path2D, points: Point[], radius: number) {
  const corners = points.filter((point, i) => {
    const previous = points[(i + points.length - 1) % points.length]
    const next = points[(i + 1) % points.length]
    return !(previous.x === point.x && point.x === next.x) &&
      !(previous.y === point.y && point.y === next.y)
  })
  if (!corners.length) return

  corners.forEach((point, i) => {
    const previous = corners[(i + corners.length - 1) % corners.length]
    const next = corners[(i + 1) % corners.length]
    const before = Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y)
    const after = Math.abs(next.x - point.x) + Math.abs(next.y - point.y)
    const curve = Math.min(radius, before * STEP / 2, after * STEP / 2)
    const x = point.x * STEP
    const y = point.y * STEP
    const startX = x + Math.sign(previous.x - point.x) * curve
    const startY = y + Math.sign(previous.y - point.y) * curve
    if (i === 0) path.moveTo(startX, startY)
    else path.lineTo(startX, startY)
    path.quadraticCurveTo(x, y, x + Math.sign(next.x - point.x) * curve, y + Math.sign(next.y - point.y) * curve)
  })
  path.closePath()
}

/** Trace the outside of the projected caps and cliff faces, including inside corners. */
export function roundedReliefOutline(rects: Rect[], radius: number) {
  const filled = new Map<string, Point>()
  for (const rect of rects) {
    for (let y = rect.y / STEP; y < (rect.y + rect.height) / STEP; y++)
      for (let x = rect.x / STEP; x < (rect.x + rect.width) / STEP; x++) {
        const point = { x, y }
        filled.set(pointKey(point), point)
      }
  }

  const edges = new Set<Edge>()
  const outgoing = new Map<string, Edge[]>()
  function addEdge(from: Point, to: Point, direction: number) {
    const edge = { from, to, direction }
    edges.add(edge)
    const key = pointKey(from)
    const list = outgoing.get(key)
    if (list) list.push(edge)
    else outgoing.set(key, [edge])
  }

  for (const { x, y } of filled.values()) {
    const nw = { x, y }
    const ne = { x: x + 1, y }
    const se = { x: x + 1, y: y + 1 }
    const sw = { x, y: y + 1 }
    if (!filled.has(pointKey({ x, y: y - 1 }))) addEdge(nw, ne, 0)
    if (!filled.has(pointKey({ x: x + 1, y }))) addEdge(ne, se, 1)
    if (!filled.has(pointKey({ x, y: y + 1 }))) addEdge(se, sw, 2)
    if (!filled.has(pointKey({ x: x - 1, y }))) addEdge(sw, nw, 3)
  }

  const path = new Path2D()
  const turnOrder = [1, 0, 3, 2]
  while (edges.size) {
    const first = edges.values().next().value!
    const loop: Point[] = []
    let edge: Edge | undefined = first
    while (edge) {
      edges.delete(edge)
      loop.push(edge.from)
      if (samePoint(edge.to, first.from)) {
        addRoundedLoop(path, loop, radius)
        break
      }
      // At diagonal contact, follow the right-hand turn to keep separate loops.
      const next = outgoing.get(pointKey(edge.to))
      const direction: number = edge.direction
      edge = undefined
      for (const turn of turnOrder) {
        const dir = (direction + turn) % 4
        const candidate = next?.find((option) => option.direction === dir && edges.has(option))
        if (candidate) {
          edge = candidate
          break
        }
      }
    }
  }
  return path
}
