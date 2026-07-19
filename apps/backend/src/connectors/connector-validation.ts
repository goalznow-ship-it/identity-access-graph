import { BadRequestException } from '@nestjs/common'
import { ConnectorType, SyncMode, type Connector, type ConnectorConfiguration, type SyncOptions } from './connector.types'

const plainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function rejectUnknown(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length) throw new BadRequestException(`Unknown ${label} field(s): ${unknown.join(', ')}`)
}

export function validateConnectorCreate(value: unknown) {
  if (!plainObject(value)) throw new BadRequestException('Connector body must be an object')
  rejectUnknown(value, ['name', 'connectorType', 'enabled', 'configuration'], 'connector')
  if (typeof value.name !== 'string') throw new BadRequestException('Connector name is required')
  if (!Object.values(ConnectorType).includes(value.connectorType as ConnectorType)) throw new BadRequestException('Invalid connector type')
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') throw new BadRequestException('enabled must be boolean')
  if (!plainObject(value.configuration)) throw new BadRequestException('Connector configuration must be an object')
  return value as unknown as { name: string; connectorType: ConnectorType; enabled?: boolean; configuration: ConnectorConfiguration }
}

export function validateConnectorUpdate(value: unknown) {
  if (!plainObject(value)) throw new BadRequestException('Connector body must be an object')
  rejectUnknown(value, ['name', 'connectorType', 'enabled', 'configuration'], 'connector')
  if (value.name !== undefined && typeof value.name !== 'string') throw new BadRequestException('name must be a string')
  if (value.connectorType !== undefined && !Object.values(ConnectorType).includes(value.connectorType as ConnectorType)) throw new BadRequestException('Invalid connector type')
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') throw new BadRequestException('enabled must be boolean')
  if (value.configuration !== undefined && !plainObject(value.configuration)) throw new BadRequestException('Connector configuration must be an object')
  return value as Partial<Connector> & { configuration?: Partial<ConnectorConfiguration> }
}

export function validateSyncOptions(value: unknown): SyncOptions {
  if (value === undefined || value === null) return {}
  if (!plainObject(value)) throw new BadRequestException('Sync options must be an object')
  rejectUnknown(value, ['mode', 'previewLimit', 'convert', 'persist', 'runRiskScan'], 'sync option')
  if (value.mode !== undefined && !Object.values(SyncMode).includes(value.mode as SyncMode)) throw new BadRequestException('Invalid sync mode')
  if (value.previewLimit !== undefined && (!Number.isInteger(value.previewLimit) || Number(value.previewLimit) < 1 || Number(value.previewLimit) > 500)) throw new BadRequestException('previewLimit must be an integer between 1 and 500')
  for (const key of ['convert', 'persist', 'runRiskScan'] as const) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new BadRequestException(`${key} must be boolean`)
  return value as SyncOptions
}
