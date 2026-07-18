import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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
  GraphMiniMap,
  GraphWorkspaceControls,
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
import { getActiveImportSession } from '../services/importApi'
import { clusterGraph, filterGraphView, loadLayout, saveLayout, type GraphClusterMode, type GraphViewMode, type SavedGraphView } from '../services/graphPresentation'
import { getAttackPath } from '../services/attackPathApi'
import type { AttackPath } from '../types/attackPath'

export function GraphPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const importedId = searchParams.get('importId')
  const [importedAvailable,setImportedAvailable]=useState(Boolean(importedId))
  const { source, setSource } = useGraphSource(importedId ? 'imported' : searchParams.get('source'))
  const backendFilters = { nodeType: searchParams.get('nodeType') ?? undefined, sourceSystem: searchParams.get('sourceSystem') ?? undefined, risk: searchParams.get('risk') ?? undefined, status: searchParams.get('status') ?? undefined }
  const [remoteFilters, setRemoteFilters] = useState<Record<string, unknown>>(backendFilters)
  const { data, loading, error, retry, partial, expanding, expandRemote, fallbackNotice: importFallbackNotice } = useGraphData(source === 'imported' ? importedId : null, source, remoteFilters)
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
  const [viewMode,setViewMode]=useState<GraphViewMode>('overview')
  const [clusterMode,setClusterMode]=useState<GraphClusterMode>('none')
  const [externalPath,setExternalPath]=useState<AttackPath|null>(null)
  const presentedData=useMemo(()=>externalPath?{nodes:externalPath.nodes,links:externalPath.relationships}:clusterGraph(filterGraphView(filteredData,viewMode),clusterMode),[filteredData,viewMode,clusterMode,externalPath])
  const { visibleData, visibleIds, expand, collapse, hide } = useGraphExpansion(presentedData)
  const investigation = useGraphInvestigation(visibleData)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [layout, setLayout] = useState<GraphLayout>(()=>typeof localStorage==='undefined'?'force':loadLayout(localStorage,source))
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null)
  const [frozen, setFrozen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [investigationOpen, setInvestigationOpen] = useState(true)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const visibleNotice = fallbackNotice ?? importFallbackNotice
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
  useEffect(()=>{const pathId=searchParams.get('pathId');if(!pathId){setExternalPath(null);return}void getAttackPath(pathId).then(path=>{setExternalPath(path);setInvestigationOpen(true);window.setTimeout(()=>fgRef.current?.fit(),100)}).catch(()=>setFallbackNotice('Attack path could not be loaded.'))},[searchParams])

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
  const handleLayoutChange = (next: GraphLayout) => { setLayout(next); if(typeof localStorage!=='undefined')saveLayout(localStorage,source,next); fgRef.current?.setLayout(next) }
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
      fgRef.current?.center(node)
      if (source === 'neo4j') void getNeo4jNode(node.id).then((full) => selectNode(adaptNeo4jNode(full))).catch(() => undefined)
    },
    [selectNode, source],
  )

  const handleBackgroundClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleSourceChange = (next: GraphSourceMode) => {
    setSource(next); clearSelection()
  }

  const pinNode = (node: GraphNode) => { node.fx = node.x ?? 0; node.fy = node.y ?? 0;node.properties.__pinned=true }
  const showDependencies = (node: GraphNode) => { selectNode(node); setHighlightMode('all') }
  const handleContextAction = (action: GraphContextAction, node: GraphNode, direction: ExpansionDirection = 'both', depth = 1) => {
    if (action === 'details') selectNode(node)
    if (action === 'profile') navigate(`/identities/${node.id}`)
    if (action === 'center') fgRef.current?.center(node)
    if (action === 'expand') { if(node.properties.isCluster===true)setClusterMode('none');else if (source === 'neo4j') void expandRemote(node.id, direction, Math.min(depth, 3)); else expand(node.id, direction, depth) }
    if (action === 'collapse') collapse(node.id)
    if (action === 'hide') { hide(node.id); if (selectedNode?.id === node.id) clearSelection() }
    if (action === 'pin') pinNode(node)
    if (action === 'dependencies') showDependencies(node)
    if (action === 'paths-from'||action==='privileged-reachability'||action==='attack-workspace') navigate(`/attack-paths?sourceNodeId=${encodeURIComponent(node.id)}`)
    if (action === 'paths-to') navigate(`/attack-paths?targetNodeId=${encodeURIComponent(node.id)}`)
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (event.key === 'Escape') { clearSelection(); setSelectedLink(null) }
      if (event.key.toLowerCase() === 'f') fgRef.current?.fit()
      if (event.key === '[') investigation.back()
      if (event.key === ']') investigation.forward()
      const layouts: Record<string, GraphLayout> = { '1': 'force', '2': 'hierarchy-lr', '3': 'radial', '4': 'concentric' }
      if (layouts[event.key]) { setLayout(layouts[event.key]); fgRef.current?.setLayout(layouts[event.key]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearSelection, investigation.back, investigation.forward])

  useEffect(()=>{let cancelled=false;if(importedId){setImportedAvailable(true);return()=>{cancelled=true}}void getActiveImportSession().then((session)=>{if(cancelled)return;setImportedAvailable(true);localStorage.setItem('lastImportId',session.importId)}).catch(()=>{if(!cancelled)setImportedAvailable(false)});return()=>{cancelled=true}},[importedId,source])
  useEffect(() => { if (source !== 'neo4j' || !error || typeof localStorage === 'undefined') return; if (loadSettings(localStorage).autoFallback) { setFallbackNotice(`Neo4j Live unavailable: ${error}. Switched to Mock Enterprise.`); setSource('mock') } }, [source, error, setSource])
  useEffect(()=>{if(typeof localStorage==='undefined')return;const next=loadLayout(localStorage,source);setLayout(next);window.setTimeout(()=>fgRef.current?.setLayout(next),0)},[source])

  const loadSavedView=(view:SavedGraphView)=>{setSource(view.source);setViewMode(view.viewMode);setClusterMode(view.clustering);setLayout(view.layout);setSystemFilter(view.filters.systems);setNodeTypeFilter(view.filters.nodeTypes);setRelationshipTypeFilter(view.filters.relationshipTypes);setRiskLevelFilter(view.filters.riskLevels);setStatusFilter(view.filters.statuses);setAccessFilter(view.filters.accessTypes);window.setTimeout(()=>fgRef.current?.setLayout(view.layout),0)}

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
          <p className="text-danger">Failed to load graph data</p><p className="mt-2 max-w-md text-xs text-gray-500">{error}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={()=>void retry()} className="rounded bg-primary px-3 py-1.5 text-xs">Retry</button>{source==='imported'&&<button onClick={()=>navigate('/imports')} className="rounded border border-border px-3 py-1.5 text-xs">Open Imports</button>}<button onClick={()=>setSource('mock')} className="rounded border border-border px-3 py-1.5 text-xs">Use Mock Enterprise</button></div>
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
      {visibleNotice && (
        <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning shadow-xl backdrop-blur">
          {visibleNotice}
        </div>
      )}

      {filtersOpen && (
        <motion.aside
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-border bg-surface/90 p-4 backdrop-blur-xl md:sticky md:w-64"
        >
          <GraphSearch data={filteredData} onSelect={handleSearchSelect} remoteSearch={source === 'neo4j' ? async (query, signal) => (await searchNeo4jNodes(query, { ...backendFilters, limit: 20 }, { signal })).map(adaptNeo4jNode) : undefined} />
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-card/60 p-3">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500">Graph source</label>
            <div className="relative">
              <select value={source} onChange={(event) => handleSourceChange(event.target.value as GraphSourceMode)} className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 text-xs text-gray-200 transition hover:border-gray-600">
                <option value="mock">Mock Enterprise</option>
                <option value="imported">Imported Session</option>
                <option value="neo4j">Neo4j Live</option>
              </select>
            </div>
            {source === 'neo4j' && <Neo4jStatusBadge details />}
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Active</span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">{source}</span>
            </div>
          </div>
          <div className="mt-3">
            <GraphWorkspaceControls viewMode={viewMode} clustering={clusterMode} layout={layout} onViewMode={setViewMode} onClustering={setClusterMode} onLayout={handleLayoutChange} onLoad={loadSavedView} snapshot={{ layout, filters, source, focusedNode: selectedNode?.id, expandedNodes: [...visibleIds], clustering: clusterMode, viewMode }} />
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
            <GraphLegend />
          </div>
          <div className="mt-3 rounded-lg bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-gray-600">
            <kbd className="rounded bg-card px-1 py-0.5 text-[9px]">Ctrl+K</kbd> commands · <kbd className="rounded bg-card px-1 py-0.5 text-[9px]">F</kbd> fit<br />
            <kbd className="rounded bg-card px-1 py-0.5 text-[9px]">1</kbd>–<kbd className="rounded bg-card px-1 py-0.5 text-[9px]">4</kbd> layouts · <kbd className="rounded bg-card px-1 py-0.5 text-[9px]">[</kbd><kbd className="rounded bg-card px-1 py-0.5 text-[9px]">]</kbd> history
          </div>
        </motion.aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/5 hover:text-gray-200"
              title="Toggle Filters"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>
            <GraphStats data={filteredData} selectedNode={selectedNode} />
            {source === 'neo4j' && expanding.size > 0 && <span className="animate-pulse text-[10px] text-primary">Expanding {expanding.size}…</span>}
            {source === 'neo4j' && partial && <span className="rounded-lg bg-warning/10 px-2 py-1 text-[10px] text-warning">Partial · limit reached</span>}
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
            onFilters={() => setFiltersOpen((v) => !v)}
            onShortestPath={openInvestigation}
            onBlastRadius={openInvestigation}
            onAttackPath={openInvestigation}
            highlightMode={highlightMode}
            onHighlightModeChange={setHighlightMode}
            hasSelection={selectedNode !== null}
            source={source}
            importedAvailable={importedAvailable}
            onSourceChange={handleSourceChange}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onExport={handleExport}
          />
        </div>

        <div ref={graphContainerRef} className="relative flex-1 overflow-hidden">
          {investigation.focusedData.nodes.length > 0 && investigation.focusedData.links.length === 0 && (
            <div className="absolute left-4 top-4 z-20 max-w-md rounded-xl border border-warning/20 bg-surface/90 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01"/><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-100">No relationship data</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">This dataset has {investigation.focusedData.nodes.length} nodes but no relationships. Path analysis requires relationship data.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => navigate('/imports')} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-hover">Import relationship data</button>
                    <button onClick={() => setSource('mock')} className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/5">Try demo graph</button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            onNodeDoubleClick={(node) => { if (node.properties.isCluster === true) setClusterMode('none'); else if (source === 'neo4j') void expandRemote(node.id, 'both', 1); else expand(node.id, 'both', 1) }}
            selectedLinkId={selectedLink?.id}
            shortestPathNodeIds={investigation.path?.nodeIds}
            shortestPathLinkIds={investigation.path?.linkIds}
            attackPathNodeIds={externalPath?.nodes.map(n => n.id) ?? investigation.attack?.nodeIds}
            attackPathLinkIds={externalPath?.relationships.map(l => l.id) ?? investigation.attack?.linkIds}
            onZoomChange={setZoom}
          />
          <GraphMiniMap data={investigation.focusedData} selected={selectedNode} onNavigate={(x, y) => fgRef.current?.centerAt(x, y)} />
        </div>
        <GraphStatusBar nodes={investigation.focusedData.nodes.length} links={investigation.focusedData.links.length} hidden={Math.max(0, filteredData.nodes.length - investigation.focusedData.nodes.length)} selected={selectedNode} mode={investigation.attack ? 'Attack path' : investigation.path ? 'Shortest path' : investigation.blast ? 'Blast radius' : highlightMode} view={viewMode} layout={layout} source={source} zoom={zoom} />
      </div>

      {investigationOpen && <motion.aside id="graph-investigation" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-y-0 right-0 z-30 w-[min(22rem,100vw)] overflow-y-auto border-l border-border bg-surface/90 p-4 shadow-2xl backdrop-blur-xl xl:static xl:w-72 xl:shadow-none">
        <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Investigation</p><button className="rounded-lg p-1 text-gray-500 transition hover:bg-white/5 hover:text-gray-200 xl:hidden" onClick={() => setInvestigationOpen(false)}>✕</button></div>
        <GraphInvestigationPanel data={visibleData} path={investigation.path} blast={investigation.blast} attack={investigation.attack} onShortest={investigation.runShortestPath} onBlast={investigation.runBlastRadius} onAttack={investigation.runAttackPath} onFocus={investigation.focusNode} onRestore={investigation.restore} onBack={investigation.back} onForward={investigation.forward} canBack={investigation.canBack} canForward={investigation.canForward} />
        {externalPath && <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-3"><div className="flex items-center justify-between text-xs font-semibold text-warning"><span>Attack path</span><span className="rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px]">{externalPath.totalRiskScore}/100</span></div><p className="mt-2 text-xs leading-relaxed text-gray-400">{externalPath.explanation}</p></div>}
        <div className="mt-4 border-t border-border pt-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">History</p><GraphHistory entries={investigation.history} index={investigation.historyIndex} /></div>
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
