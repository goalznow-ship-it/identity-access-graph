import type { GraphNode } from '../../types/graph'
import { getNodeColor } from '../../services/graphDataAdapter'
import { labelVisibility } from '../../services/graphPresentation'

const textWidthCache = new Map<string, number>()
const ICONS: Record<string, string> = {
  USER: 'U', GROUP: 'G', ROLE: 'R', PERMISSION: 'P', DEPARTMENT: 'D', TEAM: 'T', MANAGER: 'M',
  COMPUTER: 'C', HOST: 'H', LINUX_USER: 'Lu', LINUX_GROUP: 'Lg', APPLICATION: 'A', DATABASE: 'DB',
  BUSINESS_SERVICE: 'BS', DOMAIN: 'DM', FOREST: 'FR', ORGANIZATIONAL_UNIT: 'OU',
  GROUP_POLICY: 'GP', SERVICE_ACCOUNT: 'SA', MANAGED_SERVICE_ACCOUNT: 'MS',
  SUDO_POLICY: 'SP', SSH_KEY: 'SK',
}
const SOURCE_BADGES: Record<string, string> = {
  ACTIVE_DIRECTORY: 'AD', AZURE_AD: 'AAD', FREE_IPA: 'IPA', LINUX: 'NIX', CUSTOM: 'IMP', MANUAL: 'MAN',
}

export interface NodeRenderState {
  selected: boolean; hovered: boolean; related: boolean; dimmed: boolean
  upstream: boolean; downstream: boolean; attack: boolean; shortest: boolean
}

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation = 0) {
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * Math.PI * 2 / sides
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
}

function truncate(value: string, max = 24) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function renderGraphNode(ctx: CanvasRenderingContext2D, node: GraphNode, scale: number, state: NodeRenderState) {
  const x = node.x ?? 0
  const y = node.y ?? 0
  const large = ['BUSINESS_SERVICE', 'HOST', 'COMPUTER', 'APPLICATION', 'DATABASE'].includes(node.nodeType) || node.properties.isCluster === true
  const radius = (large ? 22 : 17) * (state.selected ? 1.15 : 1)
  const color = state.attack ? '#f97316' : state.shortest ? '#22d3ee' : state.upstream ? '#ef4444' : state.downstream ? '#22c55e' : getNodeColor(node)

  ctx.save()
  ctx.globalAlpha = state.dimmed ? 0.1 : 1

  // Risk ring
  if (node.riskLevel !== 'NONE') {
    const riskColors: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }
    const riskColor = riskColors[node.riskLevel] ?? '#6b7280'
    const ringWidth = node.riskLevel === 'CRITICAL' ? 3.5 : node.riskLevel === 'HIGH' ? 2.5 : node.riskLevel === 'MEDIUM' ? 2 : 1.5
    const ringGap = node.riskLevel === 'LOW' ? 2 : 4
    const pulse = node.riskLevel === 'CRITICAL' && state.selected ? (Math.sin(performance.now() / 200) + 1) * 1.5 : 0

    ctx.beginPath()
    ctx.arc(x, y, radius + ringGap + pulse, 0, Math.PI * 2)
    ctx.strokeStyle = riskColor
    ctx.lineWidth = ringWidth
    ctx.globalAlpha = state.dimmed ? 0.25 : node.riskLevel === 'CRITICAL' ? 0.9 : 0.7
    ctx.stroke()
    ctx.globalAlpha = state.dimmed ? 0.1 : 1
  }

  // Shadow for selected
  ctx.shadowColor = state.selected ? 'rgba(255,255,255,0.3)' : 'transparent'
  ctx.shadowBlur = state.selected ? 18 : 0

  // Node shape
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = state.selected ? '#ffffff' : color
  ctx.lineWidth = state.selected ? 2.5 : 1.8

  const nt = node.nodeType
  if (nt === 'USER' || nt === 'LINUX_USER' || nt === 'MANAGER') {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
  } else if (nt === 'GROUP' || nt === 'LINUX_GROUP') {
    polygon(ctx, x, y, radius + 1, 6, 0)
  } else if (nt === 'BUSINESS_SERVICE') {
    polygon(ctx, x, y, radius + 2, 8, Math.PI / 8)
  } else if (nt === 'ROLE') {
    polygon(ctx, x, y, radius + 2, 5, -Math.PI / 2)
  } else if (nt === 'PERMISSION') {
    polygon(ctx, x, y, radius + 1, 4, Math.PI / 4)
  } else if (nt === 'DATABASE') {
    ctx.beginPath()
    ctx.ellipse(x, y - radius * 0.55, radius * 1.15, radius * 0.38, 0, 0, Math.PI * 2)
    ctx.rect(x - radius * 1.15, y - radius * 0.55, radius * 2.3, radius * 1.15)
  } else if (nt === 'HOST' || nt === 'COMPUTER') {
    drawRoundRect(ctx, x - radius * 0.9, y - radius * 0.9, radius * 1.8, radius * 1.8, 3)
  } else {
    drawRoundRect(ctx, x - radius * 1.2, y - radius * 0.85, radius * 2.4, radius * 1.7, 4)
  }
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  // Inner icon/initials
  ctx.fillStyle = color
  const fontSize = nt === 'USER' ? Math.max(11, radius * 0.7) : Math.max(9, radius * 0.6)
  ctx.font = `bold ${fontSize}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let mark: string
  if (node.properties.isCluster === true) {
    mark = String(node.properties.nodeCount ?? '∞')
  } else if (nt === 'USER') {
    const parts = node.displayName.split(/\s+/).slice(0, 2)
    mark = parts.length === 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0]?.slice(0, 2).toUpperCase() || 'U'
  } else {
    mark = ICONS[nt] || '•'
  }
  ctx.fillText(mark, x, y)

  // Source badge
  const badge = node.properties.provenance && (node.properties.provenance as any).database === 'neo4j'
    ? 'N4J' : SOURCE_BADGES[node.sourceSystem] ?? node.sourceSystem.slice(0, 3).toUpperCase()
  ctx.font = '6px Inter, sans-serif'
  const badgeW = Math.max(12, badge.length * 3.8 + 4)
  const badgeX = x + radius * 0.45
  const badgeY = y - radius - 6
  ctx.fillStyle = 'rgba(15,23,42,0.88)'
  drawRoundRect(ctx, badgeX, badgeY, badgeW, 8, 2)
  ctx.fill()
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badge, badgeX + badgeW / 2, badgeY + 4)

  // Status flags
  const status = String(node.properties.status ?? '').toUpperCase()
  const flags = [
    status === 'DISABLED' ? 'DIS' : status === 'LOCKED' ? 'LCK' : status === 'STALE' ? 'STL' : '',
    node.properties.privileged === true ? 'PRIV' : '',
    node.properties.correlationConfidence ? 'CRR' : '',
  ].filter(Boolean)
  if (flags.length) {
    ctx.font = '6px Inter, sans-serif'
    ctx.textAlign = 'center'
    flags.slice(0, 2).forEach((flag, i) => {
      const fx = x - radius - 3
      const fy = y - radius + i * 6
      const fw = Math.max(8, flag.length * 3 + 2)
      ctx.fillStyle = flag === 'PRIV' ? 'rgba(124,45,18,0.9)' : 'rgba(51,65,85,0.9)'
      drawRoundRect(ctx, fx - fw / 2, fy - 2, fw, 5, 1.5)
      ctx.fill()
      ctx.fillStyle = '#f8fafc'
      ctx.fillText(flag, fx, fy + 0.5)
    })
  }

  // Label
  const showLabel = labelVisibility(node, scale, {
    selected: state.selected,
    hovered: state.hovered,
    path: state.attack || state.shortest,
  })
  if (showLabel) {
    const label = truncate(node.displayName, 28)
    const labelFontSize = Math.max(10, 12 / scale)
    ctx.font = `${labelFontSize}px Inter, sans-serif`
    const cacheKey = `${ctx.font}:${label}`
    let tw = textWidthCache.get(cacheKey)
    if (tw === undefined) {
      tw = ctx.measureText(label).width
      textWidthCache.set(cacheKey, tw)
    }
    const lx = x
    const ly = y + radius + 9
    const lh = Math.max(14, 16 / scale)
    const lw = tw + 12
    ctx.fillStyle = 'rgba(8,15,28,0.92)'
    drawRoundRect(ctx, lx - lw / 2, ly - 2, lw, lh, 3)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.textBaseline = 'top'
    ctx.fillText(label, lx, ly)

    if (scale >= 1.6 && !node.properties.isCluster) {
      const secondary = String(node.properties.username ?? node.sourceId ?? '')
      if (secondary) {
        ctx.font = `${Math.max(6, 8 / scale)}px Inter, sans-serif`
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(truncate(secondary, 20), lx, ly + lh - 1)
      }
    }
  }

  ctx.restore()
}

export function nodeIcon(type: string) { return ICONS[type] ?? '•' }
export function sourceBadge(source: string) { return SOURCE_BADGES[source] ?? source.slice(0, 3).toUpperCase() }
