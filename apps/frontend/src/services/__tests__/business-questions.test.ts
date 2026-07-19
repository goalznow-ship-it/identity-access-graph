import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { questionCatalog } from '../businessQuestionCatalog'
import { executeQuestion, getSuggestions, setBusinessQuestionGraphData } from '../businessQuestionEngine'

describe('business question data source', () => {
  it('executes every published catalog question', () => {
    setBusinessQuestionGraphData({ nodes: [], links: [] })
    for (const question of questionCatalog) {
      const result = executeQuestion(question.id, question.requiresInput ? 'missing' : undefined)
      assert.equal(result.questionId, question.id)
      assert.notEqual(result.title, 'Unknown question')
    }
  })

  it('refreshes suggestions and cached results when the active graph changes', () => {
    setBusinessQuestionGraphData({ nodes: [{ id: 'host-a', displayName: 'Host A', nodeType: 'HOST', sourceSystem: 'LINUX', riskLevel: 'LOW', properties: {} }], links: [] })
    assert.deepEqual(getSuggestions('host').map((item) => item.id), ['host-a'])
    setBusinessQuestionGraphData({ nodes: [{ id: 'host-b', displayName: 'Host B', nodeType: 'HOST', sourceSystem: 'LINUX', riskLevel: 'LOW', properties: {} }], links: [] })
    assert.deepEqual(getSuggestions('host').map((item) => item.id), ['host-b'])
  })
})
