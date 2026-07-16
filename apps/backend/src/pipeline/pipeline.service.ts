import { Injectable, Logger } from '@nestjs/common'
import { PipelineEngine, type StageInput } from './pipeline-engine'
import { allNodesFlat, relationships } from '../../../../packages/mock-data/src'

function buildDefaultInput(): StageInput {
  return {
    nodes: allNodesFlat as unknown as Record<string, unknown>[],
    relationships: relationships as unknown as Record<string, unknown>[],
    metadata: { source: 'mock-data', nodeCount: allNodesFlat.length, relationshipCount: relationships.length },
  }
}

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name)
  private readonly engine: PipelineEngine
  private readonly defaultInput: StageInput

  constructor() {
    this.engine = new PipelineEngine({ idleDelayMs: 50 })
    this.defaultInput = buildDefaultInput()
    this.engine.seed(this.defaultInput)
    this.logger.log(`PipelineEngine initialized with ${this.defaultInput.nodes.length} nodes and ${this.defaultInput.relationships.length} relationships`)
  }

  async start() {
    this.logger.log('Pipeline start requested')
    return this.engine.start(this.defaultInput)
  }

  async pause() {
    this.logger.log('Pipeline pause requested')
    return this.engine.pause()
  }

  async resume() {
    this.logger.log('Pipeline resume requested')
    return this.engine.resume()
  }

  async next() {
    this.logger.log('Pipeline next stage requested')
    return this.engine.nextStage()
  }

  async previous() {
    this.logger.log('Pipeline previous stage requested')
    return this.engine.previousStage()
  }

  async replay() {
    this.logger.log('Pipeline replay requested')
    return this.engine.replay()
  }

  reset() {
    this.logger.log('Pipeline reset requested')
    this.engine.reset()
    this.engine.seed(this.defaultInput)
  }

  getState() {
    return this.engine.getState()
  }

  getSnapshots() {
    return this.engine.getSnapshots()
  }
}
