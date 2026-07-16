import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphSelection } from '../hooks/useGraphSelection'
import { useGraphFilters } from '../hooks/useGraphFilters'
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

export function GraphPage() {
  const { data, loading, error } = useGraphData()
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

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)

  const handleZoomIn = useCallback(() => {
    if (fgRef.current) {
      const { innerWidth: w, innerHeight: h } = window
      const center = { x: w / 2, y: h / 2 }
      fgRef.current.zoomToPosition(fgRef.current.zoom() * 1.3, center.x, center.y, 300)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (fgRef.current) {
      const { innerWidth: w, innerHeight: h } = window
      const center = { x: w / 2, y: h / 2 }
      fgRef.current.zoomToPosition(fgRef.current.zoom() / 1.3, center.x, center.y, 300)
    }
  }, [])

  const handleFitToScreen = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400)
    }
  }, [])

  const handleResetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50)
    }
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v)
  }, [])

  const handleSearchSelect = useCallback(
    (node: any) => {
      selectNode(node)
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 500)
        fgRef.current.zoom(2, 500)
      }
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
          />
        </div>

        <div ref={graphContainerRef} className="flex-1 overflow-hidden">
          <GraphCanvas
            data={filteredData}
            selectedNode={selectedNode}
            highlightMode={highlightMode}
            dependencyInfo={dependencyInfo}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
          />
        </div>
      </div>

      <NodeDetailsDrawer
        node={selectedNode}
        data={data}
        onClose={clearSelection}
      />
    </motion.div>
  )
}
