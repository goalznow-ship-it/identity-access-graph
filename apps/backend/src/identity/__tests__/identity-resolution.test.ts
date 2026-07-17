import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import { IdentityResolutionService } from '../identity-resolution.service'
import { CONFIDENCE_THRESHOLD, toConfidenceLevel } from '../identity.types'

function freshService(): IdentityResolutionService {
  return new IdentityResolutionService()
}

describe('IdentityResolutionService', () => {
  describe('findCandidate', () => {
    it('should find candidate by employeeId with score 100', () => {
      const service = freshService()
      const props = { employeeId: 'CAND-EMP-001', email: 'alice@test.com' }
      const candidates = service.findCandidate(props, 'ACTIVE_DIRECTORY', 'node-1', 'Alice', [])
      assert.ok(candidates.length > 0)
      const best = candidates[0]
      assert.equal(best.confidence, 100)
      assert.equal(best.method, 'employeeID')
      assert.equal(best.matchedValue, 'CAND-EMP-001')
    })

    it('should find candidate by objectGUID with score 95', () => {
      const service = freshService()
      const props = { objectGUID: '550e8400-e29b-41d4-a716-446655440000', displayName: 'Bob' }
      const candidates = service.findCandidate(props, 'ENTRA_ID', 'node-2', 'Bob', [])
      assert.ok(candidates.length > 0)
      const guid = candidates.find((c) => c.method === 'objectGUID')
      assert.ok(guid)
      assert.equal(guid!.confidence, 95)
    })

    it('should find candidate by email with score 85', () => {
      const service = freshService()
      const props = { email: 'carol@test.com' }
      const candidates = service.findCandidate(props, 'FREE_IPA', 'node-3', 'Carol', [])
      assert.ok(candidates.length > 0)
      const email = candidates.find((c) => c.method === 'email')
      assert.ok(email)
      assert.equal(email!.confidence, 85)
    })

    it('should prioritize higher confidence over lower', () => {
      const service = freshService()
      const props = { employeeId: 'CAND-EMP-004', email: 'dave@test.com', username: 'dave' }
      const candidates = service.findCandidate(props, 'LINUX', 'node-4', 'Dave', [])
      assert.ok(candidates.length >= 3)
      assert.equal(candidates[0].confidence, 100)
      assert.equal(candidates[0].method, 'employeeID')
    })

    it('should include displayName candidates (score 60 < 70 threshold)', () => {
      const service = freshService()
      const props = { displayName: 'Eve' }
      const candidates = service.findCandidate(props, 'CUSTOM', 'node-5', 'Eve', [])
      const displayNameMatch = candidates.find((c) => c.method === 'displayName')
      assert.ok(displayNameMatch)
      assert.equal(displayNameMatch!.confidence, 60)
      assert.ok(displayNameMatch!.confidence < CONFIDENCE_THRESHOLD)
    })
  })

  describe('score', () => {
    it('should return score for matching employeeId', async () => {
      const service = freshService()
      const node = { id: 'SCORE-1', displayName: 'Alice', properties: { employeeId: 'SCORE-EMP-001', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node, undefined)
      const result = service.score(node, identity)
      assert.ok(result)
      assert.equal(result!.score, 100)
    })
  })

  describe('computeConfidence', () => {
    it('should return 100 for employeeId match', () => {
      const service = freshService()
      assert.equal(service.computeConfidence(['employeeId']), 100)
    })

    it('should return 95 for objectGUID', () => {
      const service = freshService()
      assert.equal(service.computeConfidence(['objectGUID']), 95)
    })

    it('should return 85 for email', () => {
      const service = freshService()
      assert.equal(service.computeConfidence(['email']), 85)
    })

    it('should return 0 for empty fields', () => {
      const service = freshService()
      assert.equal(service.computeConfidence([]), 0)
    })
  })

  describe('merge', () => {
    it('should create a new enterprise identity from a node', async () => {
      const service = freshService()
      const node = { id: 'MRG-N1', displayName: 'Alice', properties: { employeeId: 'MRG-EMP-001', email: 'alice@test.com', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node, undefined)
      assert.ok(identity)
      assert.equal(identity.displayName, 'Alice')
      assert.equal(identity.mergedSources.length, 1)
      assert.equal(identity.mergedSources[0].source, 'ACTIVE_DIRECTORY')
      assert.equal(identity.statistics.totalSources, 1)
    })

    it('should merge matching nodes into the same identity', async () => {
      const service = freshService()
      const node1 = { id: 'MRG-AD1', displayName: 'Bob', properties: { employeeId: 'MRG-EMP-002', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node1, undefined)
      assert.equal(identity.mergedSources.length, 1)

      const node2 = { id: 'MRG-E1', displayName: 'Bob Smith', properties: { employeeId: 'MRG-EMP-002', email: 'bob@test.com', sourceSystem: 'ENTRA_ID' } }
      const merged = await service.merge(node2, identity)
      assert.equal(merged.mergedSources.length, 2)
      assert.equal(merged.confidence, 100)
    })

    it('should not merge identities below confidence threshold', async () => {
      const service = freshService()
      const node1 = { id: 'MRG-IPA1', displayName: 'Carol', properties: { username: 'carol', sourceSystem: 'FREE_IPA' } }
      const identity = await service.merge(node1, undefined)
      assert.equal(identity.mergedSources.length, 1)

      const node2 = { id: 'MRG-L1', displayName: 'Carol Admin', properties: { displayName: 'Carol Admin', sourceSystem: 'LINUX' } }
      const merged = await service.merge(node2, identity)
      assert.equal(merged.mergedSources.length, 1)
    })

    it('should detect conflicts between sources', async () => {
      const service = freshService()
      const node1 = { id: 'MRG-AD2', displayName: 'Dave', properties: { employeeId: 'MRG-EMP-003', email: 'dave@ad.com', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node1, undefined)

      const node2 = { id: 'MRG-E2', displayName: 'Dave', properties: { employeeId: 'MRG-EMP-003', email: 'dave@entra.com', sourceSystem: 'ENTRA_ID' } }
      const merged = await service.merge(node2, identity)
      const emailConflict = merged.conflicts.find((c) => c.field === 'email')
      assert.ok(emailConflict)
    })

    it('should track merge statistics', async () => {
      const service = freshService()
      const node = { id: 'MRG-S1', displayName: 'Eve', properties: { employeeId: 'MRG-EMP-004', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node, undefined)
      assert.equal(identity.statistics.totalSources, 1)
      assert.equal(identity.statistics.matchedFields, 0)
      assert.equal(identity.statistics.confidenceScore, 70)
    })

    it('should add timeline events on merge', async () => {
      const service = freshService()
      const node = { id: 'MRG-TL1', displayName: 'Frank', properties: { employeeId: 'MRG-EMP-005', sourceSystem: 'ACTIVE_DIRECTORY' } }
      const identity = await service.merge(node, undefined)
      assert.equal(identity.timeline.length, 1)
      assert.equal(identity.timeline[0].type, 'source_added')
    })
  })

  describe('correlate', () => {
    it('should return candidates matching threshold', async () => {
      const service = freshService()
      const node1 = { id: 'CORR-1', displayName: 'Grace', properties: { employeeId: 'CORR-EMP-010', sourceSystem: 'ACTIVE_DIRECTORY' } }
      await service.merge(node1, undefined)

      const result = await service.correlate({ threshold: 90 }, [
        { id: 'CORR-2', displayName: 'Grace', properties: { employeeId: 'CORR-EMP-010', email: 'grace@test.com', sourceSystem: 'ENTRA_ID' } },
      ])
      assert.ok(result.candidates.length > 0)
      assert.ok(result.candidates[0].confidence >= 90)
    })

    it('should filter by source system', async () => {
      const service = freshService()
      const result = await service.correlate({ sourceSystems: ['LINUX'] }, [
        { id: 'FILTER-1', displayName: 'Test', properties: { email: 'test@test.com', sourceSystem: 'ACTIVE_DIRECTORY' } },
      ])
      assert.equal(result.candidates.length, 0)
    })
  })

  describe('toConfidenceLevel', () => {
    it('should return EXACT for 100', () => assert.equal(toConfidenceLevel(100), 'EXACT'))
    it('should return VERY_HIGH for 95', () => assert.equal(toConfidenceLevel(95), 'VERY_HIGH'))
    it('should return HIGH for 85', () => assert.equal(toConfidenceLevel(85), 'HIGH'))
    it('should return MEDIUM for 75', () => assert.equal(toConfidenceLevel(75), 'MEDIUM'))
    it('should return LOW for 60', () => assert.equal(toConfidenceLevel(60), 'LOW'))
    it('should return NONE for 0', () => assert.equal(toConfidenceLevel(0), 'NONE'))
  })
})
