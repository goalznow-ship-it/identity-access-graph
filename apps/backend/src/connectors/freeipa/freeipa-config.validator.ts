import { BadRequestException } from '@nestjs/common'
import { AuthenticationMode, type ConnectorConfiguration } from '../connector.types'

export function validateFreeipaConfiguration(configuration: ConnectorConfiguration, nodeEnv = process.env.NODE_ENV ?? 'development'): ConnectorConfiguration {
  let url: URL
  try {
    url = new URL(configuration.freeipaUrl ?? '')
  } catch {
    throw new BadRequestException('FreeIPA URL is invalid')
  }
  if (!['ldap:', 'ldaps:'].includes(url.protocol)) throw new BadRequestException('FreeIPA URL must use ldap:// or ldaps://')
  if (nodeEnv === 'production' && url.protocol === 'ldap:' && !configuration.allowPlaintextInProduction) throw new BadRequestException('Plaintext LDAP is disabled in production for FreeIPA')
  if (!configuration.freeipaBaseDn?.trim()) throw new BadRequestException('FreeIPA base DN is required')
  const positive = (value: number | undefined, name: string) => {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) throw new BadRequestException(`${name} must be positive`)
  }
  positive(configuration.freeipaConnectTimeoutMs, 'FreeIPA connect timeout')
  positive(configuration.freeipaOperationTimeoutMs, 'FreeIPA operation timeout')
  positive(configuration.freeipaPageSize, 'FreeIPA page size')
  return {
    ...configuration,
    freeipaUrl: url.toString(),
    freeipaTls: url.protocol === 'ldaps:' || configuration.freeipaTls === true,
    freeipaConnectTimeoutMs: configuration.freeipaConnectTimeoutMs ?? 5000,
    freeipaOperationTimeoutMs: configuration.freeipaOperationTimeoutMs ?? 15000,
    freeipaPageSize: Math.min(1000, configuration.freeipaPageSize ?? 500),
    freeipaTlsRejectUnauthorized: configuration.freeipaTlsRejectUnauthorized !== false,
    authenticationMode: AuthenticationMode.SIMPLE_BIND,
  }
}
