import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { DependencyInfo, GraphData, GraphLayout, GraphLink, GraphNode, HighlightMode } from '../../types/graph'
import { renderGraphNode } from './GraphNodeRenderer'
import { edgeColor, edgeDash, edgeWidth } from './GraphEdgeRenderer'
import { GraphHoverTooltip } from './GraphHoverTooltip'

export interface GraphCanvasHandle { zoomIn: () => void; zoomOut: () => void; fit: () => void; reset: () => void; center: (node: GraphNode) => void; freeze: (value: boolean) => void; setLayout: (layout: GraphLayout) => void; exportPng: () => void }
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
  onNodeDoubleClick?: (node: GraphNode) => void
  selectedLinkId?: string
  shortestPathNodeIds?: string[]
  shortestPathLinkIds?: string[]
  onZoomChange?: (zoom: number) => void
}

const LABELED = new Set(['MEMBER_OF', 'HAS_ROLE', 'HAS_ACCESS_TO', 'REPORTS_TO', 'BELONGS_TO', 'RUNS_ON', 'SUPPORTS', 'USES'])

function collisionForce(radius = 30) {
  let nodes: GraphNode[] = []
  const force = (alpha: number) => { const buckets = new Map<string, GraphNode[]>(); nodes.forEach((node) => { const x = node.x ?? 0; const y = node.y ?? 0; const gx = Math.floor(x / radius); const gy = Math.floor(y / radius); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) buckets.get(`${gx + dx}:${gy + dy}`)?.forEach((other) => { const ox = x - (other.x ?? 0); const oy = y - (other.y ?? 0); const distance = Math.hypot(ox, oy) || .1; if (distance < radius) { const push = (radius - distance) / distance * alpha * .35; if (node.fx == null) { node.vx = (node.vx ?? 0) + ox * push; node.vy = (node.vy ?? 0) + oy * push } } }); const key = `${gx}:${gy}`; const bucket = buckets.get(key) ?? []; bucket.push(node); buckets.set(key, bucket) }) }
  force.initialize = (value: GraphNode[]) => { nodes = value }
  return force
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas({ data, selectedNode, highlightMode, dependencyInfo, onNodeClick, onBackgroundClick, onContextAction, attackPathNodeIds = [], attackPathLinkIds = [], onLinkClick, onNodeDoubleClick, selectedLinkId, shortestPathNodeIds = [], shortestPathLinkIds = [], onZoomChange }, ref) {
  const fgRef = useRef<any>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [menu, setMenu] = useState<{ node: GraphNode; x: number; y: number } | null>(null)
  const [direction, setDirection] = useState<'both' | 'incoming' | 'outgoing'>('both')
  const [depth, setDepth] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const lastClick = useRef<{ id: string; time: number } | null>(null)
  const upstream = useMemo(() => new Set(dependencyInfo ? [...dependencyInfo.upstream, ...dependencyInfo.allUpstream] : []), [dependencyInfo])
  const downstream = useMemo(() => new Set(dependencyInfo ? [...dependencyInfo.downstream, ...dependencyInfo.allDownstream] : []), [dependencyInfo])
  const hasSelection = Boolean(selectedNode && highlightMode !== 'none')
  const attackNodes = useMemo(() => new Set(attackPathNodeIds), [attackPathNodeIds])
  const attackLinks = useMemo(() => new Set(attackPathLinkIds), [attackPathLinkIds])
  const shortestNodes = useMemo(() => new Set(shortestPathNodeIds), [shortestPathNodeIds])
  const shortestLinks = useMemo(() => new Set(shortestPathLinkIds), [shortestPathLinkIds])
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
    freeze: (value) => { data.nodes.forEach((node) => { node.fx = value ? node.x ?? 0 : undefined; node.fy = value ? node.y ?? 0 : undefined }); if (!value) fgRef.current?.d3ReheatSimulation() },
    setLayout: applyLayout,
    exportPng: () => { const canvas = document.querySelector('.graph-canvas-host canvas') as HTMLCanvasElement | null; if (!canvas) return; const link = document.createElement('a'); link.download = 'identity-graph.png'; link.href = canvas.toDataURL('image/png'); link.click() },
  }), [applyLayout])

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const graphNode = node as GraphNode
    const isSelected = graphNode.id === selectedNode?.id
    const related = upstream.has(graphNode.id) || downstream.has(graphNode.id) || attackNodes.has(graphNode.id) || shortestNodes.has(graphNode.id)
    renderGraphNode(ctx, graphNode, scale, { selected: isSelected, hovered: hoveredNode?.id === graphNode.id, related, dimmed: hasSelection && !isSelected && !related, upstream: upstream.has(graphNode.id), downstream: downstream.has(graphNode.id), attack: attackNodes.has(graphNode.id), shortest: shortestNodes.has(graphNode.id) })
  }, [selectedNode, hoveredNode, hasSelection, upstream, downstream, attackNodes, shortestNodes])

  const linkState = useCallback((link: any) => {
    const source = typeof link.source === 'object' ? link.source.id : link.source; const target = typeof link.target === 'object' ? link.target.id : link.target
    return { selected: link.id === selectedLinkId, shortest: shortestLinks.has(link.id), attack: attackLinks.has(link.id), upstream: upstream.has(source) || upstream.has(target), downstream: downstream.has(source) || downstream.has(target), dimmed: hasSelection && !upstream.has(source) && !upstream.has(target) && !downstream.has(source) && !downstream.has(target) }
  }, [selectedLinkId, shortestLinks, attackLinks, upstream, downstream, hasSelection])

  const linkColor = useCallback((link: any) => {
    return edgeColor(linkState(link))
  }, [linkState])

  const drawLinkLabel = useCallback((link: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const graphLink = link as GraphLink
    if (dense || !LABELED.has(graphLink.relationshipType) || scale < 0.8 || typeof link.source !== 'object' || typeof link.target !== 'object') return
    const x = (link.source.x + link.target.x) / 2; const y = (link.source.y + link.target.y) / 2
    ctx.font = `${Math.max(8, 9 / scale)}px Inter`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(203,213,225,.8)'; ctx.fillText(graphLink.relationshipType, x, y)
  }, [dense])

  useEffect(() => {
    const byId = new Map(data.nodes.map((node) => [node.id, node])); const neighbors = new Map(data.nodes.map((node) => [node.id, [] as string[]]))
    data.links.forEach((link: any) => { const source = typeof link.source === 'object' ? link.source.id : link.source; const target = typeof link.target === 'object' ? link.target.id : link.target; neighbors.get(source)?.push(target); neighbors.get(target)?.push(source) })
    const seen = new Set<string>(); const components: GraphNode[][] = []
    data.nodes.forEach((start) => { if (seen.has(start.id)) return; const component: GraphNode[] = []; const queue = [start.id]; seen.add(start.id); while (queue.length) { const id = queue.shift()!; const node = byId.get(id); if (node) component.push(node); neighbors.get(id)?.forEach((next) => { if (!seen.has(next)) { seen.add(next); queue.push(next) } }) } components.push(component) })
    components.sort((a, b) => b.length - a.length).forEach((component, componentIndex) => { const angle = componentIndex * 2.4; const distance = componentIndex ? 180 + Math.ceil(Math.sqrt(componentIndex)) * 140 : 0; const ox = Math.cos(angle) * distance; const oy = Math.sin(angle) * distance; component.forEach((node, index) => { if (node.x == null) node.x = ox + Math.cos(index * 2.4) * Math.sqrt(index) * 18; if (node.y == null) node.y = oy + Math.sin(index * 2.4) * Math.sqrt(index) * 18 }) })
    fgRef.current?.d3ReheatSimulation(); fgRef.current?.d3Force('charge')?.strength(-180).distanceMax(650); fgRef.current?.d3Force('link')?.distance((link: any) => ['MEMBER_OF','BELONGS_TO'].includes(link.relationshipType) ? 90 : 135); fgRef.current?.d3Force('collision', collisionForce())
  }, [data])
  useEffect(() => { const host = hostRef.current; if (!host) return; const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(320, entry.contentRect.width), height: Math.max(320, entry.contentRect.height) })); observer.observe(host); return () => observer.disconnect() }, [])
  const action = (value: GraphContextAction) => { if (!menu) return; if (value === 'center') fgRef.current && ref && fgRef.current.centerAt(menu.node.x ?? 0, menu.node.y ?? 0, 350); onContextAction?.(value, menu.node, direction, depth); setMenu(null) }

  const degree = hoveredNode ? data.links.filter((link: any) => (typeof link.source === 'object' ? link.source.id : link.source) === hoveredNode.id || (typeof link.target === 'object' ? link.target.id : link.target) === hoveredNode.id).length : 0
  return <div ref={hostRef} className="graph-canvas-host relative h-full w-full" onClick={() => setMenu(null)} onMouseMove={(event) => setPointer({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}>
    <ForceGraph2D ref={fgRef} graphData={data} nodeCanvasObject={nodeCanvasObject} nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(node.x, node.y, 18, 0, Math.PI * 2); ctx.fill() }} linkColor={linkColor} linkWidth={(link: any) => edgeWidth(linkState(link))} linkLineDash={(link: any) => edgeDash(link as GraphLink)} linkDirectionalArrowLength={4} linkDirectionalArrowRelPos={1} linkCanvasObjectMode={() => 'after'} linkCanvasObject={drawLinkLabel} onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)} onNodeClick={(node: any) => { const now = Date.now(); const previous = lastClick.current; if (previous && previous.id === node.id && now - previous.time < 350) onNodeDoubleClick?.(node as GraphNode); else onNodeClick(node as GraphNode); lastClick.current = { id: node.id, time: now } }} onLinkClick={(link: any) => onLinkClick?.(link as GraphLink)} onNodeRightClick={(node: any, event: MouseEvent) => { event.preventDefault(); setMenu({ node: node as GraphNode, x: event.offsetX, y: event.offsetY }) }} onBackgroundClick={onBackgroundClick} onZoom={(transform: { k: number }) => onZoomChange?.(transform.k)} cooldownTicks={140} d3AlphaDecay={0.018} d3VelocityDecay={0.35} warmupTicks={30} enableNodeDrag width={size.width} height={size.height} minZoom={0.1} maxZoom={10} />
    <GraphHoverTooltip node={hoveredNode} position={pointer} degree={degree} />
    {menu && <div className="absolute z-50 w-52 rounded border border-border bg-surface p-1 text-xs shadow-xl" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
      <div className="border-b border-border px-2 py-1 font-medium text-gray-200">{menu.node.displayName}</div>
      {([['details','Open details'],['profile','Open 360 profile'],['center','Center'],['collapse','Collapse'],['hide','Hide'],['pin','Pin'],['dependencies','Show dependencies']] as [GraphContextAction,string][]).map(([value,label]) => <button key={value} className="block w-full rounded px-2 py-1.5 text-left text-gray-300 hover:bg-white/5" onClick={() => action(value)}>{label}</button>)}
      <div className="mt-1 border-t border-border p-1"><div className="mb-1 text-gray-500">Expand neighbors</div><div className="flex gap-1"><select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)} className="min-w-0 flex-1 bg-card"><option value="both">Both</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select><select value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="bg-card">{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded bg-primary px-2" onClick={() => action('expand')}>Go</button></div></div>
    </div>}
  </div>
})
