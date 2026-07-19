import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { PipelineEngine, type StageInput } from './pipeline-engine'
import { allNodesFlat, relationships } from '../../../../packages/mock-data/src'
import { OperationalStoreService } from '../database/operational-store.service'
import { GraphService } from '../graph'

function buildDefaultInput(): StageInput {
  return {
    nodes: allNodesFlat as unknown as Record<string, unknown>[],
    relationships: relationships as unknown as Record<string, unknown>[],
    metadata: { source: 'mock-data', nodeCount: allNodesFlat.length, relationshipCount: relationships.length },
  }
}

@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name)
  private readonly engine: PipelineEngine
  private readonly defaultInput: StageInput

  constructor(@Optional() private readonly store?: OperationalStoreService, @Optional() private readonly graph?: GraphService) {
    this.engine = new PipelineEngine({ idleDelayMs: 50 })
    this.defaultInput = buildDefaultInput()
    this.engine.seed(this.defaultInput)
    this.logger.log(`PipelineEngine initialized with ${this.defaultInput.nodes.length} nodes and ${this.defaultInput.relationships.length} relationships`)
  }

  async onModuleInit() {
    const latest = await this.store?.loadLatestPipeline()
    if (latest?.payload) this.engine.restore(latest.payload as any)
  }

  async start() {
    this.logger.log('Pipeline start requested')
    const input = await this.loadInput()
    this.engine.seed(input)
    const result = await this.engine.start(input); this.persist(); return result
  }

  async pause() {
    this.logger.log('Pipeline pause requested')
    const result = await this.engine.pause(); this.persist(); return result
  }

  async resume() {
    this.logger.log('Pipeline resume requested')
    const result = await this.engine.resume(); this.persist(); return result
  }

  async next() {
    this.logger.log('Pipeline next stage requested')
    const result = await this.engine.nextStage(); this.persist(); return result
  }

  async previous() {
    this.logger.log('Pipeline previous stage requested')
    const result = await this.engine.previousStage(); this.persist(); return result
  }

  async replay() {
    this.logger.log('Pipeline replay requested')
    const result = await this.engine.replay(); this.persist(); return result
  }

  reset() {
    this.logger.log('Pipeline reset requested')
    this.engine.reset()
    this.engine.seed(this.defaultInput)
    this.persist()
  }

  getState() {
    return this.engine.getState()
  }

  getSnapshots() {
    return this.engine.getSnapshots()
  }

  private persist() {
    const state = this.engine.getState()
    this.store?.savePipeline({ id: state.id, status: state.status, payload: this.engine.persistenceState() as unknown as Record<string, unknown>, startedAt: state.startedAt ? new Date(state.startedAt) : null, completedAt: state.completedAt ? new Date(state.completedAt) : null })
  }

  private async loadInput(): Promise<StageInput> {
    if (!this.graph?.isPersistenceEnabled()) return this.defaultInput
    const [nodes, relationships] = await Promise.all([this.graph.exportNodes(), this.graph.exportRelationships()])
    const input = {
      nodes: nodes.items as unknown as Record<string, unknown>[],
      relationships: relationships.items.map((item) => item.relationship) as unknown as Record<string, unknown>[],
      metadata: { source: 'neo4j', nodeCount: nodes.items.length, relationshipCount: relationships.items.length, nodesTruncated: nodes.truncated, relationshipsTruncated: relationships.truncated },
    }
    this.logger.log(`Loaded pipeline snapshot from Neo4j with ${input.nodes.length} nodes and ${input.relationships.length} relationships`)
    return input
  }
}
