import { Client } from 'ssh2'
import { createHash } from 'node:crypto'
import type { ConnectorConfiguration } from '../connector.types'

export const ALLOWED_COMMANDS = new Set([
  'cat /etc/passwd', 'cat /etc/group', 'cat /etc/sudoers',
  'cat /etc/os-release', 'cat /etc/machine-id', 'cat /etc/timezone',
  'cat /etc/hostname', 'cat /etc/hosts', 'cat /etc/ssh/sshd_config',
  'getent passwd', 'getent group',
  'hostname', 'hostname -f', 'hostname -f 2>/dev/null',
  'uname -r', 'uname -m',
  'uptime -p', 'uptime -s',
  'id', 'ip addr show', 'ip -4 addr show',
  'lastlog -b 365 --time-format iso 2>/dev/null || true',
  'timedatectl show --property=Timezone 2>/dev/null || echo Timezone=UTC',
])

const MAX_OUTPUT_SIZE = 1024 * 512
const DEFAULT_TIMEOUT_MS = 30000

export interface CommandResult {
  command: string
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

export class LibSshRunner {
  private client: Client | null = null
  private connected = false

  async connect(config: ConnectorConfiguration): Promise<void> {
    if (this.connected) return
    const connectOpts: any = {
      host: config.sshHost,
      port: config.sshPort ?? 22,
      username: config.sshUsername,
      readyTimeout: config.sshConnectTimeoutMs ?? 10000,
      keepaliveInterval: 0,
    }
    if (config.authenticationMode === 'SSH_PASSWORD') {
      connectOpts.password = config.sshPassword
    } else {
      connectOpts.privateKey = config.sshPrivateKey
      if (config.sshPrivateKeyPassphrase) connectOpts.passphrase = config.sshPrivateKeyPassphrase
    }
    if (config.sshHostKeyFingerprint) {
      connectOpts.hostHash = 'sha256'
      connectOpts.hostVerifier = (key: Buffer) => {
        const fp = createHash('sha256').update(key).digest('base64')
        return fp === config.sshHostKeyFingerprint
      }
    } else if (config.sshStrictHostKeyChecking === false) {
      connectOpts.strictVendor = false
    }

    this.client = new Client()
    await new Promise<void>((resolve, reject) => {
      this.client!.on('ready', () => {
        this.connected = true
        resolve()
      }).on('error', reject).connect(connectOpts)
    })
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        this.client.end()
      } catch { /* ignore */ }
    }
    this.client = null
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async exec(command: string, timeout?: number): Promise<CommandResult> {
    if (!ALLOWED_COMMANDS.has(command)) {
      throw new Error(`Command not allowed: ${command}`)
    }
    if (!this.client || !this.connected) {
      throw new Error('SSH client not connected')
    }

    const start = Date.now()
    const cmdTimeout = timeout ?? DEFAULT_TIMEOUT_MS

    return new Promise<CommandResult>((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      let timedOut = false

      const timer = setTimeout(() => {
        timedOut = true
        reject(new Error(`SSH command timed out after ${cmdTimeout}ms: ${command}`))
      }, cmdTimeout)

      this.client!.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); reject(err); return }
        stream.on('data', (data: Buffer) => {
          if (stdout.length < MAX_OUTPUT_SIZE) {
            stdout += data.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          }
        }).stderr.on('data', (data: Buffer) => {
          if (stderr.length < MAX_OUTPUT_SIZE) {
            stderr += data.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          }
        }).on('close', (exitCode: number) => {
          clearTimeout(timer)
          if (!timedOut) {
            resolve({
              command,
              stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
              stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
              exitCode: exitCode ?? 0,
              durationMs: Date.now() - start,
            })
          }
        })
      })
    })
  }

  async collectSystemInfo(config: ConnectorConfiguration): Promise<Record<string, CommandResult>> {
    await this.connect(config)
    try {
      const results: Record<string, CommandResult> = {}
      const commands = [
        ['passwd', 'cat /etc/passwd'],
        ['group', 'cat /etc/group'],
        ['sudoers', 'cat /etc/sudoers'],
        ['hostname', 'hostname'],
        ['hostnameFqdn', 'hostname -f 2>/dev/null'],
        ['osRelease', 'cat /etc/os-release'],
        ['kernel', 'uname -r'],
        ['arch', 'uname -m'],
        ['uptime', 'uptime -p'],
        ['machineId', 'cat /etc/machine-id'],
        ['timezone', 'timedatectl show --property=Timezone 2>/dev/null || echo Timezone=UTC'],
        ['hosts', 'cat /etc/hosts'],
        ['ipAddr', 'ip -4 addr show 2>/dev/null || true'],
        ['id', 'id'],
      ] as [string, string][]
      for (const [key, cmd] of commands) {
        results[key] = await this.exec(cmd, config.sshCommandTimeoutMs)
      }
      return results
    } finally {
      await this.disconnect()
    }
  }
}
