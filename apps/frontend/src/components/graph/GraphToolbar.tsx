import { Button } from '../ui/Button'
import type { GraphLayout, HighlightMode } from '../../types/graph'

interface GraphToolbarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onResetView: () => void
  onToggleFullscreen: () => void
  highlightMode: HighlightMode
  onHighlightModeChange: (mode: HighlightMode) => void
  hasSelection: boolean
  source: 'mock' | 'imported'
  importedAvailable: boolean
  onSourceChange: (source: 'mock' | 'imported') => void
  layout: GraphLayout
  onLayoutChange: (layout: GraphLayout) => void
  onExport: (format: 'png' | 'json' | 'csv' | 'cypher') => void
}

export function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onResetView,
  onToggleFullscreen,
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
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-surface/90 p-2 backdrop-blur-glass">
      <span className="px-1 text-xs text-gray-500">Source</span>
      <select value={source} onChange={(event) => onSourceChange(event.target.value as 'mock' | 'imported')} className="rounded border border-border bg-card px-2 py-1 text-xs text-gray-200">
        <option value="mock">Mock graph</option>
        <option value="imported" disabled={!importedAvailable}>Imported graph</option>
      </select>
      <span className="rounded bg-primary-muted px-2 py-1 text-[10px] uppercase text-primary">{source}</span>
      <div className="mx-1 h-6 w-px bg-border" />
      <select value={layout} onChange={(event) => onLayoutChange(event.target.value as GraphLayout)} className="rounded border border-border bg-card px-2 py-1 text-xs"><option value="force">Force</option><option value="hierarchy">Hierarchy</option><option value="radial">Radial</option><option value="concentric">Concentric</option></select>
      <select defaultValue="" onChange={(event) => { if (event.target.value) onExport(event.target.value as 'png' | 'json' | 'csv' | 'cypher'); event.currentTarget.value = '' }} className="rounded border border-border bg-card px-2 py-1 text-xs"><option value="">Export</option><option value="png">PNG</option><option value="json">JSON</option><option value="csv">CSV</option><option value="cypher">Cypher</option></select>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onZoomIn} title="Zoom In">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
      </Button>
      <Button variant="ghost" size="sm" onClick={onZoomOut} title="Zoom Out">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
      </Button>
      <Button variant="ghost" size="sm" onClick={onFitToScreen} title="Fit to Screen">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </Button>
      <Button variant="ghost" size="sm" onClick={onResetView} title="Reset View">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onToggleFullscreen} title="Fullscreen">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8V4m0 0h4M3 4l4 4m14-4v4m0-4h-4m4 0l-4 4M3 16v4m0 0h4m-4 0l4-4m14 4l-4-4m4 4v-4m0 4h-4" /></svg>
      </Button>
      {hasSelection && (
        <>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button
            variant={highlightMode === 'direct' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onHighlightModeChange('direct')}
          >
            Direct
          </Button>
          <Button
            variant={highlightMode === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onHighlightModeChange('all')}
          >
            All Reachable
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHighlightModeChange('none')}
          >
            Clear
          </Button>
        </>
      )}
    </div>
  )
}
