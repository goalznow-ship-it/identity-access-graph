export interface LdapEntry{dn:string;attributes:Record<string,unknown>}
export interface LdapSearchOptions{baseDn:string;filter:string;attributes:string[];pageSize:number;sizeLimit?:number;signal?:AbortSignal;operationTimeoutMs?:number}
export interface LdapSearchPage{entries:LdapEntry[];page:number;cookie?:string}
export interface LdapClient{bind(dn:string,password:string):Promise<void>;unbind():Promise<void>;testConnection():Promise<{connected:boolean;rootDse?:Record<string,unknown>;namingContexts:string[]}>;pagedSearch(options:LdapSearchOptions):Promise<LdapSearchPage[]>;rootDSE():Promise<Record<string,unknown>>;discoverNamingContexts():Promise<string[]>}
export const LDAP_CLIENT_FACTORY=Symbol('LDAP_CLIENT_FACTORY');export type LdapClientFactory=(configuration:any)=>LdapClient
