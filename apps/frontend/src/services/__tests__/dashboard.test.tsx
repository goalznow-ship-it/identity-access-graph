import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DashboardGrid } from '../../components/dashboard/DashboardGrid'
import { DashboardEmpty } from '../../components/dashboard/DashboardEmpty'
import type { GraphData } from '../../types/graph'

const data: GraphData = {
  nodes: [
    { id: 'u1', displayName: 'Alice', nodeType: 'USER', sourceSystem: 'ACTIVE_DIRECTORY', riskLevel: 'CRITICAL', properties: { status: 'ACTIVE', privileged: true } },
    { id: 'u2', displayName: 'Bob', nodeType: 'USER', sourceSystem: 'ENTRA_ID', riskLevel: 'LOW', properties: { status: 'DISABLED' } },
    { id: 'app1', displayName: 'Payroll', nodeType: 'APPLICATION', sourceSystem: 'ENTRA_ID', riskLevel: 'NONE', properties: {} },
  ],
  links: [],
}

describe('live dashboard widgets', () => {
  it('derives KPIs and charts from graph data without demo fallbacks', () => {
    const html = renderToStaticMarkup(<MemoryRouter><DashboardGrid data={data} /></MemoryRouter>)
    assert.match(html, /Total Identities/)
    assert.match(html, /Active Accounts/)
    assert.match(html, /ACTIVE DIRECTORY/)
    assert.match(html, /Latest Operational Changes/)
    assert.match(html, /Loading latest changes/)
    assert.doesNotMatch(html, /quarterly_access_review/)
    assert.doesNotMatch(html, /Maya Chen/)
  })
  it('renders an honest non-fatal empty dataset state', () => {
    const html = renderToStaticMarkup(<DashboardEmpty empty onRetry={() => undefined} />)
    assert.match(html, /No dataset has been imported yet\./)
    assert.doesNotMatch(html, /Dashboard data unavailable/)
  })
})
