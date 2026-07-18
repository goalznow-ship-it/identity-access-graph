import type { ImportedGraphNode } from './node-converter'

const REFERENCE_FIELDS = ['objectGUID', 'sid', 'distinguishedName', 'employeeId', 'username', 'samAccountName', 'userPrincipalName', 'email', 'groupName', 'hostname', 'applicationName', 'department', 'team', 'roleName', 'permissionName', 'databaseName', 'businessService']

export class ReferenceResolver {
  private index = new Map<string, Set<string>>()

  constructor(nodes: ImportedGraphNode[]) {
    nodes.forEach((node) => {
      this.add(node.id, node.id)
      this.add(node.displayName, node.id)
      REFERENCE_FIELDS.forEach((field) => this.add(node.properties[field], node.id))
    })
  }

  private add(value: unknown, nodeId: string): void {
    const key = String(value ?? '').trim().toLowerCase()
    if (!key) return
    if (!this.index.has(key)) this.index.set(key, new Set())
    this.index.get(key)!.add(nodeId)
  }

  resolve(value: unknown, excludeNodeId?: string): string | undefined {
    const matches = this.index.get(String(value ?? '').trim().toLowerCase())
    if (!matches) return undefined
    const candidates = [...matches].filter((nodeId) => nodeId !== excludeNodeId)
    return candidates.length === 1 ? candidates[0] : undefined
  }
}
