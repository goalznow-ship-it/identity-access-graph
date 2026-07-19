import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { DATABASE_ENTITIES } from './entities'
import { InitialOperationalPersistence1721380800000 } from './migrations/1721380800000-InitialOperationalPersistence'
import { EnterpriseImportEngine1721467200000 } from './migrations/1721467200000-EnterpriseImportEngine'
import { EnterpriseGraphEngine1721553600000 } from './migrations/1721553600000-EnterpriseGraphEngine'
import { EnterpriseRiskEngine1721640000000 } from './migrations/1721640000000-EnterpriseRiskEngine'
import { EnterpriseAttackPathEngine1721726400000 } from './migrations/1721726400000-EnterpriseAttackPathEngine'
import { EnterpriseNotifications1721812800000 } from './migrations/1721812800000-EnterpriseNotifications'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required to run database migrations.')

export default new DataSource({
  type: 'postgres',
  url,
  entities: DATABASE_ENTITIES,
  migrations: [InitialOperationalPersistence1721380800000, EnterpriseImportEngine1721467200000, EnterpriseGraphEngine1721553600000, EnterpriseRiskEngine1721640000000, EnterpriseAttackPathEngine1721726400000, EnterpriseNotifications1721812800000],
  synchronize: false,
})
