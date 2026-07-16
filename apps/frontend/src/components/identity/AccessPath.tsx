import { motion } from 'framer-motion'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import type { PathNode } from '../../types/identity'

interface AccessPathProps {
  nodes: PathNode[]
  direct: boolean
  index: number
}

const typeColors: Record<string, string> = {
  USER: '#3b82f6',
  GROUP: '#22c55e',
  ROLE: '#f97316',
  PERMISSION: '#eab308',
  APPLICATION: '#06b6d4',
  DATABASE: '#ec4899',
  BUSINESS_SERVICE: '#ef4444',
  HOST: '#a855f7',
  LINUX_USER: '#14b8a6',
  LINUX_GROUP: '#14b8a6',
  SUDO_POLICY: '#14b8a6',
  SSH_KEY: '#14b8a6',
}

export function AccessPath({ nodes, direct, index }: AccessPathProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Path #{index + 1}</span>
          {direct ? (
            <Badge variant="success">Direct</Badge>
          ) : (
            <Badge variant="warning">Inherited</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {nodes.map((pn, j) => (
            <span key={pn.id} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: typeColors[pn.nodeType] ?? '#6b7280' }} />
                <span className="text-gray-200">{pn.displayName}</span>
                <span className="text-gray-500">{pn.nodeType}</span>
              </span>
              {j < nodes.length - 1 && (
                <span className="text-xs text-gray-600">{pn.relationshipType}</span>
              )}
              {j < nodes.length - 1 && (
                <svg className="h-3 w-3 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-xs text-gray-500">
          <span>Source: {nodes[nodes.length - 1]?.sourceSystem}</span>
          <span>Risk: {nodes[nodes.length - 1]?.riskLevel}</span>
        </div>
      </Card>
    </motion.div>
  )
}
