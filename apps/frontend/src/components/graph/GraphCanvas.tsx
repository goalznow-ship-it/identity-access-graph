import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { DependencyInfo, GraphData, GraphLayout, GraphLink, GraphNode, HighlightMode } from '../../types/graph'
import { renderGraphNode } from './GraphNodeRenderer'
import { edgeColor, edgeDash, edgeWidth } from './GraphEdgeRenderer'
import { GraphHoverTooltip } from './GraphHoverTooltip'
import { disconnectedComponentPositions, nodeCollisionRadius } from '../../services/graphPresentation'

export interface GraphCanvasHandle { zoomIn: () => void; zoomOut: () => void; fit: () => void; reset: () => void; center: (node: GraphNode) => void; centerAt: (x:number,y:number) => void; freeze: (value: boolean) => void; setLayout: (layout: GraphLayout) => void; exportPng: () => void }
export type GraphContextAction = 'details' | 'profile' | 'center' | 'expand' | 'collapse' | 'hide' | 'pin' | 'dependencies' | 'paths-from' | 'paths-to' | 'privileged-reachability' | 'attack-workspace'

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

function collisionForce() {
  let nodes: GraphNode[] = []
  const force = (alpha: number) => { const cell=72;const buckets = new Map<string, GraphNode[]>(); nodes.forEach((node) => { const x=node.x??0,y=node.y??0,gx=Math.floor(x/cell),gy=Math.floor(y/cell);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)buckets.get(`${gx+dx}:${gy+dy}`)?.forEach((other)=>{const ox=x-(other.x??0),oy=y-(other.y??0),distance=Math.hypot(ox,oy)||.1,radius=(nodeCollisionRadius(node)+nodeCollisionRadius(other))*.55;if(distance<radius){const push=(radius-distance)/distance*alpha*.48;if(node.fx==null){node.vx=(node.vx??0)+ox*push;node.vy=(node.vy??0)+oy*push}}});const key=`${gx}:${gy}`,bucket=buckets.get(key)??[];bucket.push(node);buckets.set(key,bucket)}) }
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
  const autoFitKey = useRef('')
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
    if (layout === 'force') { nodes.forEach((node) => { if(node.properties.__pinned!==true){node.fx=undefined;node.fy=undefined} }); fgRef.current?.d3ReheatSimulation(); return }
    const groups = new Map<string, GraphNode[]>(); nodes.forEach((node) => { const key=layout==='department'?String(node.properties.department??'Unassigned'):layout==='source'?node.sourceSystem:node.nodeType;if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(node) })
    if (layout === 'radial') nodes.forEach((node, index) => { const angle = index / Math.max(1,nodes.length) * Math.PI * 2; node.fx = Math.cos(angle) * 260; node.fy = Math.sin(angle) * 260 })
    if (layout === 'hierarchy-td') [...groups.values()].forEach((group,row)=>group.forEach((node,column)=>{node.fx=(column-(group.length-1)/2)*125;node.fy=(row-(groups.size-1)/2)*115}))
    if (layout === 'hierarchy-lr') [...groups.values()].forEach((group,column)=>group.forEach((node,row)=>{node.fx=(column-(groups.size-1)/2)*150;node.fy=(row-(group.length-1)/2)*90}))
    if (layout === 'concentric') [...groups.values()].forEach((group, ring) => group.forEach((node, index) => { const radius = 70 + ring * 70; const angle = index / Math.max(1,group.length) * Math.PI * 2; node.fx = Math.cos(angle) * radius; node.fy = Math.sin(angle) * radius }))
    if(layout==='department'||layout==='source')[...groups.values()].forEach((group,index)=>{const angle=index/Math.max(1,groups.size)*Math.PI*2,ox=Math.cos(angle)*(140+groups.size*28),oy=Math.sin(angle)*(140+groups.size*28);group.forEach((node,item)=>{const a=item/Math.max(1,group.length)*Math.PI*2;node.fx=ox+Math.cos(a)*(30+group.length*3);node.fy=oy+Math.sin(a)*(30+group.length*3)})})
    fgRef.current?.d3ReheatSimulation(); window.setTimeout(() => fgRef.current?.zoomToFit(300, 40), 50)
  }, [data.nodes])

  useImperativeHandle(ref, () => ({
    zoomIn: () => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 250),
    zoomOut: () => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 250),
    fit: () => fgRef.current?.zoomToFit(400, 40),
    reset: () => { fgRef.current?.zoom(1, 250); fgRef.current?.centerAt(0, 0, 250) },
    center: (node) => { fgRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 350); fgRef.current?.zoom(2, 350) },
    centerAt: (x,y) => fgRef.current?.centerAt(x,y,350),
    freeze: (value) => { data.nodes.forEach((node) => { node.fx=value?node.x??0:node.properties.__pinned===true?node.x:undefined;node.fy=value?node.y??0:node.properties.__pinned===true?node.y:undefined }); if (!value) fgRef.current?.d3ReheatSimulation() },
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
    return edgeColor(linkState(link),link as GraphLink)
  }, [linkState])

  const drawLinkLabel = useCallback((link: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const graphLink = link as GraphLink
    const state=linkState(link);const emphasized=state.selected||state.shortest||state.attack
    if ((!emphasized&&(dense||scale<.8)) || !LABELED.has(graphLink.relationshipType) || typeof link.source !== 'object' || typeof link.target !== 'object') return
    const x = (link.source.x + link.target.x) / 2; const y = (link.source.y + link.target.y) / 2
    ctx.font = `${Math.max(8, 9 / scale)}px Inter`;ctx.textAlign='center';const width=ctx.measureText(graphLink.relationshipType).width;ctx.fillStyle='rgba(2,6,23,.82)';ctx.fillRect(x-width/2-3,y-7,width+6,11);ctx.fillStyle=emphasized?'#67e8f9':'rgba(203,213,225,.8)';ctx.fillText(graphLink.relationshipType,x,y)
  }, [dense,linkState])

  useEffect(() => {
    const positions=disconnectedComponentPositions(data);data.nodes.forEach((node)=>{if(node.x==null){const position=positions.get(node.id);node.x=position?.x;node.y=position?.y}})
    fgRef.current?.d3ReheatSimulation();fgRef.current?.d3Force('charge')?.strength(data.nodes.length>1000?-115:-260).distanceMax(900);fgRef.current?.d3Force('link')?.distance((link:any)=>['MEMBER_OF','BELONGS_TO'].includes(link.relationshipType)?105:['HAS_ROLE','GRANTS','HAS_PERMISSION'].includes(link.relationshipType)?145:['RUNS_ON','SUPPORTS','USES'].includes(link.relationshipType)?175:130).strength(.45);fgRef.current?.d3Force('collision',collisionForce())
  }, [data])
  useEffect(() => { const host=hostRef.current;if(!host)return;let frame=0;const observer=new ResizeObserver(([entry])=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setSize({width:Math.max(320,entry.contentRect.width),height:Math.max(320,entry.contentRect.height)}))});observer.observe(host);return()=>{cancelAnimationFrame(frame);observer.disconnect()} }, [])
  const action = (value: GraphContextAction) => { if (!menu) return; if (value === 'center') fgRef.current && ref && fgRef.current.centerAt(menu.node.x ?? 0, menu.node.y ?? 0, 350); onContextAction?.(value, menu.node, direction, depth); setMenu(null) }

  const degree = hoveredNode ? data.links.filter((link: any) => (typeof link.source === 'object' ? link.source.id : link.source) === hoveredNode.id || (typeof link.target === 'object' ? link.target.id : link.target) === hoveredNode.id).length : 0
  return <div ref={hostRef} className="graph-canvas-host relative h-full w-full" onClick={() => setMenu(null)} onMouseMove={(event) => setPointer({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}>
    <ForceGraph2D ref={fgRef} graphData={data} nodeCanvasObject={nodeCanvasObject} nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(node.x, node.y, 18, 0, Math.PI * 2); ctx.fill() }} linkColor={linkColor} linkWidth={(link: any) => edgeWidth(linkState(link))} linkLineDash={(link: any) => edgeDash(link as GraphLink)} linkDirectionalArrowLength={4} linkDirectionalArrowRelPos={1} linkCanvasObjectMode={() => 'after'} linkCanvasObject={drawLinkLabel} onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)} onNodeClick={(node: any) => { const now = Date.now(); const previous = lastClick.current; if (previous && previous.id === node.id && now - previous.time < 350) onNodeDoubleClick?.(node as GraphNode); else onNodeClick(node as GraphNode); lastClick.current = { id: node.id, time: now } }} onLinkClick={(link: any) => onLinkClick?.(link as GraphLink)} onNodeRightClick={(node: any, event: MouseEvent) => { event.preventDefault(); setMenu({ node: node as GraphNode, x: event.offsetX, y: event.offsetY }) }} onBackgroundClick={onBackgroundClick} onZoom={(transform: { k: number }) => onZoomChange?.(transform.k)} onEngineStop={()=>{const key=data.nodes.map(node=>node.id).join('|');if(autoFitKey.current!==key){autoFitKey.current=key;fgRef.current?.zoomToFit(500,45)}}} cooldownTicks={data.nodes.length>1000?70:140} d3AlphaDecay={data.nodes.length>1000 ? .035 : .018} d3VelocityDecay={0.35} warmupTicks={data.nodes.length>1000?12:30} enableNodeDrag width={size.width} height={size.height} minZoom={0.1} maxZoom={10} />
    <GraphHoverTooltip node={hoveredNode} position={pointer} degree={degree} />
    {menu && <div className="absolute z-50 w-52 rounded border border-border bg-surface p-1 text-xs shadow-xl" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
      <div className="border-b border-border px-2 py-1 font-medium text-gray-200">{menu.node.displayName}</div>
      {([['details','Open details'],['profile','Open 360 profile'],['center','Center'],['collapse','Collapse'],['hide','Hide'],['pin','Pin'],['dependencies','Show dependencies'],['paths-from','Find paths from this node'],['paths-to','Find paths to this node'],['privileged-reachability','Show privileged reachability'],['attack-workspace','Open Attack Path workspace']] as [GraphContextAction,string][]).map(([value,label]) => <button key={value} className="block w-full rounded px-2 py-1.5 text-left text-gray-300 hover:bg-white/5" onClick={() => action(value)}>{label}</button>)}
      <div className="mt-1 border-t border-border p-1"><div className="mb-1 text-gray-500">Expand neighbors</div><div className="flex gap-1"><select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)} className="min-w-0 flex-1 bg-card"><option value="both">Both</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select><select value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="bg-card">{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded bg-primary px-2" onClick={() => action('expand')}>Go</button></div></div>
    </div>}
  </div>
})
