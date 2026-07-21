import { Injectable, Logger, OnModuleInit, Optional, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common'
import { PipelineEngine, type StageInput } from './pipeline-engine'
import { OperationalStoreService } from '../database/operational-store.service'
import { GraphService } from '../graph'

@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name)
  private readonly engine: PipelineEngine
  private inputReady = false

  constructor(@Optional() private readonly store?: OperationalStoreService, @Optional() private readonly graph?: GraphService) {
    this.engine = new PipelineEngine({ idleDelayMs: 50 })
    this.logger.log(`PipelineEngine initialized; input source is ${this.graph?.isPersistenceEnabled() ? 'Neo4j' : 'unavailable'}`)
  }

  async onModuleInit() {
    const latest = await this.store?.loadLatestPipeline()
    if (latest?.payload) {
      this.engine.restore(latest.payload as any)
      const payload = latest.payload as { initialInput?: unknown; currentOutput?: unknown }
      this.inputReady = Boolean(payload.initialInput || payload.currentOutput)
    }
  }

  async start() {
    this.logger.log('Pipeline start requested')
    const input = await this.loadInput()
    this.engine.seed(input)
    this.inputReady = true
    const result = await this.engine.start(input); await this.persist(); return result
  }

  async pause() {
    this.logger.log('Pipeline pause requested')
    const result = await this.engine.pause(); await this.persist(); return result
  }

  async resume() {
    this.logger.log('Pipeline resume requested')
    const result = await this.engine.resume(); await this.persist(); return result
  }

  async next() {
    this.logger.log('Pipeline next stage requested')
    await this.ensureInput()
    const result = await this.engine.nextStage(); await this.persist(); return result
  }

  async previous() {
    this.logger.log('Pipeline previous stage requested')
    const result = await this.engine.previousStage(); await this.persist(); return result
  }

  async replay() {
    this.logger.log('Pipeline replay requested')
    const result = await this.engine.replay(); await this.persist(); return result
  }

  async reset() {
    this.logger.log('Pipeline reset requested')
    this.engine.reset()
    this.inputReady = false
    await this.persist()
  }

  getState() {
    return this.engine.getState()
  }

  getSnapshots() {
    return this.engine.getSnapshots()
  }

  getInputStatus() {
    const neo4jEnabled = Boolean(this.graph?.isPersistenceEnabled())
    return {
      ready: neo4jEnabled,
      source: neo4jEnabled ? 'neo4j' : 'unavailable',
      productionSafe: neo4jEnabled,
      message: neo4jEnabled ? 'Pipeline runs use the authoritative Neo4j graph.' : 'Neo4j must be enabled before pipeline runs can start.',
    }
  }

  private async persist() {
    const state = this.engine.getState()
    this.store?.savePipeline({ id: state.id, status: state.status, payload: this.engine.persistenceState() as unknown as Record<string, unknown>, startedAt: state.startedAt ? new Date(state.startedAt) : null, completedAt: state.completedAt ? new Date(state.completedAt) : null })
    await this.store?.flush()
  }

  private async loadInput(): Promise<StageInput> {
    if (!this.graph?.isPersistenceEnabled()) {
      throw new ServiceUnavailableException('Neo4j is disabled. Enable Neo4j before running the pipeline.')
    }
    const [nodes, relationships] = await Promise.all([this.graph.exportNodes(), this.graph.exportRelationships()])
    if (nodes.truncated || relationships.truncated) throw new PayloadTooLargeException('The graph exceeds the 50,000-record pipeline snapshot limit. Narrow or archive the graph before running the pipeline.')
    const input = {
      nodes: nodes.items as unknown as Record<string, unknown>[],
      relationships: relationships.items.map((item) => item.relationship) as unknown as Record<string, unknown>[],
      metadata: { source: 'neo4j', nodeCount: nodes.items.length, relationshipCount: relationships.items.length, nodesTruncated: nodes.truncated, relationshipsTruncated: relationships.truncated },
    }
    this.logger.log(`Loaded pipeline snapshot from Neo4j with ${input.nodes.length} nodes and ${input.relationships.length} relationships`)
    return input
  }

  private async ensureInput() {
    if (this.inputReady) return
    this.engine.seed(await this.loadInput())
    this.inputReady = true
  }
}
