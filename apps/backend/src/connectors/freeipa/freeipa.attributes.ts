export const FREEIPA_ATTRIBUTES: Record<string, string[]> = {
  user: [
    'uid', 'cn', 'displayName', 'givenName', 'sn', 'mail',
    'employeeNumber', 'title', 'manager', 'memberOf', 'ipaUniqueID',
    'uidNumber', 'gidNumber', 'homeDirectory', 'loginShell',
    'krbPrincipalName', 'nsAccountLock', 'sshPublicKey',
    'createTimestamp', 'modifyTimestamp', 'objectClass',
  ],
  group: [
    'cn', 'description', 'ipaUniqueID', 'gidNumber',
    'member', 'memberOf', 'memberUser', 'memberGroup',
    'createTimestamp', 'modifyTimestamp', 'objectClass',
  ],
  host: [
    'fqdn', 'cn', 'description', 'ipaUniqueID', 'memberOf',
    'managedBy', 'krbPrincipalName', 'sshPublicKey',
    'location', 'platform', 'operatingSystem',
    'createTimestamp', 'modifyTimestamp', 'objectClass',
  ],
  hostGroup: [
    'cn', 'description', 'ipaUniqueID', 'member', 'memberOf',
    'createTimestamp', 'modifyTimestamp', 'objectClass',
  ],
  role: [
    'cn', 'description', 'ipaUniqueID', 'member', 'memberOf',
    'memberUser', 'memberHost', 'memberService',
    'createTimestamp', 'modifyTimestamp', 'objectClass',
  ],
  permission: [
    'cn', 'description', 'ipaUniqueID', 'member', 'memberOf',
    'memberRole', 'memberPrivilege', 'bindruletype', 'ipapermissiontype',
    'targetgroup', 'targetcn', 'targetfilter', 'targetattr',
    'extratargetfilter', 'objectClass',
  ],
  privilege: [
    'cn', 'description', 'ipaUniqueID', 'member', 'memberOf',
    'memberRole', 'objectClass',
  ],
  sudoRule: [
    'cn', 'description', 'ipaEnabledFlag', 'memberUser',
    'memberHost', 'memberAllowCmd', 'memberDenyCmd',
    'sudoOption', 'hostCategory', 'userCategory', 'objectClass',
  ],
  sudoCmd: [
    'cn', 'description', 'ipaUniqueID', 'objectClass',
    'sudoCommand', 'memberOf',
  ],
  hbacRule: [
    'cn', 'description', 'ipaEnabledFlag', 'memberUser',
    'memberHost', 'serviceCategory', 'accessRuleType',
    'memberService', 'objectClass',
  ],
  service: [
    'krbPrincipalName', 'cn', 'ipaUniqueID', 'managedBy',
    'memberOf', 'objectClass',
  ],
  netgroup: [
    'cn', 'description', 'ipaUniqueID', 'member', 'memberOf',
    'nisNetgroupTriple', 'objectClass',
  ],
}

export const ALL_FREEIPA_ATTRIBUTES = [...new Set(Object.values(FREEIPA_ATTRIBUTES).flat())]
