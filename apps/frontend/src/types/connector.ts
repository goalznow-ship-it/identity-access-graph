export type ConnectorStatus='DISABLED'|'CONFIGURED'|'TESTING'|'CONNECTED'|'DEGRADED'|'FAILED'|'SYNCING'
export type ConnectorTypeName='ACTIVE_DIRECTORY'|'GENERIC_LDAP'|'FREEIPA'|'LINUX_SSH'

export interface ConnectorConfiguration {
  url?:string;baseDn?:string;bindDn?:string;bindPassword?:string;tls?:boolean;tlsRejectUnauthorized?:boolean;pageSize?:number;authenticationMode?:string
  freeipaUrl?:string;freeipaBaseDn?:string;freeipaBindDn?:string;freeipaBindPassword?:string;freeipaTls?:boolean;freeipaTlsRejectUnauthorized?:boolean;freeipaConnectTimeoutMs?:number;freeipaOperationTimeoutMs?:number;freeipaPageSize?:number
  sshHost?:string;sshPort?:number;sshUsername?:string;sshPassword?:string;sshPrivateKey?:string;sshPrivateKeyPassphrase?:string;sshConnectTimeoutMs?:number;sshCommandTimeoutMs?:number;sshHostKeyFingerprint?:string;sshStrictHostKeyChecking?:boolean
}

export interface Connector{
  id:string;name:string;connectorType:ConnectorTypeName;status:ConnectorStatus;enabled:boolean;configuration:ConnectorConfiguration
  capabilities:string[];lastTestedAt?:string;lastSyncAt?:string;lastError?:string
}

export interface SyncRun{
  syncRunId:string;connectorId:string;mode:string;status:string;startedAt:string;completedAt?:string;objectCounts:Record<string,number>;pageCounts:Record<string,number>;warnings:string[];errors:string[];durationMs?:number;preview?:unknown[]
}
