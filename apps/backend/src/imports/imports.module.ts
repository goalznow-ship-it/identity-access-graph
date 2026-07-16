import { Module } from '@nestjs/common'
import { ImportsController } from './imports.controller'
import { ImportsService } from './imports.service'
import { MappingService } from './mapping/mapping.service'
import { ValidationService } from './validation/validation.service'
import { IdentityCorrelationService } from './correlation'
import { GraphConversionService } from './graph-conversion'

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService],
  exports: [ImportsService, MappingService, ValidationService, IdentityCorrelationService, GraphConversionService],
})
export class ImportsModule {}
