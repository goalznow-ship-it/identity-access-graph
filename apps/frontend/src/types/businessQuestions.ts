import type { GraphNode } from './graph'

export type QuestionCategory = 'Identity' | 'Access' | 'Privilege' | 'Infrastructure' | 'Business Impact' | 'Linux' | 'Risk'

export type ResultType = 'node' | 'relationship' | 'path' | 'tree' | 'risk' | 'table'

export interface BusinessQuestion {
  id: string
  title: string
  description: string
  category: QuestionCategory
  icon: string
  resultType: ResultType
  requiresInput: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: 'host' | 'user' | 'group' | 'application' | 'text'
}

export interface QuestionResult {
  questionId: string
  title: string
  summary: string
  statistics: QuestionStat[]
  nodes: GraphNode[]
  paths: QuestionPath[]
  relationships: QuestionRel[]
  riskFindings: QuestionRiskFinding[]
  affectedIdentities: AffectedEntity[]
  affectedSystems: AffectedEntity[]
  affectedBusinessServices: AffectedEntity[]
  rawData: Record<string, unknown>[]
}

export interface QuestionStat {
  label: string
  value: number
  color?: string
}

export interface QuestionPath {
  nodes: { id: string; displayName: string; nodeType: string }[]
  relationships: string[]
}

export interface QuestionRel {
  source: string
  target: string
  type: string
  sourceType: string
  targetType: string
}

export interface QuestionRiskFinding {
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  count: number
}

export interface AffectedEntity {
  id: string
  name: string
  type: string
  detail?: string
}

export interface InputSuggestion {
  id: string
  label: string
  type: string
}
