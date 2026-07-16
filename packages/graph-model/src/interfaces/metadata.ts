export interface NodeMetadata {
  indexed: boolean
  labels: string[]
  properties: string[]
  neo4jLabels?: string[]
  importedAt?: string
  importBatchId?: string
}

export interface RelationshipMetadata {
  indexed: boolean
  type: string
  properties: string[]
  createdAt?: string
  updatedAt?: string
}

export interface AuditInformation {
  createdBy?: string
  createdBySystem?: string
  updatedBy?: string
  updatedBySystem?: string
  lastAccessedAt?: string
  accessCount?: number
}

export interface ImportInformation {
  importId: string
  importSource: string
  importTimestamp: string
  importBatch: string
  importedBy?: string
  importType: 'Full' | 'Incremental' | 'Delta'
  importStatus: 'Pending' | 'InProgress' | 'Completed' | 'Failed'
}
