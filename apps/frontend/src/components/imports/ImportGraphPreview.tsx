import { GraphCanvas } from '../graph/GraphCanvas'
import type { ImportGraphPreview as Preview } from '../../types/import'

export function ImportGraphPreview({ preview }: { preview: Preview }) {
  return <div className="h-[420px] overflow-hidden rounded border border-border"><GraphCanvas data={{ nodes: preview.nodes, links: preview.links }} selectedNode={null} highlightMode="none" dependencyInfo={null} onNodeClick={() => undefined} onBackgroundClick={() => undefined} /></div>
}
