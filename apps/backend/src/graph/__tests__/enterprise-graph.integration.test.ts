import 'reflect-metadata'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { DATABASE_ENTITIES, GraphSnapshotEntity, GraphVersionEntity } from '../../database/entities'
import { InitialOperationalPersistence1721380800000 } from '../../database/migrations/1721380800000-InitialOperationalPersistence'
import { EnterpriseImportEngine1721467200000 } from '../../database/migrations/1721467200000-EnterpriseImportEngine'
import { EnterpriseGraphEngine1721553600000 } from '../../database/migrations/1721553600000-EnterpriseGraphEngine'
import { Neo4jService } from '../../neo4j'
import { GraphSchemaService } from '../../neo4j/schema'
import { EnterpriseGraphService } from '../enterprise-graph.service'

const databaseUrl = process.env.TEST_DATABASE_URL, neo4jUri = process.env.TEST_NEO4J_URI
describe('enterprise graph Neo4j integration', { skip: databaseUrl && neo4jUri ? false : 'graph integration environment is not configured' }, () => {
  let dataSource: DataSource, neo4j: Neo4jService, graph: EnterpriseGraphService
  before(async () => {
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl, entities: DATABASE_ENTITIES, migrations: [InitialOperationalPersistence1721380800000, EnterpriseImportEngine1721467200000, EnterpriseGraphEngine1721553600000], synchronize: false })
    await dataSource.initialize(); await dataSource.runMigrations()
    neo4j = new Neo4jService(new ConfigService({ NEO4J_ENABLED: 'true', NEO4J_URI: neo4jUri, NEO4J_USERNAME: process.env.TEST_NEO4J_USERNAME, NEO4J_PASSWORD: process.env.TEST_NEO4J_PASSWORD, NEO4J_DATABASE: 'neo4j', NEO4J_ENCRYPTED: 'false' }))
    await neo4j.write('MATCH (n:GraphNode) DETACH DELETE n')
    await new GraphSchemaService(neo4j).bootstrap()
    await dataSource.getRepository(GraphVersionEntity).clear()
    graph = new EnterpriseGraphService(neo4j, dataSource.getRepository(GraphVersionEntity), dataSource.getRepository(GraphSnapshotEntity))
  })
  after(async () => { await neo4j?.close(); if (dataSource?.isInitialized) await dataSource.destroy() })

  it('versions incremental updates, traverses, snapshots, diffs, and calculates statistics', async () => {
    const first = await graph.apply({ source: 'integration', nodes: [node('a'), node('b'), node('c')], relationships: [relationship('ab', 'a', 'b'), relationship('bc', 'b', 'c')] })
    assert.equal(first.counts.nodesAdded, 3); assert.equal(first.counts.relationshipsAdded, 2)
    const persistedVersion = await neo4j.read('MATCH (n:GraphNode {id:$id}) RETURN n.graphVersion AS version', { id: 'a' })
    assert.equal(persistedVersion.records[0].get('version'), String(first.sequence))
    const snapshotOne = await graph.createSnapshot('before')
    assert.equal((await graph.shortestPath('a', 'c'))?.depth, 2)
    const radius = await graph.blastRadius('a', 3); assert.equal(radius.affected, 2); assert.equal(radius.nodes[0].depth, 1)

    const second = await graph.apply({ source: 'integration', nodes: [{ ...node('b'), displayName: 'Updated b' }, node('d')], relationships: [relationship('bd', 'b', 'd')], deleteNodeIds: ['c'], deleteRelationshipIds: ['bc'] })
    assert.ok(BigInt(second.sequence) > BigInt(first.sequence))
    const snapshotTwo = await graph.createSnapshot('after'), diff = await graph.diff(snapshotOne.id, snapshotTwo.id)
    assert.deepEqual(diff.nodes.added, ['d']); assert.deepEqual(diff.nodes.removed, ['c']); assert.ok(diff.nodes.updated.includes('b'))
    const stats = await graph.statistics(); assert.equal(stats.nodeCount, 3); assert.equal(stats.relationshipCount, 2)
  })
})

function node(id: string) { return { id, displayName: id, nodeType: 'USER', sourceSystem: 'TEST', sourceId: id, properties: {} } }
function relationship(id: string, source: string, target: string) { return { id, source, target, relationshipType: 'MEMBER_OF', sourceSystem: 'TEST', properties: {} } }
