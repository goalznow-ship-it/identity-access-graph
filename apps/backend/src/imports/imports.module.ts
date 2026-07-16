import { Module } from '@nestjs/common'
import { ImportsController } from './imports.controller'
import { ImportsService } from './imports.service'
import { MappingService } from './mapping/mapping.service'
import { ValidationService } from './validation/validation.service'

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, MappingService, ValidationService],
  exports: [ImportsService, MappingService, ValidationService],
})
export class ImportsModule {}
