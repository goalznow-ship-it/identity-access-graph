export interface FieldDef {
  field: string
  category: 'identity' | 'group' | 'infrastructure' | 'linux' | 'business' | 'common'
  required: boolean
  aliases: string[]
}

export const TARGET_FIELDS: FieldDef[] = [
  { field: 'id', category: 'common', required: false, aliases: ['id', 'identifier', 'uuid', 'dn', 'distinguishedname'] },
  { field: 'externalId', category: 'common', required: false, aliases: ['externalid', 'sourceid'] },
  { field: 'sourceId', category: 'common', required: false, aliases: ['sourceid', 'originid'] },
  { field: 'displayName', category: 'common', required: false, aliases: ['displayname', 'name', 'cn', 'commonname', 'fullname', 'title'] },
  { field: 'description', category: 'common', required: false, aliases: ['description', 'desc', 'comment', 'notes'] },
  { field: 'sourceSystem', category: 'common', required: false, aliases: ['sourcesystem', 'source', 'system', 'origin'] },
  { field: 'status', category: 'common', required: false, aliases: ['status', 'state', 'accountstatus', 'enabled'] },
  { field: 'riskLevel', category: 'common', required: false, aliases: ['risklevel', 'risk', 'severity'] },
  { field: 'username', category: 'identity', required: false, aliases: ['username', 'login', 'account', 'userid', 'uid'] },
  { field: 'samAccountName', category: 'identity', required: false, aliases: ['samaccountname', 'sam', 'ntaccount'] },
  { field: 'userPrincipalName', category: 'identity', required: false, aliases: ['userprincipalname', 'upn', 'principalname'] },
  { field: 'employeeId', category: 'identity', required: false, aliases: ['employeeid', 'employeenumber', 'empnumber', 'eid'] },
  { field: 'email', category: 'identity', required: false, aliases: ['email', 'mail', 'emailaddress', 'smtp'] },
  { field: 'department', category: 'identity', required: false, aliases: ['department', 'dept', 'departmentnumber', 'division'] },
  { field: 'team', category: 'identity', required: false, aliases: ['team', 'squad', 'crew'] },
  { field: 'manager', category: 'identity', required: false, aliases: ['manager', 'supervisor', 'reports', 'managedby'] },
  { field: 'jobTitle', category: 'identity', required: false, aliases: ['jobtitle', 'title', 'position', 'role'] },
  { field: 'office', category: 'identity', required: false, aliases: ['office', 'location', 'officelocation', 'site'] },
  { field: 'distinguishedName', category: 'identity', required: false, aliases: ['distinguishedname', 'dn'] },
  { field: 'objectGUID', category: 'identity', required: false, aliases: ['objectguid', 'guid', 'gUID'] },
  { field: 'sid', category: 'identity', required: false, aliases: ['sid', 'objectsid', 'securityidentifier'] },
  { field: 'primaryGroupId', category: 'identity', required: false, aliases: ['primarygroupid', 'primarygroup'] },
  { field: 'memberOf', category: 'identity', required: false, aliases: ['memberof', 'groupmembership', 'groups'] },
  { field: 'groupName', category: 'group', required: false, aliases: ['groupname', 'group', 'cn'] },
  { field: 'groupType', category: 'group', required: false, aliases: ['grouptype', 'type', 'scope', 'category'] },
  { field: 'members', category: 'group', required: false, aliases: ['members', 'member', 'users'] },
  { field: 'parentGroup', category: 'group', required: false, aliases: ['parentgroup', 'parent', 'managedby'] },
  { field: 'hostname', category: 'infrastructure', required: false, aliases: ['hostname', 'host', 'computername', 'name', 'server'] },
  { field: 'fqdn', category: 'infrastructure', required: false, aliases: ['fqdn', 'dnsname', 'dns', 'fullyqualified'] },
  { field: 'ipAddress', category: 'infrastructure', required: false, aliases: ['ipaddress', 'ip', 'address'] },
  { field: 'operatingSystem', category: 'infrastructure', required: false, aliases: ['operatingsystem', 'os', 'osversion', 'platform'] },
  { field: 'environment', category: 'infrastructure', required: false, aliases: ['environment', 'env', 'tier'] },
  { field: 'domain', category: 'infrastructure', required: false, aliases: ['domain', 'domainname'] },
  { field: 'ou', category: 'infrastructure', required: false, aliases: ['ou', 'organizationalunit'] },
  { field: 'site', category: 'infrastructure', required: false, aliases: ['site', 'location', 'datacenter'] },
  { field: 'subnet', category: 'infrastructure', required: false, aliases: ['subnet', 'network', 'cidr'] },
  { field: 'uid', category: 'linux', required: false, aliases: ['uid', 'userid', 'linuxuid'] },
  { field: 'gid', category: 'linux', required: false, aliases: ['gid', 'groupid', 'linuxgid'] },
  { field: 'shell', category: 'linux', required: false, aliases: ['shell', 'loginshell', 'defaultshell'] },
  { field: 'homeDirectory', category: 'linux', required: false, aliases: ['homedirectory', 'home', 'homedir'] },
  { field: 'linuxGroups', category: 'linux', required: false, aliases: ['linuxgroups', 'groups', 'supplementary'] },
  { field: 'sudoUser', category: 'linux', required: false, aliases: ['sudouser', 'sudoersuser', 'user'] },
  { field: 'sudoHost', category: 'linux', required: false, aliases: ['sudohost', 'host', 'target'] },
  { field: 'sudoCommand', category: 'linux', required: false, aliases: ['sudocommand', 'command', 'cmd', 'runas'] },
  { field: 'sshPublicKey', category: 'linux', required: false, aliases: ['sshpublickey', 'sshkey', 'publickey', 'key'] },
  { field: 'applicationName', category: 'business', required: false, aliases: ['applicationname', 'appname', 'app', 'application'] },
  { field: 'databaseName', category: 'business', required: false, aliases: ['databasename', 'dbname', 'db', 'database'] },
  { field: 'businessService', category: 'business', required: false, aliases: ['businessservice', 'service', 'svc'] },
  { field: 'owner', category: 'business', required: false, aliases: ['owner', 'managedby', 'responsible'] },
  { field: 'businessUnit', category: 'business', required: false, aliases: ['businessunit', 'bizunit', 'costcenter', 'division'] },
  { field: 'classification', category: 'business', required: false, aliases: ['classification', 'dataclass', 'sensitivity'] },
]

export function findTargetField(header: string, datasetType?: string): { field: string; confidence: number } {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')

  for (const f of TARGET_FIELDS) {
    if (f.field.toLowerCase() === h) return { field: f.field, confidence: 100 }
    if (f.aliases.includes(h)) return { field: f.field, confidence: 90 }
  }

  for (const f of TARGET_FIELDS) {
    for (const alias of f.aliases) {
      if (h.includes(alias) || alias.includes(h)) return { field: f.field, confidence: 70 }
    }
  }

  if (datasetType) {
    const dt = datasetType.toLowerCase()
    for (const f of TARGET_FIELDS) {
      if (f.field.toLowerCase().includes(dt.replace(/\s/g, '')) || dt.includes(f.field.toLowerCase())) {
        return { field: f.field, confidence: 40 }
      }
    }
  }

  return { field: header, confidence: 0 }
}

export function getFieldDef(field: string): FieldDef | undefined {
  return TARGET_FIELDS.find((f) => f.field === field)
}
