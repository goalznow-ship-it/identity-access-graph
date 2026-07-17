import { BadRequestException } from '@nestjs/common'
import { AuthenticationMode, type ConnectorConfiguration } from '../connector.types'

export function validateLinuxSshConfiguration(configuration: ConnectorConfiguration, nodeEnv = process.env.NODE_ENV ?? 'development'): ConnectorConfiguration {
  if (!configuration.sshHost?.trim()) throw new BadRequestException('SSH host is required')
  if (!configuration.sshUsername?.trim()) throw new BadRequestException('SSH username is required')
  const authMode = configuration.authenticationMode
  if (authMode === AuthenticationMode.SSH_PRIVATE_KEY && !configuration.sshPrivateKey?.trim()) {
    throw new BadRequestException('SSH private key is required when using SSH_PRIVATE_KEY authentication')
  }
  if (authMode === AuthenticationMode.SSH_PASSWORD && !configuration.sshPassword?.trim()) {
    throw new BadRequestException('SSH password is required when using SSH_PASSWORD authentication')
  }
  if (authMode !== AuthenticationMode.SSH_PASSWORD && authMode !== AuthenticationMode.SSH_PRIVATE_KEY) {
    throw new BadRequestException('Authentication mode must be SSH_PASSWORD or SSH_PRIVATE_KEY')
  }
  const port = configuration.sshPort ?? 22
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new BadRequestException('SSH port must be between 1 and 65535')
  const positive = (value: number | undefined, name: string) => {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) throw new BadRequestException(`${name} must be positive`)
  }
  positive(configuration.sshConnectTimeoutMs, 'SSH connect timeout')
  positive(configuration.sshCommandTimeoutMs, 'SSH command timeout')
  return {
    ...configuration,
    sshPort: port,
    sshConnectTimeoutMs: configuration.sshConnectTimeoutMs ?? 10000,
    sshCommandTimeoutMs: configuration.sshCommandTimeoutMs ?? 30000,
    sshStrictHostKeyChecking: configuration.sshStrictHostKeyChecking !== false,
  }
}
