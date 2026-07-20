import { Inject } from '@nestjs/common'
import type { Connector } from '../connector.types'
import { LDAP_CLIENT_FACTORY,type LdapClientFactory,type LdapEntry,andFilter,changedSinceFilter } from '../ldap'
import { ALL_AD_ATTRIBUTES } from './active-directory.attributes'
import { AD_FILTERS } from './active-directory.filters'
import { normalizeAdEntry } from './active-directory.mapper'
export class ActiveDirectoryConnector{
  constructor(@Inject(LDAP_CLIENT_FACTORY)private factory:LdapClientFactory){}
  async extract(connector:Connector,limit?:number,watermark?:string,signal?:AbortSignal){
    const client=this.factory(connector.configuration),entries:LdapEntry[]=[],pageCounts:Record<string,number>={}
    try{
      await client.bind(connector.configuration.bindDn??'',connector.configuration.bindPassword??'')
      for(const[type,baseFilter]of Object.entries(AD_FILTERS)){
        if(limit!==undefined&&entries.length>=limit)break
        const filter=watermark?andFilter(baseFilter,changedSinceFilter(watermark)):baseFilter
        const pages=await client.pagedSearch({baseDn:connector.configuration.baseDn??'',filter,attributes:[...ALL_AD_ATTRIBUTES,'objectClass','uSNChanged'],pageSize:connector.configuration.pageSize??500,sizeLimit:limit===undefined?undefined:limit-entries.length,signal,operationTimeoutMs:connector.configuration.operationTimeoutMs})
        pageCounts[type]=pages.length;entries.push(...(limit===undefined?pages.flatMap(page=>page.entries):pages.flatMap(page=>page.entries).slice(0,limit-entries.length)))
      }
      const namingContexts=await client.discoverNamingContexts()
      const objects=entries.map(normalizeAdEntry)
      const rootDomain=namingContexts.find(context=>context.toLowerCase().startsWith('dc='))
      if(rootDomain&&!objects.some(object=>object.objectType==='FOREST'))objects.unshift({recordId:`forest:${rootDomain.toLowerCase()}`,objectType:'FOREST',dn:`forest:${rootDomain.toLowerCase()}`,attributes:{name:rootDomain,distinguishedName:rootDomain},raw:{dn:rootDomain,attributes:{synthetic:true}}})
      return{objects:limit===undefined?objects:objects.slice(0,limit),pageCounts,namingContexts}
    }finally{await client.unbind()}
  }
}
