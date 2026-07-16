import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthModule } from '../health/health.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { ImportsModule } from '../imports/imports.module'
import envConfig from '../config/env.config'
import { Neo4jModule } from '../neo4j'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    Neo4jModule,
    HealthModule,
    PipelineModule,
    ImportsModule,
  ],
})
export class AppModule {}
