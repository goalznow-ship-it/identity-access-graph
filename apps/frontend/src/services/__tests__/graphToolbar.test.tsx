import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { GraphToolbar } from '../../components/graph/GraphToolbar'

const noop = () => {}

describe('GraphToolbar', () => {
  it('disables path analysis buttons when hasRelationships is false', () => {
    const html = renderToStaticMarkup(
      <GraphToolbar
        onZoomIn={noop} onZoomOut={noop} onFitToScreen={noop} onResetView={noop}
        onCenter={noop} onFreeze={noop} frozen={false} onToggleFullscreen={noop}
        onSearch={noop} onFilters={noop} onShortestPath={noop} onBlastRadius={noop}
        onAttackPath={noop}
        highlightMode="none" onHighlightModeChange={noop} hasSelection={false}
        hasRelationships={false} source="imported" importedAvailable={true}
        onSourceChange={noop} layout="force" onLayoutChange={noop}
        onExport={noop}
      />
    )
    assert.match(html, /cursor-not-allowed opacity-30/)
  })

  it('enables path analysis buttons when hasRelationships is true', () => {
    const html = renderToStaticMarkup(
      <GraphToolbar
        onZoomIn={noop} onZoomOut={noop} onFitToScreen={noop} onResetView={noop}
        onCenter={noop} onFreeze={noop} frozen={false} onToggleFullscreen={noop}
        onSearch={noop} onFilters={noop} onShortestPath={noop} onBlastRadius={noop}
        onAttackPath={noop}
        highlightMode="none" onHighlightModeChange={noop} hasSelection={false}
        hasRelationships={true} source="imported" importedAvailable={true}
        onSourceChange={noop} layout="force" onLayoutChange={noop}
        onExport={noop}
      />
    )
    assert.doesNotMatch(html, /cursor-not-allowed opacity-30/)
  })
})
