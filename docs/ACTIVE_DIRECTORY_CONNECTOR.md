# Active Directory / LDAP connector

## Prerequisites and security

Use a dedicated, non-interactive, least-privilege directory account with read access only to the required naming contexts and attributes. Do not grant Domain Admin, replication, password-reset, or directory-write privileges. Store credentials through environment or connector configuration; passwords are write-only through the API and are never returned.

Prefer LDAPS (`636/tcp`). Plain LDAP commonly uses `389/tcp` and is rejected in production unless explicitly allowed. Ensure the backend trusts the issuing CA; keep certificate verification enabled. Network access should be restricted to the required domain controllers.

## Environment variables

```env
LDAP_URL=ldaps://dc.example.com:636
LDAP_BASE_DN=DC=example,DC=com
LDAP_BIND_DN=CN=identity-reader,OU=Service Accounts,DC=example,DC=com
LDAP_BIND_PASSWORD=
LDAP_TLS=true
LDAP_TLS_REJECT_UNAUTHORIZED=true
LDAP_CONNECT_TIMEOUT_MS=5000
LDAP_OPERATION_TIMEOUT_MS=15000
LDAP_PAGE_SIZE=500
```

Environment values are safe defaults for connector creation; live synchronization remains disabled until a connector is explicitly enabled.

## Create and validate a connector

Open `/connectors`, create an Active Directory or generic LDAP connector, enter an LDAPS URL, base DN, bind DN, and password, then save it. Test the connection before enabling synchronization. The test performs a simple bind, Root DSE lookup, naming-context discovery, and always closes the connection.

## Preview and full synchronization

Preview mode is the default, is limited to 100 objects, does not persist graph data, and does not run risk scanning. Full synchronization must be explicitly requested on an enabled connector. Conversion, Neo4j persistence, and risk scanning are independent opt-in options.

Incremental mode uses the previous `whenChanged` watermark and records the highest observed `uSNChanged` checkpoint. Deletion detection is not supported because DirSync is not implemented.

## Read permissions and extracted data

The account needs read access for users, groups, computers/domain controllers, organizational units, managed and regular service accounts, GPO references, trusts, sites, subnets, domains, and configuration naming contexts. Sensitive password material is never requested.

## Known limitations

- Simple bind is the only functional authentication mode; NTLM and Kerberos are typed placeholders.
- Transitive group membership is not expanded during extraction.
- DirSync, tombstones, and authoritative deletion detection are not implemented.
- Entra ID, FreeIPA, and Linux connectors are outside this phase.
- Certificate enrollment and trust-store management remain deployment responsibilities.

## Troubleshooting

- Connection refused: verify ports, firewall rules, DNS, and domain-controller availability.
- Invalid credentials: verify the bind DN format and rotate the stored password.
- TLS failures: verify hostname, certificate chain, expiry, and backend trust store; do not disable validation except for controlled diagnostics.
- Empty preview: verify the base DN, read permissions, and naming contexts returned by Root DSE.
- Timeouts: reduce page size or increase connection/operation timeouts within operational limits.
