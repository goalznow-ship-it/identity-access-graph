import type { GraphLink } from '../../types/graph'
import { edgeVisualStyle } from '../../services/graphPresentation'

const INHERITED = new Set(['MEMBER_OF','BELONGS_TO','APPLIES_TO','PART_OF','CONTAINS'])
export interface EdgeRenderState { selected: boolean; shortest: boolean; attack: boolean; upstream: boolean; downstream: boolean; dimmed: boolean }
export function edgeColor(state: EdgeRenderState, link?: GraphLink) {
  if (state.attack) return '#ff5a1f'
  if (state.shortest || state.selected) return '#22d3ee'
  if (state.upstream) return '#ef4444'
  if (state.downstream) return '#22c55e'
  if (link && edgeVisualStyle(link, state).color === 'orange') return '#f97316'
  if (state.dimmed) return 'rgba(148,163,184,0.04)'
  return 'rgba(148,163,184,0.35)'
}
export function edgeWidth(state: EdgeRenderState) {
  if (state.selected) return 3
  if (state.attack || state.shortest) return 2.4
  if (state.upstream || state.downstream) return 1.8
  return 0.9
}
export function edgeDash(link: GraphLink) {
  const style = edgeVisualStyle(link, {})
  if (style.dash === 'dotted') return [2, 4]
  if (INHERITED.has(link.relationshipType)) return [6, 4]
  return null
}
