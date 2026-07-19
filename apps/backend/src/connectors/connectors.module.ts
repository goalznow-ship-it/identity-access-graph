import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphModule } from '../graph'
import { ImportsModule } from '../imports/imports.module'
import { RiskModule } from '../risk'
import { ConnectorEntity, ConnectorSyncRunEntity } from '../database/entities'
import { ActiveDirectoryConnector, ActiveDirectorySyncService } from './active-directory'
import { FreeipaConnector, FreeipaSyncService } from './freeipa'
import { LinuxSshConnector, LinuxSshSyncService } from './linux'
import { EntraIdConnector, EntraIdSyncService } from './entra-id'
import { ConnectorRepository } from './connector.repository'
import { ConnectorsController } from './connectors.controller'
import { ConnectorsService } from './connectors.service'
import { LDAP_CLIENT_FACTORY, LdapClientService } from './ldap'

@Module({
  imports: [TypeOrmModule.forFeature([ConnectorEntity, ConnectorSyncRunEntity]), GraphModule, ImportsModule, RiskModule],
  controllers: [ConnectorsController],
  providers: [ConnectorRepository, ConnectorsService, ActiveDirectoryConnector, ActiveDirectorySyncService, FreeipaConnector, FreeipaSyncService, LinuxSshConnector, LinuxSshSyncService, EntraIdConnector, EntraIdSyncService, { provide: LDAP_CLIENT_FACTORY, useValue: (configuration: any) => new LdapClientService(configuration) }],
  exports: [ConnectorsService, ConnectorRepository, LDAP_CLIENT_FACTORY],
})
export class ConnectorsModule {}
