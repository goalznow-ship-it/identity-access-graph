import type { Connector } from '../connector.types'
import type { CommandResult } from './linux-command-runner'
import { LibSshRunner } from './linux-command-runner'
import { parsePasswd, parseGroup, parseSudoers, parseAuthorizedKeys, parseHostIdentity } from './linux-command-parser'
import type { AuthorizedKeyEntry, GroupEntry, HostIdentity, PasswdEntry, SudoRule } from './linux-ssh.types'

export interface LinuxExtractResult {
  passwd: PasswdEntry[]
  groups: GroupEntry[]
  sudoRules: SudoRule[]
  authorizedKeys: AuthorizedKeyEntry[]
  hostIdentity: HostIdentity
  commandResults: Record<string, string>
  warnings: string[]
}

export class LinuxSshConnector {
  async extract(connector: Connector, limit?: number): Promise<LinuxExtractResult> {
    const runner = new LibSshRunner()
    const warnings: string[] = []

    try {
      await runner.connect(connector.configuration)
      const cmdResults: Record<string, CommandResult> = {}
      const commands: [string, string][] = [
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
        ['ipAddr', 'ip -4 addr show 2>/dev/null || true'],
        ['id', 'id'],
      ]

      for (const [key, cmd] of commands) {
        try {
          cmdResults[key] = await runner.exec(cmd, connector.configuration.sshCommandTimeoutMs)
        } catch (err) {
          warnings.push(`Command failed: ${cmd} - ${(err as Error).message}`)
        }
      }

      const passwdContent = cmdResults.passwd?.stdout ?? ''
      const groupContent = cmdResults.group?.stdout ?? ''
      const sudoersContent = cmdResults.sudoers?.stdout ?? ''

      const passwd = limit === undefined ? parsePasswd(passwdContent) : parsePasswd(passwdContent).slice(0, limit)
      const groups = limit === undefined ? parseGroup(groupContent) : parseGroup(groupContent).slice(0, limit)
      const sudoRules = limit === undefined ? parseSudoers(sudoersContent) : parseSudoers(sudoersContent).slice(0, limit)

      const textResults: Record<string, string> = {}
      for (const [key, result] of Object.entries(cmdResults)) {
        textResults[key] = result?.stdout ?? ''
      }

      const hostIdentity = parseHostIdentity(textResults)

      let authorizedKeys: AuthorizedKeyEntry[] = []
      try {
        const authKeysResult = await runner.exec(`for u in $(getent passwd | awk -F: '$3>=1000{print $1}'); do echo "=== \$u ==="; cat /home/\$u/.ssh/authorized_keys 2>/dev/null || true; done`, connector.configuration.sshCommandTimeoutMs)
        const sections = (authKeysResult.stdout || '').split(/=== (\S+) ===\n?/).filter(Boolean)
        for (let i = 0; i < sections.length - 1; i += 2) {
          const username = sections[i].trim()
          const keyContent = sections[i + 1].trim()
          if (username && keyContent) {
            authorizedKeys.push(...parseAuthorizedKeys(keyContent, username, `/home/${username}/.ssh/authorized_keys`))
          }
        }
      } catch (err) {
        warnings.push(`Failed to read authorized_keys: ${(err as Error).message}`)
      }

      return { passwd, groups, sudoRules, authorizedKeys, hostIdentity, commandResults: textResults, warnings }
    } finally {
      await runner.disconnect()
    }
  }
}
