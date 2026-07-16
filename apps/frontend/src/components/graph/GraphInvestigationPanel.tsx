import { useState } from 'react'
import type { GraphData } from '../../types/graph'
import type { AttackPathResult, BlastRadiusResult, PathDirection, PathResult } from '../../services/graphInvestigation'
import { BlastRadiusPanel } from './BlastRadiusPanel'

interface Props {
  data: GraphData; path: PathResult | null; blast: BlastRadiusResult | null; attack: AttackPathResult | null
  onShortest: (source: string, target: string, direction: PathDirection, depth: number) => void
  onBlast: (source: string, depth: number) => void; onAttack: (source: string, target: string) => void
  onFocus: (nodeId: string, label: string) => void; onRestore: () => void; onBack: () => void; onForward: () => void; canBack: boolean; canForward: boolean
}

export function GraphInvestigationPanel({ data, path, blast, attack, onShortest, onBlast, onAttack, onFocus, onRestore, onBack, onForward, canBack, canForward }: Props) {
  const [source, setSource] = useState(''); const [target, setTarget] = useState(''); const [direction, setDirection] = useState<PathDirection>('directed'); const [depth, setDepth] = useState(10)
  const options = data.nodes.map((node) => <option key={node.id} value={node.id}>{node.displayName} ({node.nodeType})</option>)
  const focusable = data.nodes.filter((node) => ['DEPARTMENT','HOST','COMPUTER','APPLICATION','BUSINESS_SERVICE'].includes(node.nodeType))
  return <div className="space-y-3 border-t border-border pt-4 text-xs">
    <h3 className="font-semibold uppercase tracking-wider text-gray-400">Investigation</h3>
    <select value={source} onChange={(event) => setSource(event.target.value)} className="w-full rounded bg-card p-2"><option value="">Source</option>{options}</select>
    <select value={target} onChange={(event) => setTarget(event.target.value)} className="w-full rounded bg-card p-2"><option value="">Target</option>{options}</select>
    <div className="flex gap-2"><select value={direction} onChange={(event) => setDirection(event.target.value as PathDirection)} className="flex-1 bg-card"><option value="directed">Directed</option><option value="undirected">Undirected</option></select><input type="number" min={1} max={10} value={depth} onChange={(event) => setDepth(Math.min(10, Math.max(1, Number(event.target.value))))} className="w-14 bg-card p-1" /></div>
    <div className="grid grid-cols-3 gap-1"><button className="rounded bg-primary p-1.5" disabled={!source || !target} onClick={() => onShortest(source,target,direction,depth)}>Shortest</button><button className="rounded bg-gray-700 p-1.5" disabled={!source} onClick={() => onBlast(source,depth)}>Blast</button><button className="rounded bg-orange-600 p-1.5" disabled={!source || !target} onClick={() => onAttack(source,target)}>Attack</button></div>
    {path && <div className="text-gray-400">Shortest path: {path.depth} hop(s)</div>}
    {blast && <BlastRadiusPanel result={blast} />}
    {attack && <div className="rounded border border-orange-700 bg-orange-900/20 p-2 text-orange-200"><strong>Risk {attack.riskScore}/100</strong><p className="mt-1">{attack.explanation}</p><p className="mt-1 break-all text-orange-300">{attack.nodeIds.join(' → ')}</p></div>}
    <select defaultValue="" onChange={(event) => { const node = data.nodes.find((item) => item.id === event.target.value); if (node) onFocus(node.id, `${node.nodeType}: ${node.displayName}`); event.currentTarget.value = '' }} className="w-full rounded bg-card p-2"><option value="">Focus department, host, app, or service</option>{focusable.map((node) => <option key={node.id} value={node.id}>{node.displayName} ({node.nodeType})</option>)}</select>
    <div className="flex gap-1"><button className="rounded bg-card px-2 py-1" onClick={onBack} disabled={!canBack}>Back</button><button className="rounded bg-card px-2 py-1" onClick={onForward} disabled={!canForward}>Forward</button><button className="rounded bg-card px-2 py-1" onClick={onRestore}>Restore full graph</button></div>
  </div>
}
