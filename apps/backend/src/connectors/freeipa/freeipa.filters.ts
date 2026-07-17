export const FREEIPA_FILTERS: Record<string, string> = {
  users: '(objectClass=posixAccount)',
  groups: '(objectClass=posixGroup)',
  hosts: '(objectClass=ipaHost)',
  hostGroups: '(objectClass=ipahostgroup)',
  roles: '(objectClass=iparole)',
  permissions: '(objectClass=ipapermission)',
  privileges: '(objectClass=ipaprivilege)',
  sudoRules: '(objectClass=ipasudorule)',
  sudoCmds: '(objectClass=ipasudocmd)',
  hbacRules: '(objectClass=ipahbacrule)',
  services: '(objectClass=ipaService)',
  netgroups: '(objectClass=ipaNetgroup)',
}
