import data from './mockGraphData.json'
import type { GraphNode, GraphData } from '../types/graph'

export const NODE_TYPE_COLORS: Record<string, string> = {
  USER: '#3b82f6',
  GROUP: '#22c55e',
  ROLE: '#f97316',
  PERMISSION: '#eab308',
  MANAGER: '#a855f7',
  COMPUTER: '#a855f7',
  HOST: '#a855f7',
  APPLICATION: '#06b6d4',
  DATABASE: '#ec4899',
  DEPARTMENT: '#6366f1',
  TEAM: '#6366f1',
  BUSINESS_SERVICE: '#ef4444',
  FOREST: '#6b7280',
  DOMAIN: '#6b7280',
  ORGANIZATIONAL_UNIT: '#6b7280',
  SERVICE_ACCOUNT: '#8b5cf6',
  MANAGED_SERVICE_ACCOUNT: '#8b5cf6',
  OPERATING_SYSTEM: '#78716c',
  SITE: '#78716c',
  SUBNET: '#78716c',
  GROUP_POLICY: '#78716c',
  LINUX_USER: '#14b8a6',
  LINUX_GROUP: '#14b8a6',
  SUDO_POLICY: '#14b8a6',
  SSH_KEY: '#14b8a6',
}

export function buildGraphData(): GraphData {
  return data as GraphData
}

export function getNodeColor(node: GraphNode): string {
  return NODE_TYPE_COLORS[node.nodeType] ?? '#6b7280'
}
