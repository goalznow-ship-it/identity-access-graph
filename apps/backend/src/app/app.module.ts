import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthModule } from '../health/health.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { ImportsModule } from '../imports/imports.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    PipelineModule,
    ImportsModule,
  ],
})
export class AppModule {}
