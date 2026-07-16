import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphSelection } from '../hooks/useGraphSelection'
import { useGraphFilters } from '../hooks/useGraphFilters'
import { useGraphExpansion, type ExpansionDirection } from '../hooks/useGraphExpansion'
import { useGraphInvestigation } from '../hooks/useGraphInvestigation'
import {
  GraphCanvas,
  GraphToolbar,
  GraphFilters,
  GraphLegend,
  GraphStats,
  NodeDetailsDrawer,
  GraphSearch,
  GraphInvestigationPanel,
  GraphCommandPalette,
  RelationshipDrawer,
  GraphHistory,
} from '../components/graph'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card } from '../components/ui/Card'
import { useSearchParams } from 'react-router-dom'
import type { GraphCanvasHandle, GraphContextAction } from '../components/graph/GraphCanvas'
import type { GraphLayout, GraphLink, GraphNode } from '../types/graph'
import { exportGraph } from '../services/graphExport'

export function GraphPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const importedId = searchParams.get('importId')
  const [source, setSource] = useState<'mock' | 'imported'>(importedId ? 'imported' : 'mock')
  const { data, loading, error } = useGraphData(source === 'imported' ? importedId : null)
  const links = data?.links ?? []
  const {
    selectedNode,
    highlightMode,
    dependencyInfo,
    selectNode,
    setHighlightMode,
    clearSelection,
  } = useGraphSelection(links)
  const {
    filteredData,
    filters,
    setSystemFilter,
    setNodeTypeFilter,
    setRelationshipTypeFilter,
    setRiskLevelFilter,
    setStatusFilter,
    setAccessFilter,
    applyPreset,
    resetFilters,
    allNodeTypes,
    allRelationshipTypes,
    allSourceSystems,
    allRiskLevels,
    allStatuses,
    allAccessTypes,
  } = useGraphFilters(data)
  const { visibleData, expand, collapse, hide } = useGraphExpansion(filteredData)
  const investigation = useGraphInvestigation(visibleData)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [layout, setLayout] = useState<GraphLayout>('force')
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<GraphCanvasHandle>(null)

  const handleZoomIn = useCallback(() => {
    fgRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    fgRef.current?.zoomOut()
  }, [])

  const handleFitToScreen = useCallback(() => {
    fgRef.current?.fit()
  }, [])

  const handleResetView = useCallback(() => {
    fgRef.current?.reset()
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v)
  }, [])
  const handleLayoutChange = (next: GraphLayout) => { setLayout(next); fgRef.current?.setLayout(next) }
  const handleExport = (format: 'png' | 'json' | 'csv' | 'cypher') => { if (format === 'png') fgRef.current?.exportPng(); else exportGraph(investigation.focusedData, format) }

  const handleSearchSelect = useCallback(
    (node: any) => {
      selectNode(node)
      fgRef.current?.center(node)
    },
    [selectNode],
  )

  const handleNodeClick = useCallback(
    (node: any) => {
      selectNode(node)
    },
    [selectNode],
  )

  const handleBackgroundClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleSourceChange = (next: 'mock' | 'imported') => {
    if (next === 'imported' && !importedId) return
    setSource(next); clearSelection()
  }

  const pinNode = (node: GraphNode) => { node.fx = node.x ?? 0; node.fy = node.y ?? 0 }
  const showDependencies = (node: GraphNode) => { selectNode(node); setHighlightMode('all') }
  const handleContextAction = (action: GraphContextAction, node: GraphNode, direction: ExpansionDirection = 'both', depth = 1) => {
    if (action === 'details') selectNode(node)
    if (action === 'profile') navigate(`/identities/${node.id}`)
    if (action === 'center') fgRef.current?.center(node)
    if (action === 'expand') expand(node.id, direction, depth)
    if (action === 'collapse') collapse(node.id)
    if (action === 'hide') { hide(node.id); if (selectedNode?.id === node.id) clearSelection() }
    if (action === 'pin') pinNode(node)
    if (action === 'dependencies') showDependencies(node)
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (event.key === 'Escape') { clearSelection(); setSelectedLink(null) }
      if (event.key.toLowerCase() === 'f') fgRef.current?.fit()
      if (event.key === '[') investigation.back()
      if (event.key === ']') investigation.forward()
      const layouts: Record<string, GraphLayout> = { '1': 'force', '2': 'hierarchy', '3': 'radial', '4': 'concentric' }
      if (layouts[event.key]) { setLayout(layouts[event.key]); fgRef.current?.setLayout(layouts[event.key]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearSelection, investigation.back, investigation.forward])

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" /><p className="animate-pulse text-sm text-gray-500">Loading graph workspace…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-danger">Failed to load graph data</p><p className="mt-2 text-xs text-gray-500">{error}</p>
        </Card>
      </div>
    )
  }

  if (!data || filteredData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-gray-400">No graph data matches the current workspace.</p><button onClick={resetFilters} className="mt-3 rounded bg-primary px-3 py-1.5 text-xs">Clear filters</button>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${fullscreen ? 'fixed inset-0 z-50' : 'absolute inset-0'} flex`}
    >
      {filtersOpen && (
        <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-border bg-surface/95 p-4 backdrop-blur md:sticky md:w-64">
          <GraphSearch data={filteredData} onSelect={handleSearchSelect} />
          <div className="mt-4">
            <GraphFilters
              filters={filters}
              allNodeTypes={allNodeTypes}
              allRelationshipTypes={allRelationshipTypes}
              allSourceSystems={allSourceSystems}
              allRiskLevels={allRiskLevels}
              allStatuses={allStatuses}
              allAccessTypes={allAccessTypes}
              onSystemFilter={setSystemFilter}
              onNodeTypeFilter={setNodeTypeFilter}
              onRelationshipTypeFilter={setRelationshipTypeFilter}
              onRiskLevelFilter={setRiskLevelFilter}
              onStatusFilter={setStatusFilter}
              onAccessFilter={setAccessFilter}
              onPreset={applyPreset}
              onReset={resetFilters}
            />
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Legend</p>
            <GraphLegend />
          </div>
          <GraphInvestigationPanel
            data={visibleData}
            path={investigation.path}
            blast={investigation.blast}
            attack={investigation.attack}
            onShortest={investigation.runShortestPath}
            onBlast={investigation.runBlastRadius}
            onAttack={investigation.runAttackPath}
            onFocus={investigation.focusNode}
            onRestore={investigation.restore}
            onBack={investigation.back}
            onForward={investigation.forward}
            canBack={investigation.canBack}
            canForward={investigation.canForward}
          />
          <div className="mt-4 border-t border-border pt-3"><p className="mb-2 text-xs font-semibold uppercase text-gray-400">Graph history</p><GraphHistory entries={investigation.history} index={investigation.historyIndex} /></div>
          <div className="mt-3 text-[10px] text-gray-600">Ctrl+K commands · F fit · 1–4 layouts · [ / ] history · Esc clear</div>
        </motion.aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/50 px-2 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-gray-200"
              title="Toggle Filters"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>
            <GraphStats data={filteredData} selectedNode={selectedNode} />
          </div>
          <GraphToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToScreen={handleFitToScreen}
            onResetView={handleResetView}
            onToggleFullscreen={handleToggleFullscreen}
            highlightMode={highlightMode}
            onHighlightModeChange={setHighlightMode}
            hasSelection={selectedNode !== null}
            source={source}
            importedAvailable={Boolean(importedId)}
            onSourceChange={handleSourceChange}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onExport={handleExport}
          />
        </div>

        <div ref={graphContainerRef} className="flex-1 overflow-hidden">
          <GraphCanvas
            ref={fgRef}
            data={investigation.focusedData}
            selectedNode={selectedNode}
            highlightMode={highlightMode}
            dependencyInfo={dependencyInfo}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onContextAction={handleContextAction}
            onLinkClick={(link) => setSelectedLink(link)}
            attackPathNodeIds={investigation.attack?.nodeIds}
            attackPathLinkIds={investigation.attack?.linkIds}
          />
        </div>
      </div>

      <NodeDetailsDrawer
        node={selectedNode}
        data={data}
        onClose={clearSelection}
        onCenter={(node) => fgRef.current?.center(node)}
        onPin={pinNode}
        onDependencies={showDependencies}
      />
      <GraphCommandPalette data={data} onSelect={handleSearchSelect} onFit={handleFitToScreen} onFullscreen={handleToggleFullscreen} onClearFilters={resetFilters} />
      <RelationshipDrawer link={selectedLink} data={data} onClose={() => setSelectedLink(null)} />
    </motion.div>
  )
}
