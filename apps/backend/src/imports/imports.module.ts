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

@Module({
  imports: [GraphModule, RiskModule],
  controllers: [ImportsController],
  providers: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService, ImportGraphPersistenceService],
  exports: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService, ImportGraphPersistenceService],
})
export class ImportsModule {}
