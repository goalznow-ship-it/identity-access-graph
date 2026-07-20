import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential, DeviceCodeCredential, ClientCertificateCredential, type TokenCredential } from '@azure/identity'
import type { Connector } from '../connector.types'
import type { EntraObjectType, NormalizedEntraObject } from './entra-id.types'
import { normalizeEntraObject } from './entra-id.mapper'

function getCredential(config: Connector['configuration']): TokenCredential {
  const tenantId = config.entraTenantId ?? ''
  const clientId = config.entraClientId ?? ''
  const authMode = config.authenticationMode

  if (authMode === 'DEVICE_CODE' || config.entraUseDeviceCode) {
    return new DeviceCodeCredential({
      tenantId,
      clientId,
      userPromptCallback: (info) => {
        console.log(`[Entra ID] Device code: ${info.message}`)
      },
    })
  }
  if (authMode === 'CERTIFICATE') {
    return new ClientCertificateCredential(tenantId, clientId, { certificate: config.entraCertificatePrivateKey ?? '' })
  }
  return new ClientSecretCredential(tenantId, clientId, config.entraClientSecret ?? '')
}

function createClient(credential: TokenCredential): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default')
        return token?.token ?? ''
      },
    },
  })
}

function extractId(obj: any): string {
  return obj?.id ?? ''
}

function extractIds(arr: any[] | undefined): string[] {
  return (arr ?? []).map(extractId)
}

export class EntraIdConnector {
  async extract(connector: Connector, limit?: number, watermark?: string, signal?: AbortSignal): Promise<{
    objects: NormalizedEntraObject[]
    pageCounts: Record<string, number>
    tenantInfo: Record<string, unknown>
  }> {
    const credential = getCredential(connector.configuration)
    const client = createClient(credential)
    const allObjects: NormalizedEntraObject[] = []
    const pageCounts: Record<string, number> = {}

    const collections: { type: EntraObjectType; path: string; select: string[]; filter?: string }[] = [
      { type: 'USER', path: '/users', select: ['id', 'displayName', 'userPrincipalName', 'mail', 'givenName', 'surname', 'jobTitle', 'department', 'employeeId', 'userType', 'accountEnabled', 'onPremisesSecurityIdentifier', 'onPremisesSamAccountName', 'onPremisesUserPrincipalName', 'businessPhones', 'mobilePhone', 'officeLocation', 'preferredLanguage', 'companyName', 'createdDateTime', 'deletedDateTime', 'signInActivity'] },
      { type: 'GROUP', path: '/groups', select: ['id', 'displayName', 'description', 'groupTypes', 'securityEnabled', 'mailEnabled', 'mail', 'visibility', 'createdDateTime', 'deletedDateTime', 'members@odata.bind', 'owners@odata.bind'] },
      { type: 'ADMINISTRATIVE_UNIT', path: '/administrativeUnits', select: ['id', 'displayName', 'description', 'members@odata.bind', 'createdDateTime'] },
      { type: 'DIRECTORY_ROLE', path: '/directoryRoles', select: ['id', 'displayName', 'description', 'roleTemplateId', 'isBuiltIn', 'members@odata.bind'] },
      { type: 'APPLICATION', path: '/applications', select: ['id', 'displayName', 'appId', 'publisherName', 'signInAudience', 'createdDateTime', 'requiredResourceAccess', 'keyCredentials', 'passwordCredentials', 'appRoles'] },
      { type: 'ENTERPRISE_APP', path: '/servicePrincipals', select: ['id', 'displayName', 'appId', 'servicePrincipalType', 'appOwnerOrganizationId', 'publisherName', 'accountEnabled', 'appRoles', 'oauth2PermissionScopes', 'passwordCredentials', 'keyCredentials'] },
      { type: 'DEVICE', path: '/devices', select: ['id', 'displayName', 'operatingSystem', 'operatingSystemVersion', 'isManaged', 'trustType', 'profileType', 'registeredOwners@odata.bind', 'registeredUsers@odata.bind', 'createdDateTime'] },
    ]

    if (signal?.aborted) throw new DOMException('Extraction cancelled', 'AbortError')

    for (const collection of collections) {
      if (limit !== undefined && allObjects.length >= limit) break
      let pageCount = 0
      try {
        let url = `${collection.path}?$select=${collection.select.join(',')}&$top=${Math.min(100, limit === undefined ? 100 : limit - allObjects.length)}`
        if (watermark && (collection.type === 'USER' || collection.type === 'GROUP')) {
          url += `&$filter=createdDateTime ge ${watermark} or deletedDateTime ge ${watermark}`
        }

        let response = await client.api(url).get()

        while (response.value && (limit === undefined || allObjects.length < limit)) {
          pageCount++
          for (const item of response.value) {
            if (limit !== undefined && allObjects.length >= limit) break
            const obj = normalizeEntraObject(item, collection.type, item.id)
            allObjects.push(obj)
          }

          if ((limit === undefined || allObjects.length < limit) && response['@odata.nextLink']) {
            response = await client.api(response['@odata.nextLink']).get()
          } else break
        }
      } catch (err) {
        // Skip collections that fail with "not supported" or "access denied"
        const msg = (err as Error).message ?? ''
        if (msg.includes('Access denied') || msg.includes('not supported') || msg.includes('insufficient')) {
          continue
        }
        throw err
      }
      pageCounts[collection.type] = pageCount
    }

    let tenantInfo: Record<string, unknown> = {}
    try {
      const org = await client.api('/organization?$select=id,displayName,verifiedDomains').get()
      if (org.value?.[0]) {
        tenantInfo = org.value[0]
      }
    } catch { /* optional */ }

    return { objects: limit === undefined ? allObjects : allObjects.slice(0, limit), pageCounts, tenantInfo }
  }

  async testConnection(connector: Connector): Promise<{ connected: boolean; tenantId?: string; tenantName?: string; error?: string }> {
    try {
      const result = await this.extract(connector, 1)
      return {
        connected: true,
        tenantId: connector.configuration.entraTenantId,
        tenantName: (result.tenantInfo as any)?.displayName ?? 'Unknown',
      }
    } catch (err) {
      return { connected: false, error: (err as Error).message }
    }
  }
}
