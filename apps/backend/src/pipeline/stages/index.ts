import { PipelineStage, PipelineStatus } from '../../../../../packages/shared-types/src'
import type { StageResult } from '../../../../../packages/shared-types/src'

export interface StageInput {
  nodes: Record<string, unknown>[]
  relationships: Record<string, unknown>[]
  metadata: Record<string, unknown>
}

export interface StageOutput {
  nodes: Record<string, unknown>[]
  relationships: Record<string, unknown>[]
  metadata: Record<string, unknown>
}

export type StageHandler = (
  input: StageInput,
  stage: PipelineStage,
) => Promise<StageResult & { output: StageOutput }>

function now(): string {
  return new Date().toISOString()
}

export async function extractionStage(input: StageInput): Promise<StageResult & { output: StageOutput }> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  const nodes = [...input.nodes]
  const relationships = [...input.relationships]

  warnings.push(`Extracted ${nodes.length} nodes from ${input.metadata.source ?? 'unknown'} source`)
  if (nodes.length === 0) errors.push('No nodes extracted')

  return {
    stage: PipelineStage.Extraction,
    status: errors.length > 0 ? PipelineStatus.Failed : PipelineStatus.Completed,
    inputCount: input.nodes.length,
    outputCount: nodes.length + relationships.length,
    durationMs: Date.now() - start,
    warnings,
    errors,
    metadata: { extractedAt: now(), source: input.metadata.source ?? 'mock', nodeTypes: [...new Set(nodes.map((n) => (n as any).nodeType))] },
    output: { nodes, relationships, metadata: { ...input.metadata, extractedAt: now() } },
  }
}

export async function normalizationStage(input: StageInput): Promise<StageResult & { output: StageOutput }> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  const nodes = input.nodes.map((n: any) => {
    if (!n.id || !n.displayName) {
      warnings.push(`Node missing id or displayName: ${JSON.stringify(n)}`)
    }
    return { ...n, normalized: true }
  })
  const relationships = input.relationships.map((r: any) => {
    if (!r.id || !r.relationshipType) {
      warnings.push(`Relationship missing id or type: ${JSON.stringify(r)}`)
    }
    return { ...r, normalized: true }
  })

  return {
    stage: PipelineStage.Normalization,
    status: PipelineStatus.Completed,
    inputCount: input.nodes.length + input.relationships.length,
    outputCount: nodes.length + relationships.length,
    durationMs: Date.now() - start,
    warnings,
    errors,
    metadata: { normalizedAt: now() },
    output: { nodes, relationships, metadata: { ...input.metadata, normalizedAt: now() } },
  }
}

export async function identityMatchingStage(input: StageInput): Promise<StageResult & { output: StageOutput }> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []
  const matches: Array<{ adId: string; freeIpaId: string; confidence: number }> = []

  const users = input.nodes.filter((n: any) => n.nodeType === 'USER')
  const adUsers = users.filter((u: any) => u.sourceSystem === 'ACTIVE_DIRECTORY')
  const ipaUsers = users.filter((u: any) => u.sourceSystem === 'FREE_IPA')

  for (const ad of adUsers) {
    const match = ipaUsers.find((ipa: any) =>
      (ad as any).sourceId === (ipa as any).sourceId ||
      (ad as any).email?.split('@')[0] === (ipa as any).principalName?.split('@')[0],
    )
    if (match) {
      matches.push({ adId: (ad as any).id, freeIpaId: (match as any).id, confidence: 0.95 })
    }
  }

  if (matches.length > 0) {
    warnings.push(`Found ${matches.length} identity match(es) across AD ↔ FreeIPA`)
  }

  const nodes = input.nodes.map((n: any) => {
    const m = matches.find((x) => x.adId === n.id || x.freeIpaId === n.id)
    return m ? { ...n, matchedIdentity: m } : n
  })

  return {
    stage: PipelineStage.IdentityMatching,
    status: PipelineStatus.Completed,
    inputCount: adUsers.length + ipaUsers.length,
    outputCount: matches.length,
    durationMs: Date.now() - start,
    warnings,
    errors,
    metadata: { matchedAt: now(), matchCount: matches.length, adUserCount: adUsers.length, ipaUserCount: ipaUsers.length },
    output: { nodes, relationships: input.relationships, metadata: { ...input.metadata, matchedAt: now(), matches } },
  }
}

export async function graphBuildStage(input: StageInput): Promise<StageResult & { output: StageOutput }> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  const nodeIds = new Set(input.nodes.map((n: any) => n.id))
  const rels = input.relationships

  for (const r of rels) {
    if (!nodeIds.has((r as any).sourceNodeId)) {
      errors.push(`Relationship ${(r as any).id}: source node '${(r as any).sourceNodeId}' not found`)
    }
    if (!nodeIds.has((r as any).targetNodeId)) {
      errors.push(`Relationship ${(r as any).id}: target node '${(r as any).targetNodeId}' not found`)
    }
  }

  const nodeTypeCounts: Record<string, number> = {}
  for (const n of input.nodes) {
    const key = (n as any).nodeType ?? 'UNKNOWN'
    nodeTypeCounts[key] = (nodeTypeCounts[key] ?? 0) + 1
  }

  const status = errors.length > 0 ? PipelineStatus.Failed : PipelineStatus.Completed

  return {
    stage: PipelineStage.GraphBuild,
    status,
    inputCount: input.nodes.length + rels.length,
    outputCount: input.nodes.length + rels.length,
    durationMs: Date.now() - start,
    warnings,
    errors,
    metadata: { builtAt: now(), nodeCount: input.nodes.length, relationshipCount: rels.length, nodeTypeCounts },
    output: { nodes: input.nodes, relationships: rels, metadata: { ...input.metadata, builtAt: now(), validated: status === PipelineStatus.Completed } },
  }
}

export async function schedulingStage(input: StageInput): Promise<StageResult & { output: StageOutput }> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  const nextRun = new Date(Date.now() + 3600000).toISOString()

  return {
    stage: PipelineStage.Scheduling,
    status: PipelineStatus.Completed,
    inputCount: input.nodes.length + input.relationships.length,
    outputCount: 1,
    durationMs: Date.now() - start,
    warnings,
    errors,
    metadata: { scheduledAt: now(), nextRun, intervalMs: 3600000, cronExpression: '0 * * * *' },
    output: { nodes: input.nodes, relationships: input.relationships, metadata: { ...input.metadata, scheduledAt: now(), nextRun } },
  }
}

export const stageHandlers: Record<PipelineStage, StageHandler> = {
  [PipelineStage.Extraction]: extractionStage,
  [PipelineStage.Normalization]: normalizationStage,
  [PipelineStage.IdentityMatching]: identityMatchingStage,
  [PipelineStage.GraphBuild]: graphBuildStage,
  [PipelineStage.Scheduling]: schedulingStage,
}
