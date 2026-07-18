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
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState<PathDirection>('directed')
  const [depth, setDepth] = useState(10)
  const [tab, setTab] = useState<'path' | 'focus' | 'history'>('path')
  const options = data.nodes.length <= 2000 ? data.nodes.map((n) => ({
    id: n.id,
    label: `${n.displayName} (${n.nodeType})`,
    nodeType: n.nodeType,
    risk: n.riskLevel,
  })) : []
  const focusable = data.nodes.filter((n) => ['DEPARTMENT','HOST','COMPUTER','APPLICATION','BUSINESS_SERVICE'].includes(n.nodeType))

  const sel = 'flex-1 rounded-lg px-2 py-1 text-xs font-medium transition'
  const tabs = [
    { key: 'path' as const, label: 'Path Analysis' },
    { key: 'focus' as const, label: 'Focus' },
    { key: 'history' as const, label: 'History' },
  ]

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-0.5 rounded-lg bg-card p-0.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${sel} ${tab === t.key ? 'bg-surface text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'path' && (
        <div className="space-y-2">
          <div className="relative">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-gray-300 transition hover:border-gray-600">
              <option value="">Select source node…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="relative">
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-gray-300 transition hover:border-gray-600">
              <option value="">Select target node…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={direction} onChange={(e) => setDirection(e.target.value as PathDirection)} className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px]">
              <option value="directed">Directed</option>
              <option value="undirected">Undirected</option>
            </select>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <span>Depth</span>
              <input type="number" min={1} max={10} value={depth} onChange={(e) => setDepth(Math.min(10, Math.max(1, Number(e.target.value))))} className="w-12 rounded-lg border border-border bg-card px-2 py-1.5 text-center text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-40" disabled={!source || !target} onClick={() => onShortest(source, target, direction, depth)}>
              Shortest
            </button>
            <button className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-gray-600 disabled:opacity-40" disabled={!source} onClick={() => onBlast(source, depth)}>
              Blast
            </button>
            <button className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-orange-500 disabled:opacity-40" disabled={!source || !target} onClick={() => onAttack(source, target)}>
              Attack
            </button>
          </div>
          {path && (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-cyan-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Shortest path</span>
                <span className="text-[10px]">{path.depth} hop{path.depth === 1 ? '' : 's'}</span>
              </div>
              <p className="mt-1 text-[10px] text-cyan-200/70">{path.nodeIds?.join(' → ')}</p>
            </div>
          )}
          {attack && (
            <div className="rounded-lg border border-orange-400/20 bg-orange-400/5 p-3 text-orange-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Attack path</span>
                <span className="rounded-md bg-orange-400/20 px-1.5 py-0.5 text-[10px]">{attack.riskScore}/100</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-orange-200/70">{attack.explanation}</p>
              <p className="mt-1 break-all text-[10px] text-orange-300/60">{attack.nodeIds.join(' → ')}</p>
            </div>
          )}
          {blast && <BlastRadiusPanel result={blast} />}
        </div>
      )}

      {tab === 'focus' && (
        <div className="space-y-2">
          <select defaultValue="" onChange={(e) => { const n = data.nodes.find((x) => x.id === e.target.value); if (n) onFocus(n.id, `${n.nodeType}: ${n.displayName}`); e.currentTarget.value = '' }} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <option value="">Focus on department, host, app…</option>
            {focusable.map((n) => <option key={n.id} value={n.id}>{n.displayName} ({n.nodeType})</option>)}
          </select>
          <button onClick={onRestore} className="w-full rounded-lg border border-border px-3 py-2 text-xs text-gray-400 transition hover:bg-white/5 hover:text-gray-200">
            Reset to full graph
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="flex gap-1">
          <button onClick={onBack} disabled={!canBack} className="flex-1 rounded-lg bg-card px-3 py-2 text-xs text-gray-400 transition hover:bg-white/5 disabled:opacity-30">
            ← Back
          </button>
          <button onClick={onForward} disabled={!canForward} className="flex-1 rounded-lg bg-card px-3 py-2 text-xs text-gray-400 transition hover:bg-white/5 disabled:opacity-30">
            Forward →
          </button>
        </div>
      )}
    </div>
  )
}
