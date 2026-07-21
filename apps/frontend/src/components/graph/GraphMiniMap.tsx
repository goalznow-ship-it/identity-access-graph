import { useEffect, useRef } from 'react'
import type { GraphData, GraphNode } from '../../types/graph'

export function GraphMiniMap({ data, selected, onNavigate }: { data: GraphData; selected: GraphNode | null; onNavigate: (x: number, y: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bounds = () => {
    const xs = data.nodes.map(n => n.x ?? 0)
    const ys = data.nodes.map(n => n.y ?? 0)
    return { minX: Math.min(...xs, 0), maxX: Math.max(...xs, 1), minY: Math.min(...ys, 0), maxY: Math.max(...ys, 1) }
  }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const b = bounds()
    const pad = 8
    const w = 170 - pad * 2
    const h = 108 - pad * 2
    const sx = w / Math.max(1, b.maxX - b.minX)
    const sy = h / Math.max(1, b.maxY - b.minY)
    const project = (n: GraphNode) => [pad + ((n.x ?? 0) - b.minX) * sx, pad + ((n.y ?? 0) - b.minY) * sy] as const
    ctx.clearRect(0, 0, 170, 108)
    ctx.fillStyle = 'rgba(2,6,23,0.88)'
    ctx.beginPath()
    ctx.roundRect(2, 2, 166, 104, 8)
    ctx.fill()

    const linkCount = data.links.length
    const nodeCount = data.nodes.length
    const linkStep = Math.max(1, Math.ceil(linkCount / 3000))
    const nodeStep = Math.max(1, Math.ceil(nodeCount / 2000))
    ctx.strokeStyle = 'rgba(71,85,105,0.25)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < linkCount; i += linkStep) {
      const link = data.links[i]
      const s = typeof link.source === 'object' ? link.source : data.nodes.find(n => n.id === link.source)
      const t = typeof link.target === 'object' ? link.target : data.nodes.find(n => n.id === link.target)
      if (!s || !t) continue
      const [a, bp] = [project(s), project(t)]
      ctx.beginPath()
      ctx.moveTo(...a)
      ctx.lineTo(...bp)
      ctx.stroke()
    }
    for (let i = 0; i < nodeCount; i += nodeStep) {
      const node = data.nodes[i]
      const [x, y] = project(node)
      if (node.id === selected?.id) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = ['CRITICAL', 'HIGH'].includes(node.riskLevel) ? '#f97316' : '#38bdf8'
        ctx.globalAlpha = node.riskLevel === 'CRITICAL' ? 0.9 : 0.5
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }, [data, selected])
  return (
    <canvas
      ref={ref}
      width={170}
      height={108}
      aria-label="Graph minimap"
      title="Click to navigate"
      className="absolute bottom-3 right-3 z-10 cursor-crosshair overflow-hidden rounded-xl border border-border shadow-2xl"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const b = bounds()
        onNavigate(
          b.minX + (event.clientX - rect.left) / rect.width * (b.maxX - b.minX),
          b.minY + (event.clientY - rect.top) / rect.height * (b.maxY - b.minY)
        )
      }}
    />
  )
}
