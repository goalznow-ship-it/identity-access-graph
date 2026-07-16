import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Terminal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import type { GraphNode, GraphLink, GraphData } from '../../types/graph'

interface NodeDetailsDrawerProps {
  node: GraphNode | null
  data: GraphData | null
  onClose: () => void
  onCenter?: (node: GraphNode) => void
  onPin?: (node: GraphNode) => void
  onDependencies?: (node: GraphNode) => void
}

const riskBadge: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  NONE: 'primary',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

function RelationshipsList({ title, links, nodes }: { title: string; links: GraphLink[]; nodes: Map<string, GraphNode> }) {
  if (links.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-400">{title} ({links.length})</p>
      <div className="space-y-1">
        {links.map((l) => {
          const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
          const target = nodes.get(targetId)
          return (
            <div key={l.id} className="rounded-md bg-card px-2 py-1.5 text-xs text-gray-300">
              <span className="text-gray-500">{l.relationshipType}</span>
              {' → '}
              <span>{target?.displayName ?? targetId}</span>
            </div>
          )
        })}
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
  const skipKeys = new Set(['id', 'displayName', 'nodeType', 'sourceSystem', 'riskLevel', 'description', 'sourceId', 'metadata', 'createdAt', 'updatedAt', 'status', 'tags', 'enabled', 'deleted', 'critical'])

  return (
    <AnimatePresence>
      <motion.aside
        key={node.id}
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-80 border-l border-border bg-surface"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="truncate text-sm font-semibold text-gray-100">{node.displayName}</h3>
            <div className="flex items-center gap-1">
              {isUser && (
                <button
                  onClick={() => { onClose(); navigate(`/identities/${node.id}`) }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary-muted"
                >
                  Open full profile
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {isHost && (
                <button
                  onClick={() => { onClose(); navigate(`/linux-admin?hostId=${node.id}`) }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-400 hover:bg-teal-500/10"
                >
                  <Terminal className="h-3 w-3" />
                  Linux Admin
                </button>
              )}
              <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-white/5 hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="primary">{node.nodeType}</Badge>
                <Badge variant={riskBadge[node.riskLevel] ?? 'primary'}>{node.riskLevel}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="rounded bg-card px-2 py-1 text-xs text-gray-300" onClick={() => onCenter?.(node)}>Center</button>
                <button className="rounded bg-card px-2 py-1 text-xs text-gray-300" onClick={() => onPin?.(node)}>Pin</button>
                <button className="rounded bg-card px-2 py-1 text-xs text-gray-300" onClick={() => onDependencies?.(node)}>Show dependencies</button>
              </div>

              <div className="space-y-1.5 text-xs">
                {node.description && (
                  <p className="text-gray-400">{node.description}</p>
                )}
                <div>
                  <span className="text-gray-500">ID: </span>
                  <span className="text-gray-300">{node.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Source: </span>
                  <span className="text-gray-300">{node.sourceSystem}</span>
                </div>
                {node.sourceId && (
                  <div>
                    <span className="text-gray-500">Source ID: </span>
                    <span className="text-gray-300">{node.sourceId}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              <RelationshipsList title="Incoming" links={incomingLinks} nodes={nodeMap} />
              <RelationshipsList title="Outgoing" links={outgoingLinks} nodes={nodeMap} />

              {Object.entries(node.properties).filter(([k]) => !skipKeys.has(k)).length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-400">Properties</p>
                    <div className="space-y-1">
                      {Object.entries(node.properties)
                        .filter(([k]) => !skipKeys.has(k))
                        .map(([k, v]) => (
                          <div key={k} className="rounded bg-card px-2 py-1 text-xs">
                            <span className="text-gray-500">{k}: </span>
                            <span className="text-gray-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
