import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphSelection } from '../hooks/useGraphSelection'
import { useGraphFilters } from '../hooks/useGraphFilters'
import { useGraphExpansion, type ExpansionDirection } from '../hooks/useGraphExpansion'
import {
  GraphCanvas,
  GraphToolbar,
  GraphFilters,
  GraphLegend,
  GraphStats,
  NodeDetailsDrawer,
  GraphSearch,
} from '../components/graph'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card } from '../components/ui/Card'
import { useSearchParams } from 'react-router-dom'
import type { GraphCanvasHandle, GraphContextAction } from '../components/graph/GraphCanvas'
import type { GraphNode } from '../types/graph'

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
    resetFilters,
    allNodeTypes,
    allRelationshipTypes,
    allSourceSystems,
    allRiskLevels,
  } = useGraphFilters(data)
  const { visibleData, expand, collapse, hide } = useGraphExpansion(filteredData)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-danger">Failed to load graph data: {error}</p>
        </Card>
      </div>
    )
  }

  if (!data || filteredData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-gray-400">No graph data available.</p>
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
        <aside className="w-64 shrink-0 border-r border-border bg-surface p-4 overflow-y-auto">
          <GraphSearch data={filteredData} onSelect={handleSearchSelect} />
          <div className="mt-4">
            <GraphFilters
              filters={filters}
              allNodeTypes={allNodeTypes}
              allRelationshipTypes={allRelationshipTypes}
              allSourceSystems={allSourceSystems}
              allRiskLevels={allRiskLevels}
              onSystemFilter={setSystemFilter}
              onNodeTypeFilter={setNodeTypeFilter}
              onRelationshipTypeFilter={setRelationshipTypeFilter}
              onRiskLevelFilter={setRiskLevelFilter}
              onReset={resetFilters}
            />
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Legend</p>
            <GraphLegend />
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface/50 px-4 py-2">
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
          />
        </div>

        <div ref={graphContainerRef} className="flex-1 overflow-hidden">
          <GraphCanvas
            ref={fgRef}
            data={visibleData}
            selectedNode={selectedNode}
            highlightMode={highlightMode}
            dependencyInfo={dependencyInfo}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onContextAction={handleContextAction}
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
    </motion.div>
  )
}
