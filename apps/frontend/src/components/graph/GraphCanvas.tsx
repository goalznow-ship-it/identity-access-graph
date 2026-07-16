import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { DependencyInfo, GraphData, GraphLayout, GraphLink, GraphNode, HighlightMode } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'

export interface GraphCanvasHandle { zoomIn: () => void; zoomOut: () => void; fit: () => void; reset: () => void; center: (node: GraphNode) => void; setLayout: (layout: GraphLayout) => void; exportPng: () => void }
export type GraphContextAction = 'details' | 'profile' | 'center' | 'expand' | 'collapse' | 'hide' | 'pin' | 'dependencies'

interface GraphCanvasProps {
  data: GraphData
  selectedNode: GraphNode | null
  highlightMode: HighlightMode
  dependencyInfo: DependencyInfo | null
  onNodeClick: (node: GraphNode | null) => void
  onBackgroundClick: () => void
  onContextAction?: (action: GraphContextAction, node: GraphNode, direction?: 'both' | 'incoming' | 'outgoing', depth?: number) => void
  attackPathNodeIds?: string[]
  attackPathLinkIds?: string[]
  onLinkClick?: (link: GraphLink) => void
}

const LABELED = new Set(['MEMBER_OF', 'HAS_ROLE', 'HAS_ACCESS_TO', 'REPORTS_TO', 'BELONGS_TO', 'RUNS_ON', 'SUPPORTS', 'USES'])

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas({ data, selectedNode, highlightMode, dependencyInfo, onNodeClick, onBackgroundClick, onContextAction, attackPathNodeIds = [], attackPathLinkIds = [], onLinkClick }, ref) {
  const fgRef = useRef<any>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [menu, setMenu] = useState<{ node: GraphNode; x: number; y: number } | null>(null)
  const [direction, setDirection] = useState<'both' | 'incoming' | 'outgoing'>('both')
  const [depth, setDepth] = useState(1)
  const upstream = useMemo(() => new Set(dependencyInfo ? [...dependencyInfo.upstream, ...dependencyInfo.allUpstream] : []), [dependencyInfo])
  const downstream = useMemo(() => new Set(dependencyInfo ? [...dependencyInfo.downstream, ...dependencyInfo.allDownstream] : []), [dependencyInfo])
  const hasSelection = Boolean(selectedNode && highlightMode !== 'none')
  const attackNodes = useMemo(() => new Set(attackPathNodeIds), [attackPathNodeIds])
  const attackLinks = useMemo(() => new Set(attackPathLinkIds), [attackPathLinkIds])
  const dense = data.links.length > 150 || data.links.length > data.nodes.length * 4

  const applyLayout = useCallback((layout: GraphLayout) => {
    const nodes = data.nodes
    if (layout === 'force') { nodes.forEach((node) => { node.fx = undefined; node.fy = undefined }); fgRef.current?.d3ReheatSimulation(); return }
    const groups = new Map<string, GraphNode[]>(); nodes.forEach((node) => { const key = layout === 'hierarchy' ? node.nodeType : node.nodeType; if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(node) })
    if (layout === 'radial') nodes.forEach((node, index) => { const angle = index / Math.max(1,nodes.length) * Math.PI * 2; node.fx = Math.cos(angle) * 260; node.fy = Math.sin(angle) * 260 })
    if (layout === 'hierarchy') [...groups.values()].forEach((group, row) => group.forEach((node, column) => { node.fx = (column - (group.length - 1) / 2) * 110; node.fy = (row - (groups.size - 1) / 2) * 100 }))
    if (layout === 'concentric') [...groups.values()].forEach((group, ring) => group.forEach((node, index) => { const radius = 70 + ring * 70; const angle = index / Math.max(1,group.length) * Math.PI * 2; node.fx = Math.cos(angle) * radius; node.fy = Math.sin(angle) * radius }))
    fgRef.current?.d3ReheatSimulation(); window.setTimeout(() => fgRef.current?.zoomToFit(300, 40), 50)
  }, [data.nodes])

  useImperativeHandle(ref, () => ({
    zoomIn: () => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 250),
    zoomOut: () => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 250),
    fit: () => fgRef.current?.zoomToFit(400, 40),
    reset: () => { fgRef.current?.zoom(1, 250); fgRef.current?.centerAt(0, 0, 250) },
    center: (node) => { fgRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 350); fgRef.current?.zoom(2, 350) },
    setLayout: applyLayout,
    exportPng: () => { const canvas = document.querySelector('.graph-canvas-host canvas') as HTMLCanvasElement | null; if (!canvas) return; const link = document.createElement('a'); link.download = 'identity-graph.png'; link.href = canvas.toDataURL('image/png'); link.click() },
  }), [applyLayout])

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const graphNode = node as GraphNode
    const size = Math.max(4, 24 / (1 + Math.log(typeof graphNode.properties?.edges === 'number' ? graphNode.properties.edges : 1)))
    const isSelected = graphNode.id === selectedNode?.id
    ctx.globalAlpha = hasSelection && !isSelected && !upstream.has(graphNode.id) && !downstream.has(graphNode.id) ? 0.2 : 1
    ctx.beginPath(); ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
    ctx.fillStyle = attackNodes.has(graphNode.id) ? '#f97316' : upstream.has(graphNode.id) ? '#ef4444' : downstream.has(graphNode.id) ? '#22c55e' : getNodeColor(graphNode)
    ctx.fill()
    if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke() }
    if (scale >= 0.7) { ctx.fillStyle = '#cbd5e1'; ctx.font = `${Math.max(10, 12 / scale)}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(graphNode.displayName, node.x, node.y + size + 3) }
    ctx.globalAlpha = 1
  }, [selectedNode, hasSelection, upstream, downstream, attackNodes])

  const linkColor = useCallback((link: any) => {
    if (attackLinks.has(link.id)) return '#f97316'
    if (!hasSelection) return 'rgba(255,255,255,.16)'
    const source = typeof link.source === 'object' ? link.source.id : link.source
    const target = typeof link.target === 'object' ? link.target.id : link.target
    if (upstream.has(source) || upstream.has(target)) return '#ef4444'
    if (downstream.has(source) || downstream.has(target)) return '#22c55e'
    return 'rgba(255,255,255,.04)'
  }, [hasSelection, upstream, downstream, attackLinks])

  const drawLinkLabel = useCallback((link: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const graphLink = link as GraphLink
    if (dense || !LABELED.has(graphLink.relationshipType) || scale < 0.8 || typeof link.source !== 'object' || typeof link.target !== 'object') return
    const x = (link.source.x + link.target.x) / 2; const y = (link.source.y + link.target.y) / 2
    ctx.font = `${Math.max(8, 9 / scale)}px Inter`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(203,213,225,.8)'; ctx.fillText(graphLink.relationshipType, x, y)
  }, [dense])

  useEffect(() => { fgRef.current?.d3ReheatSimulation() }, [data])
  useEffect(() => { const host = hostRef.current; if (!host) return; const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(320, entry.contentRect.width), height: Math.max(320, entry.contentRect.height) })); observer.observe(host); return () => observer.disconnect() }, [])
  const action = (value: GraphContextAction) => { if (!menu) return; if (value === 'center') fgRef.current && ref && fgRef.current.centerAt(menu.node.x ?? 0, menu.node.y ?? 0, 350); onContextAction?.(value, menu.node, direction, depth); setMenu(null) }

  return <div ref={hostRef} className="graph-canvas-host relative h-full w-full" onClick={() => setMenu(null)}>
    <ForceGraph2D ref={fgRef} graphData={data} nodeCanvasObject={nodeCanvasObject} linkColor={linkColor} linkWidth={0.7} linkDirectionalArrowLength={3} linkDirectionalArrowRelPos={1} linkCanvasObjectMode={() => 'after'} linkCanvasObject={drawLinkLabel} onNodeClick={(node: any) => onNodeClick(node as GraphNode)} onLinkClick={(link: any) => onLinkClick?.(link as GraphLink)} onNodeRightClick={(node: any, event: MouseEvent) => { event.preventDefault(); setMenu({ node: node as GraphNode, x: event.offsetX, y: event.offsetY }) }} onBackgroundClick={onBackgroundClick} cooldownTicks={100} d3AlphaDecay={0.02} d3VelocityDecay={0.3} enableNodeDrag width={size.width} height={size.height} minZoom={0.1} maxZoom={10} />
    {menu && <div className="absolute z-50 w-52 rounded border border-border bg-surface p-1 text-xs shadow-xl" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
      <div className="border-b border-border px-2 py-1 font-medium text-gray-200">{menu.node.displayName}</div>
      {([['details','Open details'],['profile','Open 360 profile'],['center','Center'],['collapse','Collapse'],['hide','Hide'],['pin','Pin'],['dependencies','Show dependencies']] as [GraphContextAction,string][]).map(([value,label]) => <button key={value} className="block w-full rounded px-2 py-1.5 text-left text-gray-300 hover:bg-white/5" onClick={() => action(value)}>{label}</button>)}
      <div className="mt-1 border-t border-border p-1"><div className="mb-1 text-gray-500">Expand neighbors</div><div className="flex gap-1"><select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)} className="min-w-0 flex-1 bg-card"><option value="both">Both</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select><select value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="bg-card">{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded bg-primary px-2" onClick={() => action('expand')}>Go</button></div></div>
    </div>}
  </div>
})
