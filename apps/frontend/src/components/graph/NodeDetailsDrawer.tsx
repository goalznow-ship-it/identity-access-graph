import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Terminal, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getNodeColor } from '../../services/graphDataAdapter'
import type { GraphNode, GraphLink, GraphData } from '../../types/graph'

interface NodeDetailsDrawerProps {
  node: GraphNode | null
  data: GraphData | null
  onClose: () => void
  onCenter?: (node: GraphNode) => void
  onPin?: (node: GraphNode) => void
  onDependencies?: (node: GraphNode) => void
}

function RelationshipsList({ title, links, nodes }: { title: string; links: GraphLink[]; nodes: Map<string, GraphNode> }) {
  if (links.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title} ({links.length})</p>
      <div className="space-y-0.5">
        {links.slice(0, 20).map((l) => {
          const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
          const target = nodes.get(targetId)
          return (
            <div key={l.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs">
              <span className="rounded bg-white/[0.04] px-1 py-0.5 text-[9px] font-medium text-gray-500">{l.relationshipType}</span>
              <span className="truncate text-gray-300">{target?.displayName ?? targetId}</span>
            </div>
          )
        })}
        {links.length > 20 && <p className="text-[10px] text-gray-600">…and {links.length - 20} more</p>}
      </div>
    </div>
  )
}

export function NodeDetailsDrawer({ node, data, onClose, onCenter, onPin, onDependencies }: NodeDetailsDrawerProps) {
  const navigate = useNavigate()
  if (!node) return null

  const nodeMap = new Map(data?.nodes.map((n) => [n.id, n]) ?? [])
  const incomingLinks = data?.links.filter((l) => (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === node.id) ?? []
  const outgoingLinks = data?.links.filter((l) => (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === node.id) ?? []

  const isUser = node.nodeType === 'USER' || node.nodeType === 'LINUX_USER'
  const isHost = node.nodeType === 'HOST' || node.nodeType === 'COMPUTER'
  const skipKeys = new Set(['id', 'displayName', 'nodeType', 'sourceSystem', 'riskLevel', 'description', 'sourceId', 'metadata', 'createdAt', 'updatedAt', 'status', 'tags', 'enabled', 'deleted', 'critical', '__pinned'])
  const color = getNodeColor(node)

  const riskStyles: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
    NONE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  return (
    <AnimatePresence>
      <motion.aside
        key={node.id}
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-80 border-l border-border bg-surface shadow-2xl"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ backgroundColor: `${color}20`, color }}>{node.nodeType === 'USER' ? node.displayName.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() : node.nodeType.slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-gray-100">{node.displayName}</h3>
              <p className="truncate text-[10px] text-gray-500">{node.nodeType} · {node.sourceSystem}{node.riskLevel !== 'NONE' ? ` · ${node.riskLevel} risk` : ''}</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {isUser && <button onClick={() => { onClose(); navigate(`/identities/${node.id}`) }} className="rounded-lg p-1.5 text-primary transition hover:bg-primary-muted"><ExternalLink className="h-3.5 w-3.5" /></button>}
              {isHost && <button onClick={() => { onClose(); navigate(`/linux-admin?hostId=${node.id}`) }} className="rounded-lg p-1.5 text-teal-400 transition hover:bg-teal-500/10"><Terminal className="h-3.5 w-3.5" /></button>}
              <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/5 hover:text-gray-200"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border px-4 py-2">
            <button onClick={() => onCenter?.(node)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 transition hover:bg-white/5 hover:text-gray-200">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> Center
            </button>
            <button onClick={() => onPin?.(node)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 transition hover:bg-white/5 hover:text-gray-200">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pin
            </button>
            <button onClick={() => onDependencies?.(node)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 transition hover:bg-white/5 hover:text-gray-200"><GitBranch className="h-3 w-3" /> Deps</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {node.description && <p className="rounded-lg bg-card px-3 py-2 text-xs leading-relaxed text-gray-400">{node.description}</p>}

              <div className="grid grid-cols-2 gap-2">
                <InfoCard label="Type" value={node.nodeType} />
                <InfoCard label="Risk" value={node.riskLevel} className={riskStyles[node.riskLevel]} />
                <InfoCard label="Source" value={node.sourceSystem} />
                <InfoCard label="Status" value={String(node.properties.status ?? 'Unknown')} />
                {node.sourceId && <InfoCard label="Source ID" value={node.sourceId} className="col-span-2" />}
              </div>

              <RelationshipsList title="Incoming" links={incomingLinks} nodes={nodeMap} />
              <RelationshipsList title="Outgoing" links={outgoingLinks} nodes={nodeMap} />

              {Object.entries(node.properties).filter(([k]) => !skipKeys.has(k)).length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Properties</p>
                  <div className="space-y-0.5">
                    {Object.entries(node.properties).filter(([k]) => !skipKeys.has(k)).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-card px-3 py-1.5 text-xs">
                        <span className="text-gray-500">{k}: </span>
                        <span className="text-gray-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

function InfoCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card px-3 py-2 ${className}`}>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-xs font-medium text-gray-200">{value}</p>
    </div>
  )
}
