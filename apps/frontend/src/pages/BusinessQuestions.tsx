import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchBox } from '../components/ui/SearchBox'
import { EmptyState } from '../components/ui/EmptyState'
import { QuestionResultView } from '../components/business-questions'
import { questionCatalog, getCategories } from '../services/businessQuestionCatalog'
import { executeQuestion, getSuggestions, setBusinessQuestionGraphData } from '../services/businessQuestionEngine'
import { useGraphSource } from '../hooks/useGraphSource'
import { useGraphData } from '../hooks/useGraphData'
import type { BusinessQuestion, QuestionResult, QuestionCategory } from '../types/businessQuestions'
import {
  HelpCircle, Server, Shield, Users, Key, AlertTriangle,
  Activity, Wallet, Bot, UserX, GitMerge, Skull, Building2,
  AppWindow, GitBranch, Monitor, BarChart3, Terminal,
} from 'lucide-react'

const iconMap: Record<string, any> = {
  Server, Shield, Users, Key, AlertTriangle, Activity, Wallet,
  Bot, UserX, GitMerge, Skull, Building2, AppWindow, GitBranch,
  Monitor, BarChart3, Terminal, HelpCircle,
}

const categoryIcons: Record<QuestionCategory, any> = {
  Identity: Users,
  Access: Shield,
  Privilege: Key,
  Infrastructure: Server,
  'Business Impact': Building2,
  Linux: Terminal,
  Risk: AlertTriangle,
}

function CategoryBadge({ category }: { category: QuestionCategory }) {
  const Icon = categoryIcons[category]
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
      {Icon && <Icon className="h-3 w-3" />}
      {category}
    </span>
  )
}

export function BusinessQuestionsPage() {
  const { source } = useGraphSource()
  const importId = typeof localStorage === 'undefined' ? null : localStorage.getItem('lastImportId')
  const graph = useGraphData(source === 'imported' ? importId : null, source)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<QuestionCategory | 'All'>('All')
  const [selectedQuestion, setSelectedQuestion] = useState<BusinessQuestion | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputSuggestions, setInputSuggestions] = useState<{ id: string; label: string; type: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [result, setResult] = useState<QuestionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!graph.data) return
    setBusinessQuestionGraphData(graph.data)
    setResult(null)
    setInputSuggestions([])
  }, [graph.data])

  const categories = ['All' as const, ...getCategories()]

  const filteredQuestions = questionCatalog.filter((q) => {
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase()) || q.category.toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'All' || q.category === activeCategory
    return matchSearch && matchCategory
  })

  const handleSelectQuestion = useCallback((question: BusinessQuestion) => {
    setSelectedQuestion(question)
    setResult(null)
    setError(null)
    setInputValue('')

    if (!graph.data) {
      setError(graph.error || 'The selected graph dataset is not available.')
    } else if (question.requiresInput) {
      const suggestions = getSuggestions(question.inputType || 'text')
      setInputSuggestions(suggestions)
    } else {
      executeQuestionAndShow(question.id)
    }
  }, [graph.data, graph.error])

  const executeQuestionAndShow = useCallback((questionId: string, input?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      if (!graph.data) throw new Error(graph.error || 'The selected graph dataset is not available.')
      setResult(executeQuestion(questionId, input))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query execution failed')
    } finally {
      setLoading(false)
    }
  }, [graph.data, graph.error])

  const handleExecute = useCallback(() => {
    if (!selectedQuestion) return
    if (selectedQuestion.requiresInput && !inputValue) return
    executeQuestionAndShow(selectedQuestion.id, inputValue || undefined)
  }, [selectedQuestion, inputValue, executeQuestionAndShow])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    if (value.length > 0) {
      const filtered = inputSuggestions.filter((s) =>
        s.label.toLowerCase().includes(value.toLowerCase()),
      )
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [inputSuggestions])

  const handleSuggestionClick = useCallback((suggestion: { id: string; label: string }) => {
    setInputValue(suggestion.id)
    setShowSuggestions(false)
  }, [])

  const exportJson = useCallback(() => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${result.questionId}.json`; a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const exportCsv = useCallback(() => {
    if (!result) return
    let rows: string[][] = []
    if (result.rawData.length > 0) {
      const keys = Object.keys(result.rawData[0])
      rows = [keys, ...result.rawData.map((r) => keys.map((k) => String(r[k] || '')))]
    } else if (result.affectedIdentities.length > 0) {
      rows = [['id', 'name', 'type'], ...result.affectedIdentities.map((e) => [e.id, e.name, e.type])]
    } else {
      rows = [['stat', 'value'], ...result.statistics.map((s) => [s.label, String(s.value)])]
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${result.questionId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [result])

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Business Questions Engine</h1>
          <p className="text-sm text-gray-500">Answer enterprise IAM questions against {source === 'neo4j' ? 'Neo4j Live' : 'the active import'}.</p>
        </div>
        {result && (
          <div className="flex gap-2">
            <button onClick={exportJson} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-card/80">Export JSON</button>
            <button onClick={exportCsv} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-card/80">Export CSV</button>
          </div>
        )}
      </div>

      {graph.loading && <div className="mb-3 h-10 animate-pulse rounded bg-white/5" aria-label="Loading analytics graph" />}
      {graph.error && <div role="alert" className="mb-3 rounded border border-danger/40 p-3 text-xs text-danger">{graph.error}<button onClick={() => void graph.retry()} className="ml-3 underline">Retry</button></div>}

      <div className="flex gap-4 min-h-0 flex-1">
        <div className="flex w-80 shrink-0 flex-col">
          <div className="mb-3">
            <SearchBox
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat ? 'bg-primary-muted text-primary' : 'bg-card text-gray-400 hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {filteredQuestions.map((q) => {
              const Icon = iconMap[q.icon] || HelpCircle
              const isSelected = selectedQuestion?.id === q.id
              return (
                <motion.button
                  key={q.id}
                  layout
                  onClick={() => handleSelectQuestion(q)}
                  className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                    isSelected ? 'border-primary/50 bg-primary-muted/30' : 'border-border bg-card hover:border-primary/20 hover:bg-card/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-100'}`}>{q.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{q.description}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <CategoryBadge category={q.category} />
                        {q.requiresInput && <span className="text-[10px] text-gray-600">requires input</span>}
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
            {filteredQuestions.length === 0 && (
              <EmptyState title="No questions found" description="Try adjusting your search." />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {!selectedQuestion ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={<HelpCircle className="h-12 w-12" />}
                title="Select a question"
                description="Choose a question from the catalog to run an analysis."
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {selectedQuestion.requiresInput && (
                <div className="mb-3 shrink-0 rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-200">{selectedQuestion.inputLabel}</h3>
                  <div className="relative">
                    <input
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={selectedQuestion.inputPlaceholder}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      onFocus={() => setShowSuggestions(inputSuggestions.length > 0 && inputValue.length > 0)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg"
                        >
                          {inputSuggestions.filter((s) => s.label.toLowerCase().includes(inputValue.toLowerCase())).map((s) => (
                            <button
                              key={s.id}
                              onMouseDown={() => handleSuggestionClick(s)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5"
                            >
                              <span className="font-medium text-gray-100">{s.id}</span>
                              <span className="text-gray-500">{s.type}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={handleExecute}
                    disabled={!inputValue}
                    className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Execute
                  </button>
                </div>
              )}

              {!selectedQuestion.requiresInput && (
                <div className="mb-3 shrink-0">
                  <button
                    onClick={() => executeQuestionAndShow(selectedQuestion.id)}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/80"
                  >
                    Run Analysis
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {error && (
                  <div className="rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-300">{error}</div>
                )}
                <QuestionResultView result={result} loading={loading} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
