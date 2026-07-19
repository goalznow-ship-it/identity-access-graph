import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { GraphController } from '../../graph/graph.controller'
import { GraphService } from '../../graph/graph.service'

const record = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] })

describe('enterprise graph explorer', () => {
  it('returns a filtered and paginated node inventory', async () => {
    let query = ''
    let parameters: any
    const node = { id: 'u1', displayName: 'Alice', nodeType: 'USER', sourceSystem: 'ACTIVE_DIRECTORY', riskLevel: 'HIGH', properties: { status: 'ACTIVE' } }
    const neo = {
      isEnabled: () => true,
      read: async (nextQuery: string, nextParameters: any) => {
        query = nextQuery
        parameters = nextParameters
        return { records: [record({ nodes: [node], total: 3 })] }
      },
    }
    const result = await new GraphService({} as any, neo as any).exploreNodes({ query: 'ali', nodeTypes: ['USER'], riskLevels: ['HIGH'], limit: 1, offset: 1, sortBy: 'riskLevel', sortDirection: 'DESC' })
    assert.equal(result.total, 3)
    assert.equal(result.items[0].id, 'u1')
    assert.equal(result.hasMore, true)
    assert.deepEqual(parameters.nodeTypes, ['USER'])
    assert.match(query, /ORDER BY n\.riskLevel DESC/)
  })

  it('returns relationship inventory metadata', async () => {
    const neo = { isEnabled: () => true, read: async () => ({ records: [record({ items: [{ sourceName: 'Alice', targetName: 'Admins', relationship: { id: 'r1' } }], total: 1 })] }) }
    const result = await new GraphService({} as any, neo as any).exploreRelationships({ types: ['MEMBER_OF'] })
    assert.equal(result.total, 1)
    assert.equal(result.items[0].sourceName, 'Alice')
  })

  it('collects every result page for exports', async () => {
    const service = new GraphService({} as any, { isEnabled: () => true } as any)
    let calls = 0
    ;(service as any).exploreNodes = async (input: any) => {
      calls += 1
      return input.offset === 0
        ? { items: Array.from({ length: 500 }, (_, index) => ({ id: String(index) })), total: 501 }
        : { items: [{ id: '500' }], total: 501 }
    }
    const result = await service.exportNodes({ query: 'alice' })
    assert.equal(calls, 2)
    assert.equal(result.items.length, 501)
    assert.equal(result.truncated, false)
  })

  it('validates explorer query parameters before calling Neo4j', () => {
    const controller = new GraphController({ exploreNodes: () => undefined } as any, {} as any)
    assert.throws(() => controller.exploreNodes({ limit: '-1' }), BadRequestException)
    assert.throws(() => controller.exploreNodes({ sortDirection: 'sideways' }), BadRequestException)
    assert.throws(() => controller.exploreNodes({ sortBy: 'password' }), BadRequestException)
  })
})
