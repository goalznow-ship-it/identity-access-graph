import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { DATABASE_ENTITIES } from './entities'
import { InitialOperationalPersistence1721380800000 } from './migrations/1721380800000-InitialOperationalPersistence'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required to run database migrations.')

export default new DataSource({
  type: 'postgres',
  url,
  entities: DATABASE_ENTITIES,
  migrations: [InitialOperationalPersistence1721380800000],
  synchronize: false,
})
