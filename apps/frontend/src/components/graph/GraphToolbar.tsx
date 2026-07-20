import type { GraphLayout, HighlightMode } from '../../types/graph'
import type { GraphSourceMode } from '../../types/neo4j'
import { DEMO_DATA_ENABLED } from '../../services/runtimeConfig'

interface GraphToolbarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onResetView: () => void
  onCenter: () => void
  onFreeze: () => void
  frozen: boolean
  onToggleFullscreen: () => void
  onSearch: () => void
  onFilters: () => void
  onShortestPath: () => void
  onBlastRadius: () => void
  onAttackPath: () => void
  highlightMode: HighlightMode
  onHighlightModeChange: (mode: HighlightMode) => void
  hasSelection: boolean
  hasRelationships: boolean
  source: GraphSourceMode
  importedAvailable: boolean
  onSourceChange: (source: GraphSourceMode) => void
  layout: GraphLayout
  onLayoutChange: (layout: GraphLayout) => void
  onExport: (format: 'png' | 'json' | 'csv' | 'cypher') => void
}

const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg border border-transparent px-2 text-xs text-gray-400 transition hover:border-border hover:bg-white/[0.06] hover:text-white active:scale-95'
const active = 'bg-primary/15 text-primary border-primary/20'

function IconFit() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8V5a2 2 0 012-2h3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M21 16v3a2 2 0 01-2 2h-3"/></svg> }
function IconCenter() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> }
function IconReset() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> }
function IconFreeze() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20"/></svg> }
function IconPlay() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function IconFullscreen() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg> }
function IconSearch() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> }
function IconFilter() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg> }
function IconPath() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> }
function IconBlast() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function IconAttack() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> }
function IconDirect() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4l-5 6M12 11l7 6"/></svg> }
function IconReachable() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> }

export function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onResetView,
  onCenter,
  onFreeze,
  frozen,
  onToggleFullscreen,
  onSearch,
  onFilters,
  onShortestPath,
  onBlastRadius,
  onAttackPath,
  highlightMode,
  onHighlightModeChange,
  hasSelection,
  hasRelationships,
  source,
  importedAvailable,
  onSourceChange,
  layout,
  onLayoutChange,
  onExport,
}: GraphToolbarProps) {
  return (
    <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface/90 p-1 backdrop-blur">
      <button className={btn} onClick={onFitToScreen} title="Fit graph (F)"><IconFit /></button>
      <button className={btn} onClick={onCenter} title="Center selected node"><IconCenter /></button>
      <button className={btn} onClick={onResetView} title="Reset view"><IconReset /></button>
      <button className={`${btn} ${frozen ? active : ''}`} onClick={onFreeze} title={frozen ? 'Resume physics' : 'Freeze physics'}>{frozen ? <IconPlay /> : <IconFreeze />}</button>
      <button className={btn} onClick={onToggleFullscreen} title="Fullscreen"><IconFullscreen /></button>

      <span className="mx-1 h-5 w-px shrink-0 bg-border" />

      <select aria-label="Graph layout" title="Layout" value={layout} onChange={(event) => onLayoutChange(event.target.value as GraphLayout)} className="h-7 rounded-md border border-border bg-card px-1.5 text-[10px] uppercase tracking-wider"><option value="force">Force</option><option value="hierarchy-lr">H L→R</option><option value="hierarchy-td">H T→B</option><option value="radial">Radial</option><option value="concentric">Concentric</option><option value="department">Dept</option><option value="source">Source</option></select>

      <span className="mx-1 h-5 w-px shrink-0 bg-border" />

      <button className={btn} onClick={onSearch} title="Search (Ctrl+K)"><IconSearch /></button>
      <button className={btn} onClick={onFilters} title="Toggle filters"><IconFilter /></button>
      <button className={`${btn} ${!hasRelationships ? 'cursor-not-allowed opacity-30' : ''}`} onClick={onShortestPath} title="Shortest path" disabled={!hasRelationships}><IconPath /></button>
      <button className={`${btn} ${!hasRelationships ? 'cursor-not-allowed opacity-30' : ''}`} onClick={onBlastRadius} title="Blast radius" disabled={!hasRelationships}><IconBlast /></button>
      <button className={`${btn} ${!hasRelationships ? 'cursor-not-allowed opacity-30' : ''}`} onClick={onAttackPath} title="Attack path" disabled={!hasRelationships}><IconAttack /></button>

      <select aria-label="Export graph" title="Export" defaultValue="" onChange={(event) => { if (event.target.value) onExport(event.target.value as 'png' | 'json' | 'csv' | 'cypher'); event.currentTarget.value = '' }} className="h-7 rounded-md border border-border bg-card px-1.5 text-[10px] uppercase tracking-wider"><option value="">Export</option><option value="png">PNG</option><option value="json">JSON</option><option value="csv">CSV</option><option value="cypher">Cypher</option></select>

      <button className="sr-only" onClick={onZoomIn}>Zoom in</button>
      <button className="sr-only" onClick={onZoomOut}>Zoom out</button>
      <select className="sr-only" value={source} onChange={(event) => onSourceChange(event.target.value as GraphSourceMode)}>{DEMO_DATA_ENABLED&&<option value="mock">Mock</option>}<option value="imported" disabled={!importedAvailable}>Import</option><option value="neo4j">Neo4j</option></select>

      {hasSelection && (
        <>
          <span className="mx-1 h-6 w-px bg-border" />
          <button className={`${btn} ${highlightMode === 'direct' ? active : ''}`} onClick={() => onHighlightModeChange('direct')} title="Direct neighbors"><IconDirect /></button>
          <button className={`${btn} ${highlightMode === 'all' ? active : ''}`} onClick={() => onHighlightModeChange('all')} title="All dependencies"><IconReachable /></button>
          <button className={`${btn} ${highlightMode === 'two-hop' ? active : ''}`} onClick={() => onHighlightModeChange('two-hop')} title="2-hop neighborhood">2</button>
          <button className={btn} onClick={() => onHighlightModeChange('none')} title="Clear highlight">✕</button>
        </>
      )}
    </div>
  )
}
