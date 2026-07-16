export enum NodeType {
  User = 'USER',
  Group = 'GROUP',
  Role = 'ROLE',
  Permission = 'PERMISSION',
  Department = 'DEPARTMENT',
  Team = 'TEAM',
  Manager = 'MANAGER',
  Forest = 'FOREST',
  Domain = 'DOMAIN',
  OrganizationalUnit = 'ORGANIZATIONAL_UNIT',
  Computer = 'COMPUTER',
  Host = 'HOST',
  OperatingSystem = 'OPERATING_SYSTEM',
  Site = 'SITE',
  Subnet = 'SUBNET',
  GroupPolicy = 'GROUP_POLICY',
  Trust = 'TRUST',
  ServiceAccount = 'SERVICE_ACCOUNT',
  ManagedServiceAccount = 'MANAGED_SERVICE_ACCOUNT',
  Application = 'APPLICATION',
  Database = 'DATABASE',
  BusinessService = 'BUSINESS_SERVICE',
  LinuxUser = 'LINUX_USER',
  LinuxGroup = 'LINUX_GROUP',
  SudoPolicy = 'SUDO_POLICY',
  SSHKey = 'SSH_KEY',
  AzureTenant = 'AZURE_TENANT',
  CloudAccount = 'CLOUD_ACCOUNT',
  VM = 'VM',
  Container = 'CONTAINER',
  KubernetesCluster = 'KUBERNETES_CLUSTER',
  NetworkShare = 'NETWORK_SHARE',
}

export enum RelationshipType {
  MemberOf = 'MEMBER_OF',
  HasPermission = 'HAS_PERMISSION',
  ReportsTo = 'REPORTS_TO',
  Manages = 'MANAGES',
  BelongsTo = 'BELONGS_TO',
  RunsOn = 'RUNS_ON',
  InstalledOn = 'INSTALLED_ON',
  ConnectsTo = 'CONNECTS_TO',
  Contains = 'CONTAINS',
  PartOf = 'PART_OF',
  Trusts = 'TRUSTS',
  Delegates = 'DELEGATES',
  AppliesTo = 'APPLIES_TO',
  HasAccess = 'HAS_ACCESS',
  Owns = 'OWNS',
  DependsOn = 'DEPENDS_ON',
  LinkedTo = 'LINKED_TO',
  HostedOn = 'HOSTED_ON',
  LocatedIn = 'LOCATED_IN',
  AuthenticatesTo = 'AUTHENTICATES_TO',
  ManagesThrough = 'MANAGES_THROUGH',
}

export enum SourceSystem {
  ActiveDirectory = 'ACTIVE_DIRECTORY',
  FreeIPA = 'FREE_IPA',
  Linux = 'LINUX',
  EntraID = 'ENTRA_ID',
  Oracle = 'ORACLE',
  PostgreSQL = 'POSTGRESQL',
  VMware = 'VMWARE',
  AWSIAM = 'AWS_IAM',
  AzureAD = 'AZURE_AD',
  LDAP = 'LDAP',
  Okta = 'OKTA',
  Keycloak = 'KEYCLOAK',
  GCP = 'GCP',
  Custom = 'CUSTOM',
  Manual = 'MANUAL',
}

export enum RiskLevel {
  None = 'NONE',
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

export enum AccountStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Disabled = 'DISABLED',
  Locked = 'LOCKED',
  Expired = 'EXPIRED',
  Pending = 'PENDING',
}

export enum OperatingSystemType {
  Windows = 'WINDOWS',
  Linux = 'LINUX',
  macOS = 'MAC_OS',
  Solaris = 'SOLARIS',
  AIX = 'AIX',
  Unknown = 'UNKNOWN',
}

export enum AccessType {
  Read = 'READ',
  Write = 'WRITE',
  Execute = 'EXECUTE',
  Admin = 'ADMIN',
  FullControl = 'FULL_CONTROL',
  Delegated = 'DELEGATED',
}

export enum TrustDirection {
  Inbound = 'INBOUND',
  Outbound = 'OUTBOUND',
  Bidirectional = 'BIDIRECTIONAL',
}

export enum PlatformType {
  Windows = 'WINDOWS',
  Linux = 'LINUX',
  macOS = 'MAC_OS',
  Cloud = 'CLOUD',
  Container = 'CONTAINER',
  Virtualization = 'VIRTUALIZATION',
  Database = 'DATABASE',
  Network = 'NETWORK',
  Identity = 'IDENTITY',
}
