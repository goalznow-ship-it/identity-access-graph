import { NodeType, SourceSystem, RiskLevel, AccountStatus } from '../enums'
import type { CommonProperties } from '../interfaces/common'

export interface BaseNode extends CommonProperties {
  id: string
  nodeType: NodeType
  displayName: string
  description?: string
  sourceSystem: SourceSystem
  sourceId?: string
  externalId?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  status: AccountStatus
  riskLevel: RiskLevel
  tags?: string[]
}
