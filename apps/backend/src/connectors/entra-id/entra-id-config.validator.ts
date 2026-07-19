import { BadRequestException } from '@nestjs/common'
import { AuthenticationMode, type ConnectorConfiguration } from '../connector.types'

export function validateEntraIdConfiguration(configuration: ConnectorConfiguration, nodeEnv = process.env.NODE_ENV ?? 'development'): ConnectorConfiguration {
  if (!configuration.entraTenantId?.trim()) throw new BadRequestException('Entra ID tenant ID is required')
  if (!configuration.entraClientId?.trim()) throw new BadRequestException('Entra ID client ID is required')
  const authMode = configuration.authenticationMode
  if (authMode === AuthenticationMode.CLIENT_SECRET && !configuration.entraClientSecret?.trim()) {
    throw new BadRequestException('Client secret is required when using CLIENT_SECRET authentication')
  }
  if (authMode === AuthenticationMode.CERTIFICATE) {
    if (!configuration.entraCertificateThumbprint?.trim()) throw new BadRequestException('Certificate thumbprint is required for certificate authentication')
    if (!configuration.entraCertificatePrivateKey?.trim()) throw new BadRequestException('Certificate private key is required for certificate authentication')
  }
  return {
    ...configuration,
    entraTenantId: configuration.entraTenantId.trim(),
    entraClientId: configuration.entraClientId.trim(),
    entraUseDeviceCode: authMode === AuthenticationMode.DEVICE_CODE,
    entraRedirectUri: configuration.entraRedirectUri ?? 'http://localhost:3000/auth/callback',
  }
}
