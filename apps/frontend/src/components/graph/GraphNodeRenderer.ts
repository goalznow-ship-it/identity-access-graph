import type { GraphNode } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'
import { labelVisibility } from '../../services/graphPresentation'

const textWidthCache = new Map<string, number>()
const ICONS: Record<string, string> = {
  USER: '♙', GROUP: '👥', ROLE: '♜', PERMISSION: '⚿', DEPARTMENT: '▦', TEAM: '▦', MANAGER: '★', COMPUTER: '▣', HOST: '▤',
  LINUX_USER: '⌘', LINUX_GROUP: '♣', APPLICATION: '▧', DATABASE: '≋', BUSINESS_SERVICE: '⬡', DOMAIN: '◎', FOREST: '♧',
  ORGANIZATIONAL_UNIT: '⌂', GROUP_POLICY: '§', SERVICE_ACCOUNT: '⚙', MANAGED_SERVICE_ACCOUNT: '⚙', SUDO_POLICY: '#', SSH_KEY: '⚿',
}
const SOURCE_BADGES: Record<string, string> = { ACTIVE_DIRECTORY: 'AD', AZURE_AD: 'AD', FREE_IPA: 'IPA', LINUX: 'Linux', CUSTOM: 'Import', MANUAL: 'Import' }

export interface NodeRenderState { selected: boolean; hovered: boolean; related: boolean; dimmed: boolean; upstream: boolean; downstream: boolean; attack: boolean; shortest: boolean }

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation = 0) {
  ctx.beginPath(); for (let index = 0; index < sides; index++) { const angle = rotation + index * Math.PI * 2 / sides; const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; index ? ctx.lineTo(px, py) : ctx.moveTo(px, py) } ctx.closePath()
}
function truncate(value: string, max = 22) { return value.length > max ? `${value.slice(0, max - 1)}…` : value }

export function renderGraphNode(ctx: CanvasRenderingContext2D, node: GraphNode, scale: number, state: NodeRenderState) {
  const x = node.x ?? 0; const y = node.y ?? 0
  const large = ['BUSINESS_SERVICE','HOST','COMPUTER','APPLICATION','DATABASE'].includes(node.nodeType) || node.properties.isCluster===true
  const radius = (large ? 13 : 10) * (state.selected ? 1.25 : 1)
  const color = state.attack ? '#f97316' : state.shortest ? '#22d3ee' : state.upstream ? '#ef4444' : state.downstream ? '#22c55e' : getNodeColor(node)
  ctx.save(); ctx.globalAlpha = state.dimmed ? 0.12 : 1
  ctx.shadowColor = state.selected ? '#ffffff' : 'transparent'; ctx.shadowBlur = state.selected ? 14 : 0

  if (node.riskLevel !== 'NONE') {
    const risk = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }[node.riskLevel]
    const pulse=node.riskLevel==='CRITICAL'&&(state.selected||state.hovered)?(Math.sin(performance.now()/220)+1)*1.2:0;ctx.beginPath(); ctx.arc(x, y, radius + (node.riskLevel === 'LOW' ? 2 : 4)+pulse, 0, Math.PI * 2); ctx.strokeStyle = risk; ctx.lineWidth = node.riskLevel === 'LOW' ? 1.5 : 3; ctx.stroke()
  }

  ctx.fillStyle = '#111827'; ctx.strokeStyle = state.selected ? '#fff' : color; ctx.lineWidth = state.selected ? 2.5 : 1.8
  if (['USER','LINUX_USER','MANAGER'].includes(node.nodeType)) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2) }
  else if (['GROUP','LINUX_GROUP','BUSINESS_SERVICE'].includes(node.nodeType)) polygon(ctx, x, y, radius + 1, 6, Math.PI / 6)
  else if (node.nodeType === 'ROLE') polygon(ctx, x, y, radius + 2, 5, -Math.PI / 2)
  else if (node.nodeType === 'PERMISSION') polygon(ctx, x, y, radius + 1, 4, Math.PI / 4)
  else if (node.nodeType === 'DATABASE') { ctx.beginPath(); ctx.ellipse(x, y - radius * .55, radius * 1.15, radius * .38, 0, 0, Math.PI * 2); ctx.rect(x - radius * 1.15, y - radius * .55, radius * 2.3, radius * 1.15) }
  else { ctx.beginPath(); ctx.roundRect(x - radius * 1.25, y - radius * .8, radius * 2.5, radius * 1.6, 4) }
  ctx.fill(); ctx.stroke()
  if (node.nodeType === 'BUSINESS_SERVICE') { ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke() }

  ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.font = `${Math.max(8, radius)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';const initials=node.nodeType==='USER'?node.displayName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase():'';const mark=node.properties.isCluster===true?String(node.properties.nodeCount??''):(initials||ICONS[node.nodeType]||'•');ctx.fillText(mark, x, y)
  const badge = node.properties.provenance && (node.properties.provenance as any).database==='neo4j' ? 'Neo4j' : SOURCE_BADGES[node.sourceSystem] ?? node.sourceSystem.slice(0, 3)
  ctx.font = '5px sans-serif'; const badgeWidth = Math.max(9, badge.length * 3 + 3); ctx.fillStyle = '#0f172a'; ctx.fillRect(x + radius * .55, y - radius - 4, badgeWidth, 7); ctx.fillStyle = '#94a3b8'; ctx.fillText(badge, x + radius * .55 + badgeWidth / 2, y - radius - .5)

  const status = String(node.properties.status??'').toUpperCase(); const flags=[status==='DISABLED'?'DIS':status==='LOCKED'?'LOCK':status==='STALE'?'STALE':'',node.properties.privileged===true?'PRIV':'',node.properties.correlationConfidence?'CORR':''].filter(Boolean)
  if(flags.length){ctx.font='5px sans-serif';ctx.textAlign='center';flags.slice(0,2).forEach((flag,index)=>{const bx=x-radius-2;const by=y-radius+index*7;ctx.fillStyle=flag==='PRIV'?'#7c2d12':'#334155';ctx.fillRect(bx-5,by-3,Math.max(10,flag.length*3+3),6);ctx.fillStyle='#f8fafc';ctx.fillText(flag,bx,by)})}
  const showLabel = labelVisibility(node,scale,{selected:state.selected,hovered:state.hovered,path:state.attack||state.shortest})
  if (showLabel) {
    const label = truncate(node.displayName); ctx.font = `${Math.max(8, 10 / scale)}px Inter, sans-serif`
    const cacheKey = `${ctx.font}:${label}`; const width = textWidthCache.get(cacheKey) ?? ctx.measureText(label).width; textWidthCache.set(cacheKey, width)
    const labelY = y + radius + 7; ctx.fillStyle = 'rgba(8,15,28,.88)'; ctx.fillRect(x - width / 2 - 3, labelY - 1, width + 6, 12 / scale); ctx.fillStyle = '#e2e8f0'; ctx.textBaseline = 'top'; ctx.fillText(label, x, labelY)
    if(scale>=1.8&&!node.properties.isCluster){const secondary=String(node.properties.username??node.sourceId??'');if(secondary){ctx.font=`${Math.max(6,8/scale)}px Inter`;ctx.fillStyle='#94a3b8';ctx.fillText(truncate(secondary,18),x,labelY+11/scale)}}
  }
  ctx.restore()
}

export function nodeIcon(type: string) { return ICONS[type] ?? '•' }
export function sourceBadge(source: string) { return SOURCE_BADGES[source] ?? source.slice(0, 3) }
