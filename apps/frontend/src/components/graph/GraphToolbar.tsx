import type { GraphLayout, HighlightMode } from '../../types/graph'
import type { GraphSourceMode } from '../../types/neo4j'

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
  source: GraphSourceMode
  importedAvailable: boolean
  onSourceChange: (source: GraphSourceMode) => void
  layout: GraphLayout
  onLayoutChange: (layout: GraphLayout) => void
  onExport: (format: 'png' | 'json' | 'csv' | 'cypher') => void
}

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
  source,
  importedAvailable,
  onSourceChange,
  layout,
  onLayoutChange,
  onExport,
}: GraphToolbarProps) {
  const tool = 'flex h-8 min-w-8 items-center justify-center rounded-md border border-transparent px-2 text-xs text-gray-400 transition hover:border-border hover:bg-white/5 hover:text-white'
  return (
    <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface/90 p-1 backdrop-blur">
      <button className={tool} onClick={onFitToScreen} title="Fit graph (F)">⌗<span className="ml-1 hidden xl:inline">Fit</span></button>
      <button className={tool} onClick={onCenter} title="Center selected node">◎<span className="ml-1 hidden xl:inline">Center</span></button>
      <button className={tool} onClick={onResetView} title="Reset view">↺<span className="ml-1 hidden xl:inline">Reset</span></button>
      <button className={`${tool} ${frozen ? 'bg-primary/15 text-primary' : ''}`} onClick={onFreeze} title={frozen ? 'Resume graph physics' : 'Freeze graph physics'}>{frozen ? '▶' : '❄'}<span className="ml-1 hidden xl:inline">{frozen ? 'Resume' : 'Freeze'}</span></button>
      <button className={tool} onClick={onToggleFullscreen} title="Fullscreen">⛶</button>
      <select aria-label="Graph layout" title="Layout" value={layout} onChange={(event) => onLayoutChange(event.target.value as GraphLayout)} className="h-8 rounded border border-border bg-card px-1 text-xs"><option value="force">Force</option><option value="hierarchy-lr">Hierarchy L→R</option><option value="hierarchy-td">Hierarchy T→B</option><option value="radial">Radial</option><option value="concentric">Concentric</option><option value="department">Departments</option><option value="source">Sources</option></select>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <button className={tool} onClick={onSearch} title="Search nodes (Ctrl+K)">⌕<span className="ml-1 hidden 2xl:inline">Search</span></button>
      <button className={tool} onClick={onFilters} title="Toggle filters">◫<span className="ml-1 hidden 2xl:inline">Filters</span></button>
      <button className={tool} onClick={onShortestPath} title="Shortest path panel">⇢<span className="ml-1 hidden 2xl:inline">Path</span></button>
      <button className={tool} onClick={onBlastRadius} title="Blast radius panel">◉<span className="ml-1 hidden 2xl:inline">Blast</span></button>
      <button className={tool} onClick={onAttackPath} title="Attack path panel">⚠<span className="ml-1 hidden 2xl:inline">Attack</span></button>
      <select aria-label="Export graph" title="Export" defaultValue="" onChange={(event) => { if (event.target.value) onExport(event.target.value as 'png' | 'json' | 'csv' | 'cypher'); event.currentTarget.value = '' }} className="h-8 rounded border border-border bg-card px-1 text-xs"><option value="">Export</option><option value="png">PNG</option><option value="json">JSON</option><option value="csv">CSV</option><option value="cypher">Cypher</option></select>
      <button className="sr-only" onClick={onZoomIn}>Zoom in</button><button className="sr-only" onClick={onZoomOut}>Zoom out</button>
      <select className="sr-only" value={source} onChange={(event) => onSourceChange(event.target.value as GraphSourceMode)}><option value="mock">Mock Enterprise</option><option value="imported" disabled={!importedAvailable}>Imported Session</option><option value="neo4j">Neo4j Live</option></select>
      {hasSelection && (
        <>
          <div className="mx-1 h-6 w-px bg-border" />
          <button className={`${tool} ${highlightMode === 'direct' ? 'bg-primary/15 text-primary' : ''}`}
            onClick={() => onHighlightModeChange('direct')}
            title="Highlight direct neighbors"
          >
            Direct
          </button>
          <button className={`${tool} ${highlightMode === 'all' ? 'bg-primary/15 text-primary' : ''}`}
            onClick={() => onHighlightModeChange('all')}
            title="Highlight all dependencies"
          >
            Reachable
          </button>
          <button className={`${tool} ${highlightMode === 'two-hop' ? 'bg-primary/15 text-primary' : ''}`} onClick={() => onHighlightModeChange('two-hop')} title="Highlight two-hop neighborhood">2-hop</button>
          <button className={tool} onClick={() => onHighlightModeChange('none')} title="Clear highlighting">×</button>
        </>
      )}
    </div>
  )
}
