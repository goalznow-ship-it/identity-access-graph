import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { attackPath, blastRadius, shortestPath } from '../graphInvestigation'
import type { GraphData, GraphLink, GraphNode } from '../../types/graph'

const node = (id: string, nodeType: GraphNode['nodeType'] = 'USER'): GraphNode => ({ id, displayName: id, nodeType, sourceSystem: 'CUSTOM', riskLevel: 'NONE', properties: {} })
const link = (id: string, source: string, target: string, relationshipType: GraphLink['relationshipType'] = 'MEMBER_OF'): GraphLink => ({ id, source, target, relationshipType, sourceSystem: 'CUSTOM' })
const graph: GraphData = {
  nodes: [node('user'), node('group', 'GROUP'), node('role', 'ROLE'), node('host', 'HOST'), node('app', 'APPLICATION')],
  links: [link('1','user','group'), link('2','group','role','HAS_ROLE'), link('3','role','host','HAS_ACCESS_TO'), link('4','host','app','USES'), link('5','group','user')],
}

describe('graph investigation', () => {
  it('finds a directed shortest path without cycling', () => {
    const result = shortestPath(graph, 'user', 'host', 'directed', 10)
    assert.deepEqual(result?.nodeIds, ['user','group','role','host'])
  })
  it('supports undirected traversal and depth limits', () => {
    assert.equal(shortestPath(graph, 'host', 'user', 'undirected', 3)?.depth, 3)
    assert.equal(shortestPath(graph, 'user', 'app', 'directed', 2), null)
  })
  it('counts blast-radius entity categories', () => {
    const result = blastRadius(graph, 'user', 4)
    assert.equal(result.counts.groups, 1)
    assert.equal(result.counts.hosts, 1)
    assert.equal(result.counts.apps, 1)
  })
  it('restricts attack paths to privilege relationships', () => {
    assert.equal(attackPath(graph, 'user', 'host')?.riskScore !== undefined, true)
    assert.equal(attackPath(graph, 'user', 'app'), null)
  })
})
