import type { GraphData, GraphLink, GraphNode } from '../types/graph'

export type PathDirection = 'directed' | 'undirected'
export interface PathResult { nodeIds: string[]; linkIds: string[]; depth: number }
export interface BlastRadiusResult { nodeIds: string[]; counts: { users: number; groups: number; hosts: number; apps: number; databases: number; businessServices: number } }
export interface AttackPathResult extends PathResult { explanation: string; riskScore: number }

const id = (value: string | GraphNode) => typeof value === 'object' ? value.id : value
const traversalCache = new Map<string, PathResult | BlastRadiusResult | null>()
const graphKey = (data: GraphData) => `${data.nodes.length}:${data.links.length}:${data.links.slice(0, 20).map((link) => link.id).join('|')}`

export function shortestPath(data: GraphData, sourceId: string, targetId: string, direction: PathDirection, maxDepth = 10, allowed?: (link: GraphLink) => boolean): PathResult | null {
  const cacheKey = `path:${graphKey(data)}:${sourceId}:${targetId}:${direction}:${maxDepth}:${allowed ? 'restricted' : 'all'}`
  if (traversalCache.has(cacheKey)) return traversalCache.get(cacheKey) as PathResult | null
  if (!sourceId || !targetId) return null
  const queue: { nodeId: string; nodes: string[]; links: string[] }[] = [{ nodeId: sourceId, nodes: [sourceId], links: [] }]
  const visited = new Set([sourceId])
  while (queue.length) {
    const current = queue.shift()!
    if (current.nodeId === targetId) { const result = { nodeIds: current.nodes, linkIds: current.links, depth: current.links.length }; traversalCache.set(cacheKey, result); return result }
    if (current.links.length >= Math.min(10, Math.max(1, maxDepth))) continue
    for (const link of data.links) {
      if (allowed && !allowed(link)) continue
      const source = id(link.source); const target = id(link.target)
      let next: string | undefined
      if (source === current.nodeId) next = target
      else if (direction === 'undirected' && target === current.nodeId) next = source
      if (!next || visited.has(next)) continue
      visited.add(next)
      queue.push({ nodeId: next, nodes: [...current.nodes, next], links: [...current.links, link.id] })
    }
  }
  traversalCache.set(cacheKey, null); return null
}

export function blastRadius(data: GraphData, sourceId: string, maxDepth = 10): BlastRadiusResult {
  const cacheKey = `blast:${graphKey(data)}:${sourceId}:${maxDepth}`
  if (traversalCache.has(cacheKey)) return traversalCache.get(cacheKey) as BlastRadiusResult
  const queue = [{ id: sourceId, depth: 0 }]; const visited = new Set<string>(sourceId ? [sourceId] : [])
  while (queue.length) {
    const current = queue.shift()!
    if (current.depth >= Math.min(10, Math.max(1, maxDepth))) continue
    for (const link of data.links) {
      if (id(link.source) !== current.id) continue
      const target = id(link.target)
      if (visited.has(target)) continue
      visited.add(target); queue.push({ id: target, depth: current.depth + 1 })
    }
  }
  const nodes = data.nodes.filter((node) => visited.has(node.id) && node.id !== sourceId)
  const count = (types: string[]) => nodes.filter((node) => types.includes(node.nodeType)).length
  const result = { nodeIds: [...visited], counts: { users: count(['USER','LINUX_USER','SERVICE_ACCOUNT']), groups: count(['GROUP','LINUX_GROUP']), hosts: count(['HOST','COMPUTER']), apps: count(['APPLICATION']), databases: count(['DATABASE']), businessServices: count(['BUSINESS_SERVICE']) } }; traversalCache.set(cacheKey, result); return result
}

const PRIVILEGE_EDGES = new Set(['HAS_ROLE', 'GRANTS', 'HAS_PERMISSION', 'HAS_ACCESS_TO', 'HAS_ACCESS', 'MEMBER_OF', 'AUTHENTICATES_TO'])
export function attackPath(data: GraphData, sourceId: string, targetId: string): AttackPathResult | null {
  const path = shortestPath(data, sourceId, targetId, 'directed', 10, (link) => PRIVILEGE_EDGES.has(link.relationshipType))
  if (!path) return null
  const target = data.nodes.find((node) => node.id === targetId)
  const riskWeight = { NONE: 0, LOW: 5, MEDIUM: 10, HIGH: 20, CRITICAL: 30 }[target?.riskLevel ?? 'NONE']
  const riskScore = Math.min(100, 35 + path.linkIds.length * 8 + riskWeight)
  return { ...path, riskScore, explanation: `${data.nodes.find((node) => node.id === sourceId)?.displayName ?? sourceId} can reach ${target?.displayName ?? targetId} through ${path.linkIds.length} privilege-bearing relationship(s).` }
}

export function subgraph(data: GraphData, nodeIds: Iterable<string>): GraphData {
  const ids = new Set(nodeIds)
  return { nodes: data.nodes.filter((node) => ids.has(node.id)), links: data.links.filter((link) => ids.has(id(link.source)) && ids.has(id(link.target))) }
}
