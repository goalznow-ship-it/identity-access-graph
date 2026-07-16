import { Client } from 'ldapts'
import type { ConnectorConfiguration } from '../connector.types'
import { mapLdapError } from './ldap-error.mapper'
import type { LdapClient,LdapEntry,LdapSearchOptions } from './ldap-client.interface'
import { paginateEntries } from './ldap-paging'
export class LdapClientService implements LdapClient{
  private client:Client
  constructor(private configuration:ConnectorConfiguration){this.client=new Client({url:configuration.url,timeout:configuration.operationTimeoutMs,connectTimeout:configuration.connectTimeoutMs,tlsOptions:{rejectUnauthorized:configuration.tlsRejectUnauthorized!==false}})}
  async bind(dn:string,password:string){try{await this.client.bind(dn,password)}catch(error){throw mapLdapError(error)}}
  async unbind(){try{await this.client.unbind()}catch{/* connection is already closed */}}
  async rootDSE(){try{const result=await this.client.search('',{scope:'base',filter:'(objectClass=*)',attributes:['namingContexts','defaultNamingContext','configurationNamingContext','rootDomainNamingContext']});return result.searchEntries[0]??{}}catch(error){throw mapLdapError(error)}}
  async discoverNamingContexts(){const root=await this.rootDSE();const value=(root as any).namingContexts??(root as any).defaultNamingContext??[];return(Array.isArray(value)?value:[value]).map(String).filter(Boolean)}
  async testConnection(){const rootDse=await this.rootDSE();return{connected:true,rootDse,namingContexts:await this.discoverNamingContexts()}}
  async pagedSearch(options:LdapSearchOptions){if(options.signal?.aborted)throw new DOMException('LDAP search cancelled','AbortError');try{const result=await this.client.search(options.baseDn,{scope:'sub',filter:options.filter,attributes:options.attributes,sizeLimit:options.sizeLimit??0,paged:{pageSize:options.pageSize}});const entries:LdapEntry[]=result.searchEntries.map((entry:any)=>{const{dn,...attributes}=entry;return{dn:String(dn),attributes}});return paginateEntries(entries,options.pageSize)}catch(error){throw mapLdapError(error)}}
}
