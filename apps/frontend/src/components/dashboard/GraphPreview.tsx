import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { ExternalLink } from 'lucide-react'
import type { GraphData, GraphNode } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'

export default memo(function GraphPreview({ data }: { data: GraphData }) {
  const navigate = useNavigate(); const graphRef = useRef<any>(null); const hostRef = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(720)
  const preview = useMemo(() => { const nodes = data.nodes.slice(0, 80).map((node) => ({ ...node })); const ids = new Set(nodes.map((node) => node.id)); return { nodes, links: data.links.filter((link) => ids.has(String(link.source)) && ids.has(String(link.target))).slice(0, 180).map((link) => ({ ...link })) } }, [data])
  useEffect(() => { if (!hostRef.current) return; const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width))); observer.observe(hostRef.current); return () => observer.disconnect() }, [])
  return <section className="overflow-hidden rounded-xl border border-border bg-card/75 shadow-glass xl:col-span-2"><div className="flex items-center justify-between border-b border-border px-5 py-3"><div><h2 className="text-sm font-semibold text-gray-200">Identity Relationship Graph</h2><p className="text-[11px] text-gray-500">Live topology preview · select an identity to investigate</p></div><button onClick={() => navigate('/graph')} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-gray-300 hover:border-primary/40 hover:text-white">Open Full Graph <ExternalLink className="h-3.5 w-3.5" /></button></div><div ref={hostRef} className="h-[360px]"><ForceGraph2D ref={graphRef} graphData={preview} width={width} height={360} backgroundColor="rgba(0,0,0,0)" nodeColor={(node: any) => getNodeColor(node as GraphNode)} nodeRelSize={5} linkColor={() => 'rgba(148,163,184,.18)'} linkWidth={.7} linkDirectionalArrowLength={2.5} cooldownTicks={70} onNodeClick={(node: any) => navigate(`/identities/${node.id}`)} onEngineStop={() => graphRef.current?.zoomToFit(300, 30)} /></div></section>
})
