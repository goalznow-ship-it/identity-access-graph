export enum ConnectorType{ACTIVE_DIRECTORY='ACTIVE_DIRECTORY',GENERIC_LDAP='GENERIC_LDAP',FREEIPA='FREEIPA',LINUX_SSH='LINUX_SSH'}export enum ConnectorStatus{DISABLED='DISABLED',CONFIGURED='CONFIGURED',TESTING='TESTING',CONNECTED='CONNECTED',DEGRADED='DEGRADED',FAILED='FAILED',SYNCING='SYNCING'}export enum SyncMode{FULL='FULL',INCREMENTAL='INCREMENTAL',PREVIEW='PREVIEW'}export enum AuthenticationMode{SIMPLE_BIND='SIMPLE_BIND',NTLM_PLACEHOLDER='NTLM_PLACEHOLDER',KERBEROS_PLACEHOLDER='KERBEROS_PLACEHOLDER',SSH_PASSWORD='SSH_PASSWORD',SSH_PRIVATE_KEY='SSH_PRIVATE_KEY'}
export interface ConnectorConfiguration{url?:string;baseDn?:string;bindDn?:string;bindPassword?:string;tls?:boolean;tlsRejectUnauthorized?:boolean;allowPlaintextInProduction?:boolean;connectTimeoutMs?:number;operationTimeoutMs?:number;pageSize?:number;authenticationMode?:AuthenticationMode;freeipaUrl?:string;freeipaBaseDn?:string;freeipaBindDn?:string;freeipaBindPassword?:string;freeipaTls?:boolean;freeipaTlsRejectUnauthorized?:boolean;freeipaConnectTimeoutMs?:number;freeipaOperationTimeoutMs?:number;freeipaPageSize?:number;sshHost?:string;sshPort?:number;sshUsername?:string;sshPassword?:string;sshPrivateKey?:string;sshPrivateKeyPassphrase?:string;sshConnectTimeoutMs?:number;sshCommandTimeoutMs?:number;sshHostKeyFingerprint?:string;sshStrictHostKeyChecking?:boolean}
export interface Connector{id:string;name:string;connectorType:ConnectorType;status:ConnectorStatus;enabled:boolean;configuration:ConnectorConfiguration;capabilities:string[];lastTestedAt?:string;lastSyncAt?:string;lastSuccessfulSyncAt?:string;lastError?:string;createdAt:string;updatedAt:string}
export interface SyncRun{syncRunId:string;connectorId:string;mode:SyncMode;status:'RUNNING'|'COMPLETED'|'FAILED';startedAt:string;completedAt?:string;objectCounts:Record<string,number>;pageCounts:Record<string,number>;warnings:string[];errors:string[];durationMs?:number;checkpoint?:string;watermark?:string;preview?:unknown[];pipeline?:{correlated:number;nodesCreated:number;relationshipsCreated:number;persisted?:boolean;riskScanned?:boolean}}
export interface SyncOptions{mode?:SyncMode;previewLimit?:number;convert?:boolean;persist?:boolean;runRiskScan?:boolean}
export const maskConfiguration=(configuration:ConnectorConfiguration):ConnectorConfiguration=>{
  const masked={...configuration}
  if(masked.bindPassword)masked.bindPassword='********'
  if(masked.freeipaBindPassword)masked.freeipaBindPassword='********'
  if(masked.sshPassword)masked.sshPassword='********'
  if(masked.sshPrivateKey)delete masked.sshPrivateKey
  if(masked.sshPrivateKeyPassphrase)delete masked.sshPrivateKeyPassphrase
  return masked
}
export const safeConnector=(connector:Connector):Connector=>({...connector,configuration:maskConfiguration(connector.configuration)})
