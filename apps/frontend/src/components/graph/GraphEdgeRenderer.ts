import type { GraphLink } from '../../types/graph'
import { edgeVisualStyle } from '../../services/graphPresentation'

const INHERITED = new Set(['MEMBER_OF','BELONGS_TO','APPLIES_TO','PART_OF','CONTAINS'])
export interface EdgeRenderState { selected: boolean; shortest: boolean; attack: boolean; upstream: boolean; downstream: boolean; dimmed: boolean }
export function edgeColor(state: EdgeRenderState,link?:GraphLink) { if (state.attack) return '#ff5a1f'; if (state.shortest||state.selected) return '#22d3ee'; if (state.upstream) return '#ef4444'; if (state.downstream) return '#22c55e'; if(link&&edgeVisualStyle(link,state).color==='orange')return'#f97316'; return state.dimmed ? 'rgba(148,163,184,.04)' : 'rgba(148,163,184,.24)' }
export function edgeWidth(state: EdgeRenderState) { return state.selected ? 3 : state.attack || state.shortest ? 2.4 : state.upstream || state.downstream ? 1.8 : .7 }
export function edgeDash(link: GraphLink) { const style=edgeVisualStyle(link,{});return style.dash==='dotted'?[1,4]:INHERITED.has(link.relationshipType)?[5,4]:null }
