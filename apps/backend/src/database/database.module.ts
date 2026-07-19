import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DATABASE_ENTITIES } from './entities'
import { InitialOperationalPersistence1721380800000 } from './migrations/1721380800000-InitialOperationalPersistence'
import { EnterpriseImportEngine1721467200000 } from './migrations/1721467200000-EnterpriseImportEngine'
import { DatabaseHealthService } from './database-health.service'
import { OperationalStoreService } from './operational-store.service'

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('database.url')
        if (!url) throw new Error('DATABASE_URL is required. Set it to a PostgreSQL connection URL before starting the backend.')
        return {
          type: 'postgres' as const,
          url,
          entities: DATABASE_ENTITIES,
          migrations: [InitialOperationalPersistence1721380800000, EnterpriseImportEngine1721467200000],
          migrationsRun: true,
          synchronize: false,
          connectTimeoutMS: config.get<number>('database.connectTimeoutMs') ?? 5000,
          extra: { max: config.get<number>('database.poolSize') ?? 10 },
          retryAttempts: 1,
        }
      },
    }),
    TypeOrmModule.forFeature(DATABASE_ENTITIES),
  ],
  providers: [DatabaseHealthService, OperationalStoreService],
  exports: [TypeOrmModule, DatabaseHealthService, OperationalStoreService],
})
export class DatabaseModule {}
