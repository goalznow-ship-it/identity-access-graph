import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EnterpriseGraphService } from '../enterprise-graph.service'

function record(values: Record<string, number>) { return { get: (key: string) => values[key] ?? 0 } }
function repositories() {
  const version = { id: 'version-1', sequence: 1, status: 'APPLYING' }
  return {
    versions: {
      save: async () => version,
      findOneByOrFail: async () => version,
      findOne: async () => null,
      update: async (_id: string, update: object) => Object.assign(version, update),
    },
    snapshots: {},
  }
}

describe('enterprise graph production writes', () => {
  it('supports relationship-only versions without issuing an empty node query', async () => {
    const writes: { cypher: string; parameters: any }[] = []
    const neo4j = { runInTransaction: async (_mode: any, work: any) => work({ run: async (cypher: string, parameters: any) => { writes.push({ cypher, parameters }); return { records: [record({ added: 1, updated: 0 })] } } }) }
    const repos = repositories()
    const graph = new EnterpriseGraphService(neo4j as any, repos.versions as any, repos.snapshots as any)
    const result = await graph.apply({ source: 'test', relationships: [{ id: 'r1', source: 'a', target: 'b', relationshipType: 'MEMBER_OF', sourceSystem: 'TEST', properties: {} }] })
    assert.equal(writes.length, 1)
    assert.match(writes[0].cypher, /MERGE \(s\)-\[r:MEMBER_OF/)
    assert.equal(result.counts.nodesAdded, 0)
    assert.equal(result.counts.relationshipsAdded, 1)
  })

  it('splits large node updates into bounded Neo4j transactions', async () => {
    const batchSizes: number[] = []
    let transactions = 0
    const neo4j = { runInTransaction: async (_mode: any, work: any) => { transactions++; return work({ run: async (_cypher: string, parameters: any) => { batchSizes.push(parameters.rows.length); return { records: [record({ added: parameters.rows.length, updated: 0 })] } } }) } }
    const repos = repositories()
    const graph = new EnterpriseGraphService(neo4j as any, repos.versions as any, repos.snapshots as any)
    const nodes = Array.from({ length: 1001 }, (_, index) => ({ id: `n${index}`, displayName: `Node ${index}`, nodeType: 'USER', sourceSystem: 'TEST', properties: {} }))
    const result = await graph.apply({ source: 'test', nodes })
    assert.deepEqual(batchSizes, [1000, 1])
    assert.equal(transactions, 1)
    assert.equal(result.counts.nodesAdded, 1001)
  })

  it('marks the version failed when an atomic Neo4j transaction rolls back', async () => {
    const neo4j = { runInTransaction: async (_mode: any, work: any) => work({ run: async () => { throw new Error('write failed') } }) }
    const repos = repositories()
    const graph = new EnterpriseGraphService(neo4j as any, repos.versions as any, repos.snapshots as any)
    await assert.rejects(() => graph.apply({ source: 'test', nodes: [{ id: 'n1', displayName: 'Node', nodeType: 'USER', sourceSystem: 'TEST', properties: {} }] }), /write failed/)
    assert.equal((repos.versions as any).findOneByOrFail().then ? (await (repos.versions as any).findOneByOrFail()).status : '', 'FAILED')
  })
})
