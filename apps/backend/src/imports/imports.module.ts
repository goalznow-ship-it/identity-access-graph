import { Module } from '@nestjs/common'
import { ImportsController } from './imports.controller'
import { ImportsService } from './imports.service'
import { MappingService } from './mapping/mapping.service'
import { ValidationService } from './validation/validation.service'
import { IdentityCorrelationService } from './correlation'
import { GraphConversionService } from './graph-conversion'
import { GraphModule } from '../graph'
import { ImportGraphPersistenceService } from './import-graph-persistence.service'
import { RiskModule } from '../risk'
import { ImportQueueService } from './import-queue.service'
import { ImportWorkerService } from './import-worker.service'
import { ImportWorkerController } from './import-worker.controller'
import { ImportChunkService } from './import-chunk.service'

@Module({
  imports: [GraphModule, RiskModule],
  controllers: [ImportsController, ImportWorkerController],
  providers: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService, ImportGraphPersistenceService, ImportQueueService, ImportWorkerService, ImportChunkService],
  exports: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService, ImportGraphPersistenceService],
})
export class ImportsModule {}
