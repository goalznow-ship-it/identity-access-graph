import type { GraphData } from '../types/graph'

function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url) }
const value = (input: unknown) => JSON.stringify(String(input ?? ''))
export function exportGraph(data: GraphData, format: 'json' | 'csv' | 'cypher') {
  if (format === 'json') return download('identity-graph.json', JSON.stringify(data, null, 2), 'application/json')
  if (format === 'csv') {
    const nodes = ['kind,id,label,type,source,risk', ...data.nodes.map((node) => ['node',node.id,node.displayName,node.nodeType,node.sourceSystem,node.riskLevel].map(value).join(','))]
    const links = data.links.map((link) => ['relationship',link.id,String(typeof link.source === 'object' ? (link.source as any).id : link.source),String(typeof link.target === 'object' ? (link.target as any).id : link.target),link.relationshipType,link.sourceSystem].map(value).join(','))
    return download('identity-graph.csv', [...nodes,...links].join('\n'), 'text/csv')
  }
  const safe = (input: unknown) => String(input ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const nodes = data.nodes.map((node) => `MERGE (n:${node.nodeType} {id:'${safe(node.id)}'}) SET n.displayName='${safe(node.displayName)}';`)
  const links = data.links.map((link) => `MATCH (a {id:'${safe(typeof link.source === 'object' ? (link.source as any).id : link.source)}'}),(b {id:'${safe(typeof link.target === 'object' ? (link.target as any).id : link.target)}'}) MERGE (a)-[:${link.relationshipType}]->(b);`)
  download('identity-graph.cypher', [...nodes,...links].join('\n'), 'text/plain')
}
