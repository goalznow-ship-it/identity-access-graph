import { Module } from '@nestjs/common'
import { PipelineController } from './pipeline.controller'
import { PipelineService } from './pipeline.service'
import { GraphModule } from '../graph'

@Module({
  imports: [GraphModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
