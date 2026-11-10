import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Point } from "../../../../shared/village/types"

export function useMapEditorCamera(width: number, height: number) {
  const scroller = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0.5)
  const [zoom, setZoom] = useState<number | null>(null)
  const anchor = useRef<{ pixel: Point; screen: Point } | null>(null)
  const scale = zoom ?? fit

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const observer = new ResizeObserver(() => setFit(Math.max(0.1, Math.min(
      1, (element.clientWidth - 16) / width, (element.clientHeight - 16) / height,
    ))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [width, height])

  const zoomBy = useCallback((factor: number, from?: Point, to?: Point) => {
    const element = scroller.current
    const bounds = board.current?.getBoundingClientRect()
    if (!element || !bounds?.width) return
    const viewport = element.getBoundingClientRect()
    const source = from ?? { x: viewport.left + viewport.width / 2, y: viewport.top + viewport.height / 2 }
    const target = to ?? source
    const rendered = bounds.width / width
    const next = Math.max(fit, Math.min(4, rendered * factor))
    if (Math.abs(next - rendered) < 0.0001) {
      element.scrollLeft += source.x - target.x
      element.scrollTop += source.y - target.y
      return
    }
    anchor.current = {
      pixel: { x: (source.x - bounds.left) / rendered, y: (source.y - bounds.top) / rendered },
      screen: target,
    }
    setZoom(next)
  }, [fit, width])

  useLayoutEffect(() => {
    const next = anchor.current
    const element = scroller.current
    const bounds = board.current?.getBoundingClientRect()
    if (!next || !element || !bounds) return
    anchor.current = null
    element.scrollLeft += bounds.left + next.pixel.x * scale - next.screen.x
    element.scrollTop += bounds.top + next.pixel.y * scale - next.screen.y
  }, [scale])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomBy(Math.exp(-Math.max(-150, Math.min(150, delta)) * 0.003), { x: event.clientX, y: event.clientY })
    }
    element.addEventListener("wheel", wheel, { passive: false })
    return () => element.removeEventListener("wheel", wheel)
  }, [zoomBy])

  function fitMap() {
    anchor.current = null
    setZoom(null)
    scroller.current?.scrollTo(0, 0)
  }

  return { scroller, board, scale, zoomBy, fitMap }
}
