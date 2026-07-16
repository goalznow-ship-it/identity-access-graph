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
  GraphStatusBar,
} from '../components/graph'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card } from '../components/ui/Card'
import { useSearchParams } from 'react-router-dom'
import type { GraphCanvasHandle, GraphContextAction } from '../components/graph/GraphCanvas'
import type { GraphLayout, GraphLink, GraphNode } from '../types/graph'
import { exportGraph } from '../services/graphExport'
import { parseGraphQuery } from '../services/navigation'
import type { NodeType, RiskLevel, SourceSystem } from '../types/graph'
import { useGraphSource } from '../hooks/useGraphSource'
import type { GraphSourceMode } from '../types/neo4j'
import { getNode as getNeo4jNode, searchNodes as searchNeo4jNodes } from '../services/neo4jGraphApi'
import { adaptNeo4jNode } from '../services/neo4jGraphAdapter'
import { Neo4jStatusBadge } from '../components/Neo4jStatusBadge'
import { loadSettings } from '../services/navigation'

export function GraphPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const importedId = searchParams.get('importId')
  const { source, setSource } = useGraphSource(importedId ? 'imported' : searchParams.get('source'))
  const backendFilters = { nodeType: searchParams.get('nodeType') ?? undefined, sourceSystem: searchParams.get('sourceSystem') ?? undefined, risk: searchParams.get('risk') ?? undefined, status: searchParams.get('status') ?? undefined }
  const [remoteFilters, setRemoteFilters] = useState<Record<string, unknown>>(backendFilters)
  const { data, loading, error, retry, partial, expanding, expandRemote } = useGraphData(source === 'imported' ? importedId : null, source, remoteFilters)
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
  const [frozen, setFrozen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [investigationOpen, setInvestigationOpen] = useState(true)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<GraphCanvasHandle>(null)
  const filterSystems = (values: any[]) => { setSystemFilter(values); if(source==='neo4j')setRemoteFilters((current)=>({...current,sourceSystem:values[0]})) }
  const filterNodeTypes = (values: any[]) => { setNodeTypeFilter(values); if(source==='neo4j')setRemoteFilters((current)=>({...current,nodeType:values[0]})) }
  const filterRisks = (values: any[]) => { setRiskLevelFilter(values); if(source==='neo4j')setRemoteFilters((current)=>({...current,risk:values[0]})) }
  const filterStatuses = (values: string[]) => { setStatusFilter(values); if(source==='neo4j')setRemoteFilters((current)=>({...current,status:values[0]})) }
  const clearGraphFilters = () => { resetFilters(); if(source==='neo4j')setRemoteFilters({}) }

  useEffect(() => {
    const query = parseGraphQuery(searchParams)
    setRemoteFilters({ nodeType: query.nodeType, sourceSystem: query.sourceSystem, risk: query.risk, status: query.status })
    setNodeTypeFilter(query.nodeType ? [query.nodeType as NodeType] : [])
    setSystemFilter(query.sourceSystem ? [query.sourceSystem as SourceSystem] : [])
    setRiskLevelFilter(query.risk ? [query.risk as RiskLevel] : [])
    setStatusFilter(query.status ? [query.status] : [])
    if (query.mode === 'investigation') setInvestigationOpen(true)
  }, [searchParams, setNodeTypeFilter, setSystemFilter, setRiskLevelFilter, setStatusFilter])

  useEffect(() => {
    const nodeId = searchParams.get('nodeId'); if (!nodeId || !data) return
    const node = data.nodes.find((candidate) => candidate.id === nodeId); if (node) { selectNode(node); window.setTimeout(() => fgRef.current?.center(node), 120); return }
    if (source === 'neo4j') void getNeo4jNode(nodeId).then((raw) => { const remoteNode = adaptNeo4jNode(raw); selectNode(remoteNode); return expandRemote(nodeId, 'both', 1) }).catch(() => undefined)
  }, [data, searchParams, selectNode, source, expandRemote])

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
  const handleFreeze = () => { const next = !frozen; setFrozen(next); fgRef.current?.freeze(next) }
  const openInvestigation = () => { setInvestigationOpen(true); window.setTimeout(() => document.getElementById('graph-investigation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }

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
      if (source === 'neo4j') void getNeo4jNode(node.id).then((full) => selectNode(adaptNeo4jNode(full))).catch(() => undefined)
    },
    [selectNode, source],
  )

  const handleBackgroundClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleSourceChange = (next: GraphSourceMode) => {
    if (next === 'imported' && !importedId) return
    setSource(next); clearSelection()
  }

  const pinNode = (node: GraphNode) => { node.fx = node.x ?? 0; node.fy = node.y ?? 0 }
  const showDependencies = (node: GraphNode) => { selectNode(node); setHighlightMode('all') }
  const handleContextAction = (action: GraphContextAction, node: GraphNode, direction: ExpansionDirection = 'both', depth = 1) => {
    if (action === 'details') selectNode(node)
    if (action === 'profile') navigate(`/identities/${node.id}`)
    if (action === 'center') fgRef.current?.center(node)
    if (action === 'expand') { if (source === 'neo4j') void expandRemote(node.id, direction, Math.min(depth, 3)); else expand(node.id, direction, depth) }
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

  useEffect(() => { if (source !== 'neo4j' || !error || typeof localStorage === 'undefined') return; if (loadSettings(localStorage).autoFallback) { setFallbackNotice(`Neo4j Live unavailable: ${error}. Switched to Mock Enterprise.`); setSource('mock') } }, [source, error, setSource])

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
          <p className="text-danger">Failed to load graph data</p><p className="mt-2 text-xs text-gray-500">{error}</p><div className="mt-4 flex justify-center gap-2"><button onClick={()=>void retry()} className="rounded bg-primary px-3 py-1.5 text-xs">Retry</button>{source==='neo4j'&&<button onClick={()=>setSource('mock')} className="rounded border border-border px-3 py-1.5 text-xs">Use Mock Enterprise</button>}</div>
        </Card>
      </div>
    )
  }

  if (!data || filteredData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-gray-400">{source==='neo4j'?'Neo4j Live returned no graph objects.':'No graph data matches the current workspace.'}</p><div className="mt-3 flex justify-center gap-2"><button onClick={clearGraphFilters} className="rounded bg-primary px-3 py-1.5 text-xs">Clear filters</button>{source==='neo4j'&&<button onClick={()=>void retry()} className="rounded border border-border px-3 py-1.5 text-xs">Retry</button>}</div>
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
      {fallbackNotice&&<div className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">{fallbackNotice}</div>}
      {filtersOpen && (
        <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-border bg-surface/95 p-4 backdrop-blur md:sticky md:w-64">
          <GraphSearch data={filteredData} onSelect={handleSearchSelect} remoteSearch={source==='neo4j'?async(query,signal)=>(await searchNeo4jNodes(query,{...backendFilters,limit:20},{signal})).map(adaptNeo4jNode):undefined} />
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-card/40 p-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Graph source</label>
            <select value={source} onChange={(event) => handleSourceChange(event.target.value as GraphSourceMode)} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-gray-200"><option value="mock">Mock Enterprise</option><option value="imported" disabled={!importedId}>Imported Session</option><option value="neo4j">Neo4j Live</option></select>
            {source==='neo4j'&&<Neo4jStatusBadge details/>}
            <div className="flex items-center justify-between text-[10px] text-gray-500"><span>Active source</span><b className="rounded bg-primary/15 px-1.5 py-0.5 uppercase text-primary">{source}</b></div>
            <label className="block pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Layout</label>
            <select value={layout} onChange={(event) => handleLayoutChange(event.target.value as GraphLayout)} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-gray-200"><option value="force">Force</option><option value="hierarchy">Hierarchy</option><option value="radial">Radial</option><option value="concentric">Concentric</option></select>
          </div>
          <div className="mt-4">
            <GraphFilters
              filters={filters}
              allNodeTypes={allNodeTypes}
              allRelationshipTypes={allRelationshipTypes}
              allSourceSystems={allSourceSystems}
              allRiskLevels={allRiskLevels}
              allStatuses={allStatuses}
              allAccessTypes={allAccessTypes}
              onSystemFilter={filterSystems}
              onNodeTypeFilter={filterNodeTypes}
              onRelationshipTypeFilter={setRelationshipTypeFilter}
              onRiskLevelFilter={filterRisks}
              onStatusFilter={filterStatuses}
              onAccessFilter={setAccessFilter}
              onPreset={applyPreset}
              onReset={clearGraphFilters}
            />
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Legend</p>
            <GraphLegend />
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-center text-[10px] text-gray-500">Saved views<br/><span className="text-gray-600">No saved workspace yet</span></div>
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
            {source==='neo4j'&&expanding.size>0&&<span className="text-[10px] text-primary">Expanding {expanding.size} node{expanding.size===1?'':'s'}…</span>}
            {source==='neo4j'&&partial&&<span className="rounded bg-warning/10 px-2 py-1 text-[10px] text-warning">Partial result · limit reached</span>}
          </div>
          <GraphToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToScreen={handleFitToScreen}
            onResetView={handleResetView}
            onCenter={() => selectedNode ? fgRef.current?.center(selectedNode) : fgRef.current?.fit()}
            onFreeze={handleFreeze}
            frozen={frozen}
            onToggleFullscreen={handleToggleFullscreen}
            onSearch={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            onFilters={() => setFiltersOpen((value) => !value)}
            onShortestPath={openInvestigation}
            onBlastRadius={openInvestigation}
            onAttackPath={openInvestigation}
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
            onNodeDoubleClick={(node) => { if(source==='neo4j')void expandRemote(node.id,'both',1);else expand(node.id,'both',1) }}
            selectedLinkId={selectedLink?.id}
            shortestPathNodeIds={investigation.path?.nodeIds}
            shortestPathLinkIds={investigation.path?.linkIds}
            attackPathNodeIds={investigation.attack?.nodeIds}
            attackPathLinkIds={investigation.attack?.linkIds}
            onZoomChange={setZoom}
          />
        </div>
        <GraphStatusBar nodes={investigation.focusedData.nodes.length} links={investigation.focusedData.links.length} selected={selectedNode} mode={investigation.attack ? 'Attack path' : investigation.path ? 'Shortest path' : investigation.blast ? 'Blast radius' : highlightMode} layout={layout} source={source} zoom={zoom} />
      </div>

      {investigationOpen && <motion.aside id="graph-investigation" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute inset-y-0 right-0 z-30 w-[min(22rem,100vw)] overflow-y-auto border-l border-border bg-surface/95 p-4 shadow-2xl backdrop-blur xl:static xl:w-72 xl:shadow-none">
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Investigation</p><button className="text-gray-500 hover:text-white xl:hidden" onClick={() => setInvestigationOpen(false)}>×</button></div>
        <GraphInvestigationPanel data={visibleData} path={investigation.path} blast={investigation.blast} attack={investigation.attack} onShortest={investigation.runShortestPath} onBlast={investigation.runBlastRadius} onAttack={investigation.runAttackPath} onFocus={investigation.focusNode} onRestore={investigation.restore} onBack={investigation.back} onForward={investigation.forward} canBack={investigation.canBack} canForward={investigation.canForward} />
        <div className="mt-4 border-t border-border pt-3"><p className="mb-2 text-xs font-semibold uppercase text-gray-400">Graph history</p><GraphHistory entries={investigation.history} index={investigation.historyIndex} /></div>
      </motion.aside>}

      <NodeDetailsDrawer
        node={selectedNode}
        data={data}
        onClose={clearSelection}
        onCenter={(node) => fgRef.current?.center(node)}
        onPin={pinNode}
        onDependencies={showDependencies}
      />
      <GraphCommandPalette data={data} onSelect={handleSearchSelect} onFit={handleFitToScreen} onFullscreen={handleToggleFullscreen} onClearFilters={clearGraphFilters} />
      <RelationshipDrawer link={selectedLink} data={data} onClose={() => setSelectedLink(null)} />
    </motion.div>
  )
}
