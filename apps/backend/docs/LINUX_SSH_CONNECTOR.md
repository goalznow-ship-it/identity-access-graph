# Linux SSH Connector

## Prerequisites

- Linux host with SSH server running (OpenSSH)
- SSH user with read access to system files
- Network connectivity from the IAG backend to the target host
- SSH port (22 by default) must be accessible

## Least-Privilege Guidance

Create a dedicated read-only user:

```bash
useradd -r -s /sbin/nologin -M iag-reader
```

Required read permissions:
- `/etc/passwd` (read by default)
- `/etc/group` (read by default)
- `/etc/sudoers` and `/etc/sudoers.d/*` (read by root or sudo group)
- `/home/*/.ssh/authorized_keys` (read by root)
- `/etc/os-release`, `/etc/hostname`, `/etc/machine-id` (world-readable)
- `/etc/ssh/sshd_config` (read by root)
- `hostname`, `uname`, `uptime`, `id`, `ip` commands (world-executable)

For sudoers extraction, the user needs to be able to read `/etc/sudoers`. If this is restricted, sudo rules will be skipped (a warning is emitted).

## Ports

| Service | Port | Protocol |
|---------|------|----------|
| SSH | 22 | TCP |

## SSH Host-Key Verification

- Set `sshHostKeyFingerprint` to the SHA-256 base64-encoded fingerprint of the host key
- Obtain the fingerprint: `ssh-keyscan -t ecdsa-sa-key ABC... | ssh-keygen -lf -`
- If `sshStrictHostKeyChecking` is `false`, fingerprints are not verified (not recommended for production)
- Example fingerprint: `SHA256:ABCdef123GHIjkl456MNOpqr789STUvwxYZ0123456=`

## Data Sources

| Data | Source | Graph Node Type |
|------|--------|-----------------|
| Human user accounts | `/etc/passwd` (uid >= 1000) | LINUX_USER |
| System accounts | `/etc/passwd` (uid < 1000) | Not graphed |
| Groups | `/etc/group` | LINUX_GROUP |
| Sudo rules | `/etc/sudoers` | SUDO_POLICY |
| SSH authorized keys | `~/.ssh/authorized_keys` per user | SSH_KEY |
| Host identity | `hostname`, `hostname -f` | HOST |
| Operating system | `/etc/os-release` | OPERATING_SYSTEM |

## Account Detection

- **Human accounts**: uid >= 1000 (graphed as LINUX_USER)
- **System accounts**: uid < 1000 (not graphed)
- **Login disabled**: shells `/sbin/nologin`, `/bin/false`, `/usr/bin/false`, `/sbin/shutdown`, `/sbin/halt`, `/sbin/reboot`
- Disabled login accounts are marked with `riskLevel: LOW`

## Preview and Sync Flow

1. **Test Connection**: Connects via SSH, runs `id` command to verify
2. **Preview**: Reads system files, parses entries, returns safe summaries (counts only, no raw sudoers or full key content)
3. **Full Sync**: Reads and parses all data sources, builds graph nodes/relationships, optionally persists to Neo4j

## Commands Executed

Only the following read-only commands are allowed (command allowlist enforced):

- `cat /etc/passwd`, `cat /etc/group`, `cat /etc/sudoers`
- `cat /etc/os-release`, `cat /etc/machine-id`, `cat /etc/timezone`
- `cat /etc/hostname`, `cat /etc/hosts`, `cat /etc/ssh/sshd_config`
- `getent passwd`, `getent group`
- `hostname`, `hostname -f`
- `uname -r`, `uname -m`
- `uptime -p`, `uptime -s`
- `id`, `ip addr show`
- `timedatectl show --property=Timezone`

No write commands, no package managers, no process enumeration are executed by default.

## Sudo Rules Parsing

Sudo rules are parsed from `/etc/sudoers`. The parser supports:
- User and group specifications (e.g., `root`, `%wheel`)
- Host restrictions (e.g., `ALL`, specific hostnames)
- Command specifications with NOPASSWD tags
- Run-as specifications (e.g., `(ALL)`, `(admin)`)

Sudo command groups (Cmnd_Alias) and user groups (User_Alias) are currently parsed as inline text only.

## SSH Key Fingerprinting

Public SSH keys from `authorized_keys` files are fingerprinted using SHA-256. The raw key material is not stored in graph properties (marked as `[REDACTED]`).

## Known Limitations

- Deletion detection is not supported (host snapshot hash not yet implemented)
- Real-time monitoring is not supported
- Sudo rules from `/etc/sudoers.d/*` are only read via the top-level include
- Only the primary `/etc/sudoers` file is read; `includedir` directives are not followed
- Package and process metadata collection is disabled by default
- No sudo execution (`sudo -l`) is performed by default
- Only human accounts (uid >= 1000) are graphed as LINUX_USER nodes
- SSH private keys are never read
- Concurrent syncs are prevented

## Security Considerations

- SSH password is never returned through the API (masked as `********`)
- SSH private key is never returned through the API (field is deleted from responses)
- SSH private key passphrase is never returned through the API
- Secrets are never logged
- Only a predefined allowlist of read-only commands can be executed
- Command timeouts prevent stuck connections
- Maximum output size is capped at 512 KB per command
- Line endings are normalized (CRLF -> LF)
- The connector is disabled by default; enable only after configuration
- Concurrent syncs are prevented
- Host-key verification is supported via `sshHostKeyFingerprint`

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Connection refused | Wrong host/port or firewall | Verify SSH port and network connectivity |
| Authentication failed | Wrong password or key | Verify credentials |
| Host key mismatch | Host key changed | Update `sshHostKeyFingerprint` |
| Permission denied | User lacks read access | Use root or a user with appropriate permissions |
| Timeout | Network latency or large files | Increase `sshCommandTimeoutMs` |
| No users found | All accounts are system accounts | Verify uid range (human accounts need uid >= 1000) |
| No sudo rules | No `/etc/sudoers` access | Run as root or verify file permissions |
