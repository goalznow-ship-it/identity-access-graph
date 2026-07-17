import { Inject } from '@nestjs/common'
import type { Connector } from '../connector.types'
import { LDAP_CLIENT_FACTORY, type LdapClientFactory, andFilter, changedSinceFilter } from '../ldap'
import { ALL_FREEIPA_ATTRIBUTES } from './freeipa.attributes'
import { FREEIPA_FILTERS } from './freeipa.filters'
import { normalizeFreeipaEntry } from './freeipa.mapper'

export class FreeipaConnector {
  constructor(@Inject(LDAP_CLIENT_FACTORY) private factory: LdapClientFactory) {}

  async extract(connector: Connector, limit: number, watermark?: string, signal?: AbortSignal) {
    const config = {
      url: connector.configuration.freeipaUrl ?? '',
      baseDn: connector.configuration.freeipaBaseDn ?? '',
      bindDn: connector.configuration.freeipaBindDn ?? '',
      bindPassword: connector.configuration.freeipaBindPassword ?? '',
      tls: connector.configuration.freeipaTls,
      tlsRejectUnauthorized: connector.configuration.freeipaTlsRejectUnauthorized,
      connectTimeoutMs: connector.configuration.freeipaConnectTimeoutMs,
      operationTimeoutMs: connector.configuration.freeipaOperationTimeoutMs,
      pageSize: connector.configuration.freeipaPageSize ?? 500,
      authenticationMode: connector.configuration.authenticationMode,
    }
    const client = this.factory(config)
    const entries: any[] = []
    const pageCounts: Record<string, number> = {}

    try {
      await client.bind(config.bindDn, config.bindPassword)

      for (const [type, baseFilter] of Object.entries(FREEIPA_FILTERS)) {
        if (entries.length >= limit) break
        const filter = watermark ? andFilter(baseFilter, changedSinceFilter(watermark)) : baseFilter
        const pages = await client.pagedSearch({
          baseDn: connector.configuration.freeipaBaseDn ?? '',
          filter,
          attributes: [...ALL_FREEIPA_ATTRIBUTES, 'objectClass'],
          pageSize: config.pageSize,
          sizeLimit: limit - entries.length,
          signal,
          operationTimeoutMs: config.operationTimeoutMs,
        })
        pageCounts[type] = pages.length
        entries.push(...pages.flatMap(page => page.entries).slice(0, limit - entries.length))
      }

      const namingContexts = await client.discoverNamingContexts()
      const objects = entries.map(normalizeFreeipaEntry)

      return { objects: objects.slice(0, limit), pageCounts, namingContexts }
    } finally {
      await client.unbind()
    }
  }
}
