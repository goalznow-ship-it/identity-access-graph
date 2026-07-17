# FreeIPA Connector

## Prerequisites

- FreeIPA server with LDAPS (port 636) enabled
- A Directory Manager or delegated bind account with read access
- Network connectivity from the IAG backend to the FreeIPA server

## Least-Privilege Guidance

Create a dedicated bind account with read-only access:

```
ipa user-add --first=IAG --last=Connector --password iag-reader
ipa role-add --name="IAG Reader" --desc="Read-only access for IAG"
ipa role-add-privilege "IAG Reader" --privileges="Read privileges"
ipa role-add-member "IAG Reader" --users=iag-reader
```

Required read permissions:
- Read access to entries under cn=users,cn=accounts,cn=...
- Read access to cn=groups,cn=accounts
- Read access to cn=computers,cn=accounts
- Read access to cn=sudorules,cn=sudo
- Read access to cn=hbac,cn=hbac
- Read access to cn=roles,cn=accounts
- Read access to cn=permissions,cn=accounts
- Read access to cn=netgroups,cn=accounts

## Ports

| Protocol | Port | Encryption |
|----------|------|------------|
| LDAP | 389 | StartTLS recommended |
| LDAPS | 636 | TLS mandatory |

## TLS and Certificate Verification

- TLS is enabled by default when using `ldaps://`
- Set `freeipaTlsRejectUnauthorized: false` only for testing with self-signed certificates
- In production, always validate certificates

## Supported Objects

| Object Type | LDAP Object Class | Graph Node Type |
|-------------|------------------|-----------------|
| User | posixAccount, ipaUser | USER |
| Group | posixGroup, ipaUserGroup | GROUP |
| Host | ipaHost | HOST |
| Host Group | ipaHostGroup | GROUP |
| Role | ipaRole | ROLE |
| Permission | ipaPermission | PERMISSION |
| Privilege | ipaPrivilege | ROLE |
| Sudo Rule | ipaSudoRule | SUDO_POLICY |
| HBAC Rule | ipaHBACRule | PERMISSION |
| Service | ipaService | SERVICE_ACCOUNT |
| Netgroup | ipaNetgroup | GROUP |

### Core User Attributes Extracted

uid, cn, displayName, givenName, sn, mail, employeeNumber, title, manager, memberOf, ipaUniqueID, uidNumber, gidNumber, homeDirectory, loginShell, krbPrincipalName, nsAccountLock, sshPublicKey, createTimestamp, modifyTimestamp

### Core Group Attributes Extracted

cn, description, ipaUniqueID, gidNumber, member, memberOf, memberUser, memberGroup, createTimestamp, modifyTimestamp

### Core Host Attributes Extracted

fqdn, cn, description, ipaUniqueID, memberOf, managedBy, krbPrincipalName, sshPublicKey, location, platform, operatingSystem, createTimestamp, modifyTimestamp

## Preview and Sync Flow

1. **Test Connection**: Binds to LDAP with provided credentials, verifies connectivity
2. **Preview**: Extracts up to 500 objects, counts by type, maps to graph nodes/relationships (no persistence)
3. **Full Sync**: Extracts up to 100,000 objects, correlates with other sources, converts to graph, optionally persists to Neo4j
4. **Incremental**: Uses modifyTimestamp as watermark for incremental extraction

## Correlating FreeIPA Users

FreeIPA users correlate with other source systems using:
1. employeeNumber ↔ employeeId (HIGH confidence)
2. mail ↔ email (HIGH confidence)
3. uid ↔ username/sAMAccountName (MEDIUM confidence)
4. krbPrincipalName ↔ userPrincipalName (MEDIUM confidence)

Strong identifier conflicts (different ipaUniqueID for same employeeNumber) create manual-review items.

## Known Limitations

- Deletion detection is not supported
- Real-time monitoring is not supported
- Password policy and kerberos policy objects are not extracted
- ID ranges (ipaIDRange) are not extracted
- DNA ranges are not extracted
- Automembership rules are not extracted
- Certificates (ipaCertificate) are not extracted
- SELinux user mappings are not extracted

## Security Considerations

- FreeIPA bind password is never returned through the API (masked as `********`)
- Secrets are never logged
- The connector is disabled by default; enable only after configuration
- Plaintext LDAP is rejected in production unless `allowPlaintextInProduction: true`
- Concurrent syncs are prevented

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Connection refused | Wrong host/port or firewall | Verify network connectivity to port 636 |
| Bind failed | Wrong credentials or bind DN | Verify bind DN and password |
| TLS error | Self-signed certificate | Set `freeipaTlsRejectUnauthorized: false` for testing |
| No objects found | Wrong base DN or permissions | Verify base DN and read permissions |
| Timeout | Large directory or network latency | Increase `freeipaOperationTimeoutMs` |
