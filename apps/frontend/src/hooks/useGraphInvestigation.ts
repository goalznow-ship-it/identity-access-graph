import { useMemo, useState } from 'react'
import type { GraphData } from '../types/graph'
import { attackPath, blastRadius, shortestPath, subgraph, type AttackPathResult, type BlastRadiusResult, type PathDirection, type PathResult } from '../services/graphInvestigation'

interface FocusEntry { label: string; nodeIds: string[] }

export function useGraphInvestigation(data: GraphData) {
  const [path, setPath] = useState<PathResult | null>(null)
  const [blast, setBlast] = useState<BlastRadiusResult | null>(null)
  const [attack, setAttack] = useState<AttackPathResult | null>(null)
  const [history, setHistory] = useState<FocusEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const pushFocus = (entry: FocusEntry) => {
    setHistory((current) => [...current.slice(0, historyIndex + 1), entry])
    setHistoryIndex(historyIndex + 1)
  }
  const runShortestPath = (source: string, target: string, direction: PathDirection, maxDepth: number) => {
    const result = shortestPath(data, source, target, direction, maxDepth); setPath(result)
    if (result) pushFocus({ label: 'Shortest path', nodeIds: result.nodeIds })
    return result
  }
  const runBlastRadius = (source: string, maxDepth: number) => {
    const result = blastRadius(data, source, maxDepth); setBlast(result); pushFocus({ label: 'Blast radius', nodeIds: result.nodeIds }); return result
  }
  const runAttackPath = (source: string, target: string) => { const result = attackPath(data, source, target); setAttack(result); return result }
  const focusNode = (nodeId: string, label: string) => {
    const result = blastRadius(data, nodeId, 1); pushFocus({ label, nodeIds: result.nodeIds })
  }
  const restore = () => setHistoryIndex(-1)
  const back = () => setHistoryIndex((index) => Math.max(-1, index - 1))
  const forward = () => setHistoryIndex((index) => Math.min(history.length - 1, index + 1))
  const focusedData = useMemo(() => historyIndex < 0 ? data : subgraph(data, history[historyIndex]?.nodeIds ?? []), [data, history, historyIndex])
  return { focusedData, path, blast, attack, history, historyIndex, runShortestPath, runBlastRadius, runAttackPath, focusNode, restore, back, forward, canBack: historyIndex >= 0, canForward: historyIndex < history.length - 1 }
}
