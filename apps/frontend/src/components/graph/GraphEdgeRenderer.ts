import type { GraphLink } from '../../types/graph'

const INHERITED = new Set(['MEMBER_OF','BELONGS_TO','APPLIES_TO','PART_OF','CONTAINS'])
export interface EdgeRenderState { selected: boolean; shortest: boolean; attack: boolean; upstream: boolean; downstream: boolean; dimmed: boolean }
export function edgeColor(state: EdgeRenderState) { if (state.attack) return '#f97316'; if (state.shortest) return '#22d3ee'; if (state.upstream) return '#ef4444'; if (state.downstream) return '#22c55e'; if (state.selected) return '#fff'; return state.dimmed ? 'rgba(148,163,184,.05)' : 'rgba(148,163,184,.22)' }
export function edgeWidth(state: EdgeRenderState) { return state.selected ? 3 : state.attack || state.shortest ? 2.4 : state.upstream || state.downstream ? 1.8 : .7 }
export function edgeDash(link: GraphLink) { return INHERITED.has(link.relationshipType) ? [4, 3] : null }
