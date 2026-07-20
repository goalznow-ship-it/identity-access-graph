import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ImportGraphChunkService } from '../import-graph-chunk.service'

describe('durable import graph chunks', () => {
  it('persists and restores a complete graph larger than preview and chunk limits', async () => {
    const rows: any[] = []
    const repository: any = {
      manager: { transaction: async (work: any) => work({ getRepository: () => repository }) },
      delete: async ({ importId }: any) => { for (let index = rows.length - 1; index >= 0; index--) if (rows[index].importId === importId) rows.splice(index, 1) },
      save: async (row: any) => { rows.push({ ...row }); return row },
      find: async ({ where }: any) => rows.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value)).slice(0, 1),
    }
    const service = new ImportGraphChunkService(repository)
    const nodes = Array.from({ length: 205 }, (_, index) => ({ id: `n${index}`, displayName: `Node ${index}`, nodeType: 'USER', sourceSystem: 'TEST', riskLevel: 'NONE', properties: {} }))
    const relationships = Array.from({ length: 151 }, (_, index) => ({ id: `r${index}`, source: 'n0', target: `n${index + 1}`, relationshipType: 'MEMBER_OF', sourceSystem: 'TEST', properties: {} }))
    await service.replace('import-1', nodes, relationships, 100)
    assert.deepEqual(rows.filter((row) => row.kind === 'NODE').map((row) => row.items.length), [100, 100, 5])
    assert.deepEqual(rows.filter((row) => row.kind === 'RELATIONSHIP').map((row) => row.items.length), [100, 51])
    const restored = await service.load('import-1')
    assert.equal(restored.nodes.length, 205)
    assert.equal(restored.links.length, 151)
    assert.equal(restored.nodes.at(-1)?.id, 'n204')
    assert.equal(restored.links.at(-1)?.id, 'r150')
  })
})
