import { GraphCanvas } from '../graph/GraphCanvas'
import type { ImportGraphPreview as Preview } from '../../types/import'

export function ImportGraphPreview({ preview }: { preview: Preview }) {
  if (preview.links.length === 0) {
    return (
      <div className="rounded border border-border bg-card p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-200">Node preview</h4>
          <p className="text-xs text-gray-500">No relationships were produced for this dataset. Showing nodes as a table instead of an empty-looking force graph.</p>
        </div>
        <div className="max-h-[420px] overflow-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface text-gray-400"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Risk</th></tr></thead>
            <tbody>{preview.nodes.map((node) => <tr key={node.id} className="border-t border-border text-gray-300"><td className="px-3 py-2">{node.displayName}</td><td className="px-3 py-2">{node.nodeType}</td><td className="px-3 py-2">{node.sourceSystem}</td><td className="px-3 py-2">{node.riskLevel}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    )
  }
  return <div className="h-[420px] overflow-hidden rounded border border-border"><GraphCanvas data={{ nodes: preview.nodes, links: preview.links }} selectedNode={null} highlightMode="none" dependencyInfo={null} onNodeClick={() => undefined} onBackgroundClick={() => undefined} /></div>
}
