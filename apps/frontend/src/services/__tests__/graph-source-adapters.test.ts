import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { GraphData, GraphNode } from '../../types/graph'
import { buildUserProfile, setGraphData } from '../identityGraphAdapter'
import { getHostDetail, getLinuxHostsByFilter, setLinuxGraphData } from '../linuxGraphAdapter'

function node(id: string, nodeType: GraphNode['nodeType'], displayName: string): GraphNode {
  return {
    id,
    nodeType,
    displayName,
    sourceSystem: nodeType === 'USER' ? 'ACTIVE_DIRECTORY' : 'LINUX',
    riskLevel: 'NONE',
    properties: {},
  }
}

describe('workspace graph adapters', () => {
  it('replaces Linux inventory and invalidates cached host details when the source changes', () => {
    const first: GraphData = { nodes: [node('host-1', 'HOST', 'First host')], links: [] }
    const second: GraphData = { nodes: [node('host-2', 'HOST', 'Second host')], links: [] }

    setLinuxGraphData(first)
    assert.equal(getHostDetail('host-1')?.host.hostname, 'First host')
    assert.deepEqual(getLinuxHostsByFilter({}).map((host) => host.id), ['host-1'])

    setLinuxGraphData(second)
    assert.equal(getHostDetail('host-1'), null)
    assert.deepEqual(getLinuxHostsByFilter({}).map((host) => host.id), ['host-2'])
  })

  it('builds identity profiles only from the explicitly injected dataset', () => {
    setGraphData({ nodes: [node('user-1', 'USER', 'First user')], links: [] })
    assert.equal(buildUserProfile('user-1')?.user.node.displayName, 'First user')

    setGraphData({ nodes: [node('user-2', 'USER', 'Second user')], links: [] })
    assert.equal(buildUserProfile('user-1'), null)
    assert.equal(buildUserProfile('user-2')?.user.node.displayName, 'Second user')
  })
})
