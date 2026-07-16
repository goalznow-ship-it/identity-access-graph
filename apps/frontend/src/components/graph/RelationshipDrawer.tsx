import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { GraphData, GraphLink, GraphNode } from '../../types/graph'

const endpoint = (value: string | GraphNode) => typeof value === 'object' ? value.id : value
export function RelationshipDrawer({ link, data, onClose }: { link: GraphLink | null; data: GraphData; onClose: () => void }) {
  if (!link) return null
  const source = data.nodes.find((node) => node.id === endpoint(link.source)); const target = data.nodes.find((node) => node.id === endpoint(link.target))
  return <AnimatePresence><motion.aside initial={{ y: 180, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 180, opacity: 0 }} className="fixed bottom-4 left-1/2 z-50 w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-4 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs uppercase text-gray-500">Relationship</p><h3 className="font-semibold text-primary">{link.relationshipType}</h3></div><button onClick={onClose}><X className="h-4 w-4" /></button></div><div className="mt-3 flex items-center gap-3 text-sm"><span className="rounded bg-card px-2 py-1">{source?.displayName ?? endpoint(link.source)}</span><span className="text-gray-500">→</span><span className="rounded bg-card px-2 py-1">{target?.displayName ?? endpoint(link.target)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400"><span>ID: {link.id}</span><span>Source: {link.sourceSystem}</span></div></motion.aside></AnimatePresence>
}
