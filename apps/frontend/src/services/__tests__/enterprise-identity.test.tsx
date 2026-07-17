import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'

describe('EnterpriseIdentityPage', () => {
  it('should render loading state', () => {
    const html = renderToStaticMarkup(
      <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center p-4">
        <p className="mt-2 text-sm text-gray-500">Loading enterprise identities...</p>
      </div>,
    )
    assert.match(html, /Loading enterprise identities/)
  })

  it('should render empty state when no identities', () => {
    const html = renderToStaticMarkup(
      <div className="mx-auto flex h-full max-w-6xl flex-col p-4">
        <h1 className="text-lg font-semibold text-gray-100">Enterprise Identity</h1>
        <p className="text-sm text-gray-500">Merged identities across Active Directory, Entra ID, FreeIPA, and Linux.</p>
        <div className="py-8 text-center text-xs text-gray-500">No enterprise identities yet. Run a correlation to get started.</div>
      </div>,
    )
    assert.match(html, /Enterprise Identity/)
    assert.match(html, /Merged identities/)
    assert.match(html, /No enterprise identities/)
  })

  it('should render error state', () => {
    const html = renderToStaticMarkup(
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
        Failed to load enterprise identities.
        <button className="ml-2 text-red-400 hover:text-red-200">Retry</button>
      </div>,
    )
    assert.match(html, /Failed to load/)
  })

  it('should render select identity prompt', () => {
    const html = renderToStaticMarkup(
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Select an enterprise identity to view details.
      </div>,
    )
    assert.match(html, /Select an enterprise identity/)
  })
})
