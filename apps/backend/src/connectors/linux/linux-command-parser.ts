import type { AuthorizedKeyEntry, GroupEntry, HostIdentity, PasswdEntry, SudoRule } from './linux-ssh.types'

const DISABLED_SHELLS = new Set(['/sbin/nologin', '/usr/sbin/nologin', '/bin/false', '/usr/bin/false', '/sbin/shutdown', '/sbin/halt', '/sbin/reboot'])
const SYSTEM_UID_MIN = 0
const SYSTEM_UID_MAX = 999
const HUMAN_UID_MIN = 1000

export function parsePasswd(content: string, source = '/etc/passwd'): PasswdEntry[] {
  return content.split('\n')
    .map((line, i) => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map((line, i): PasswdEntry => {
      const parts = line.split(':')
      const uid = parseInt(parts[2], 10) || 0
      const shell = parts[6] || ''
      return {
        username: parts[0],
        uid,
        gid: parseInt(parts[3], 10) || 0,
        gecos: parts[4] || '',
        home: parts[5] || '',
        shell,
        isSystemAccount: uid >= SYSTEM_UID_MIN && uid <= SYSTEM_UID_MAX,
        loginDisabled: DISABLED_SHELLS.has(shell),
        sourceFile: source,
        sourceLine: i + 1,
      }
    })
}

export function parseGroup(content: string, source = '/etc/group'): GroupEntry[] {
  return content.split('\n')
    .map((line, i) => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map((line, i): GroupEntry => {
      const parts = line.split(':')
      return {
        groupName: parts[0],
        gid: parseInt(parts[2], 10) || 0,
        members: parts[3] ? parts[3].split(',').filter(Boolean) : [],
        sourceFile: source,
        sourceLine: i + 1,
      }
    })
}

export function parseSudoers(content: string, source = '/etc/sudoers'): SudoRule[] {
  const rules: SudoRule[] = []
  content.split('\n').forEach((line, i) => {
    line = line.trim()
    if (!line || line.startsWith('#') || line.startsWith('@') || line.startsWith('Defaults')) return
    const match = line.match(/^(\S+)\s+(\S+(?:\s*,\s*\S+)*)\s*=\s*\((.+?)\)\s+(.+)$/)
    if (match) {
      rules.push({
        rule: line,
        users: match[1].split(',').map(s => s.trim()),
        hosts: match[2].split(',').map(s => s.trim()),
        commands: match[4].split(',').map(s => s.trim()),
        sourceFile: source,
        sourceLine: i + 1,
      })
    } else {
      rules.push({
        rule: line,
        hosts: ['ALL'],
        users: ['ALL'],
        commands: ['ALL'],
        sourceFile: source,
        sourceLine: i + 1,
      })
    }
  })
  return rules
}

export function parseAuthorizedKeys(content: string, username: string, sourceFile: string): AuthorizedKeyEntry[] {
  const { createHash } = require('node:crypto')
  return content.split('\n')
    .map((line, i) => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map((line, i): AuthorizedKeyEntry | null => {
      const parts = line.split(/\s+/)
      if (parts.length < 2) return null
      const keyType = parts[0]
      const key = parts[1]
      const comment = parts.slice(2).join(' ') || ''
      const fingerprint = `sha256:${createHash('sha256').update(key).digest('base64')}`
      return { username, keyType, key, fingerprint, comment, sourceFile, sourceLine: i + 1 }
    })
    .filter((e): e is AuthorizedKeyEntry => e !== null)
}

export function parseHostIdentity(info: Record<string, string>): HostIdentity {
  return {
    hostname: info.hostname || '',
    fqdn: info.hostnameFqdn || info.hostname || '',
    os: info.osRelease || '',
    kernel: info.kernel || '',
    architecture: info.arch || '',
    uptime: info.uptime || '',
    ipAddresses: (info.ipAddr || '').match(/\binet\s+(\d+\.\d+\.\d+\.\d+)\b/g)?.map(m => m.replace('inet ', '')) || [],
    machineId: info.machineId || '',
    timezone: (info.timezone || '').replace('Timezone=', ''),
  }
}

export function detectSystemAccount(entry: PasswdEntry): boolean {
  return entry.isSystemAccount
}

export function detectLoginDisabled(entry: PasswdEntry): boolean {
  return entry.loginDisabled
}

export function fingerprintSshKey(key: string): string {
  const { createHash } = require('node:crypto')
  return `sha256:${createHash('sha256').update(key).digest('base64')}`
}
