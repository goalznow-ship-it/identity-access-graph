import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { XCircle, RefreshCw, UploadCloud, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import {
  FileDropzone, UploadedFileList, WorkbookInspector, ColumnMappingEditor,
  ValidationSummary, ValidationIssueList, NormalizedPreview,
  IdentityCorrelationSummary, CorrelationGroupCard, CorrelationConflictList,
  GraphConversionSummary, ImportGraphPreview, UnresolvedReferenceList,
  ImportLimitsPanel,
  ImportWorkflowStepper, ImportSessionHeader, PersistImportPanel, ImportComplete,
  isStepAccessible, getNextStep,
} from '../components/imports'
import type { WorkflowStepId } from '../components/imports/ImportWorkflowStepper'
import { useFileImport } from '../hooks/useFileImport'
import { useColumnMapping } from '../hooks/useColumnMapping'
import { useImportValidation } from '../hooks/useImportValidation'
import { useIdentityCorrelation } from '../hooks/useIdentityCorrelation'
import { useGraphConversion } from '../hooks/useGraphConversion'
import { getSession } from '../services/importApi'
import type { ImportFile, SheetInfo, ValidationResult, NormalizedRecord, ImportPersistenceSummary } from '../types/import'

const LS_IMPORT_KEY = 'iag-active-import'

const STEP_KEYS: Record<string, WorkflowStepId> = {
  upload: 'upload',
  inspect: 'inspect',
  map: 'map',
  validate: 'validate',
  correlate: 'correlate',
  graphPreview: 'graphPreview',
  persist: 'persist',
  complete: 'complete',
}

function readStoredImport(): { importId: string; step?: WorkflowStepId } | null {
  try {
    const value = localStorage.getItem(LS_IMPORT_KEY)
    if (!value) return null
    if (!value.startsWith('{')) return { importId: value }
    return JSON.parse(value)
  } catch { return null }
}

function persistImportState(importId: string, step: WorkflowStepId) {
  try { localStorage.setItem(LS_IMPORT_KEY, JSON.stringify({ importId, step })) } catch {}
}

function clearStoredImportId() {
  try { localStorage.removeItem(LS_IMPORT_KEY) } catch {}
}

export function ImportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlStep = searchParams.get('step') as WorkflowStepId | null
  const urlImportId = searchParams.get('importId')
  const [storedImport] = useState(readStoredImport)
  const restoreImportId = urlImportId ?? storedImport?.importId ?? null

  const [effectiveStep, setEffectiveStep] = useState<WorkflowStepId>(() => {
    if (urlStep && STEP_KEYS[urlStep]) return urlStep
    if (!urlImportId && storedImport?.step && STEP_KEYS[storedImport.step]) return storedImport.step
    return 'upload'
  })

  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStepId>>(new Set())
  const [persistenceSummary, setPersistenceSummary] = useState<ImportPersistenceSummary | null>(null)

  const {
    pendingFiles, session, uploading, error, limits, progress, cancelling, retrying,
    addFiles, removeFile, clearFiles, upload, classify, cancel, retry, removeSessionFile, setSession, setError,
  } = useFileImport()

  const [selectedFile, setSelectedFile] = useState<ImportFile | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<SheetInfo | null>(null)
  const [sheetIndex, setSheetIndex] = useState<number>(0)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [normalizedRecords, setNormalizedRecords] = useState<NormalizedRecord[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [validationFilter, setValidationFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'critical'>('all')

  const columnMapping = useColumnMapping({
    importId: session?.importId ?? '',
    fileId: selectedFile?.id ?? '',
    sheetIndex,
    session,
  })

  const validation = useImportValidation()
  const correlation = useIdentityCorrelation()
  const conversion = useGraphConversion()

  useEffect(() => {
    if (urlStep && STEP_KEYS[urlStep] && urlStep !== effectiveStep) {
      setEffectiveStep(urlStep)
    }
  }, [urlStep])

  useEffect(() => {
    if (effectiveStep !== 'upload') {
      setSearchParams((current) => { current.set('step', effectiveStep); return current }, { replace: true })
    } else if (urlImportId) {
      setSearchParams((current) => { current.delete('step'); current.delete('importId'); return current }, { replace: true })
    }
  }, [effectiveStep, setSearchParams])

  useEffect(() => {
    if (session?.importId) {
      persistImportState(session.importId, effectiveStep)
      if (!urlImportId) {
        setSearchParams((prev) => { prev.set('importId', session.importId); prev.set('step', effectiveStep); return prev }, { replace: true })
      }
    }
  }, [session?.importId])

  useEffect(() => {
    if (session?.importId) persistImportState(session.importId, effectiveStep)
  }, [session?.importId, effectiveStep])

  useEffect(() => {
    if (!session && restoreImportId && !loadingSession) {
      setLoadingSession(true)
      setSessionError(null)
      getSession(restoreImportId)
        .then((sess) => {
          setSession(sess)
          if (sess.files.length > 0) {
            const first = sess.files[0]
            setSelectedFile(first)
            setSelectedSheet(first.sheets[0] ?? null)
            setSheetIndex(0)
          }
          setEffectiveStep(() => {
            if (urlStep && STEP_KEYS[urlStep]) return urlStep
            if (storedImport?.step && STEP_KEYS[storedImport.step]) return storedImport.step
            return 'inspect'
          })
          const restoredStep = urlStep ?? storedImport?.step ?? 'inspect'
          const order: WorkflowStepId[] = ['upload', 'inspect', 'map', 'validate', 'correlate', 'graphPreview', 'persist', 'complete']
          setCompletedSteps(new Set(order.slice(0, Math.max(1, order.indexOf(restoredStep)))))
          setSearchParams({ importId: sess.importId, step: restoredStep }, { replace: true })
        })
        .catch(() => {
          setSessionError('Could not recover previous import session. Please start a new import.')
          clearStoredImportId()
        })
        .finally(() => setLoadingSession(false))
    }
  }, [])

  const updateStepAndUrl = useCallback((step: WorkflowStepId) => {
    setCompletedSteps((prev) => new Set(prev).add(effectiveStep))
    setEffectiveStep(step)
    setSearchParams((prev) => { prev.set('step', step); return prev }, { replace: true })
  }, [effectiveStep, setSearchParams])

  const goToNextStep = useCallback(() => {
    const next = getNextStep(effectiveStep)
    if (next) updateStepAndUrl(next)
  }, [effectiveStep, updateStepAndUrl])

  useEffect(() => {
    if (!session?.importId || loadingSession) return
    let cancelled = false

    const restoreWorkflowArtifacts = async () => {
      try {
        const validations = await validation.fetchValidationResults(session.importId)
        if (!cancelled && selectedFile) {
          const current = validations.find((item) => item.fileId === selectedFile.id && item.sheetIndex === sheetIndex)
          if (current) setValidationResult(current)
        }
      } catch {}

      try { await correlation.restore(session.importId) } catch {}
      try { await conversion.restore(session.importId) } catch {}
    }

    void restoreWorkflowArtifacts()
    return () => { cancelled = true }
  }, [session?.importId, loadingSession, selectedFile?.id, sheetIndex])

  useEffect(() => {
    if (session?.files.some((file) => file.sheets.length > 0) && effectiveStep === 'upload' && !loadingSession) {
      const first = session.files[0]
      setSelectedFile(first)
      setSelectedSheet(first.sheets[0] ?? null)
      setSheetIndex(0)
      updateStepAndUrl('inspect')
    }
  }, [session?.importId, effectiveStep, loadingSession, updateStepAndUrl])

  const handleFileSelect = useCallback((file: ImportFile, index = 0) => {
    setSelectedFile(file)
    setSelectedSheet(file.sheets[index] || null)
    setSheetIndex(index)
    updateStepAndUrl('inspect')
  }, [updateStepAndUrl])

  useEffect(() => {
    if (effectiveStep === 'map' && selectedFile && selectedSheet) {
      void columnMapping.fetchMappings()
    }
  }, [effectiveStep, selectedFile?.id, sheetIndex])

  const handleClassify = useCallback(async (fileId: string, sheetIdx: number, type: import('../types/import').DatasetType) => {
    await classify(fileId, sheetIdx, type)
    const file = session?.files.find((f) => f.id === fileId)
    if (file) {
      const sheet = file.sheets[sheetIdx]
      if (sheet) {
        setSelectedFile(file)
        setSelectedSheet(sheet)
        setSheetIndex(sheetIdx)
      }
    }
  }, [classify, session])

  const handleValidate = useCallback(async () => {
    if (!session || !selectedFile) return
    try {
      await columnMapping.apply()
      const result = await validation.validate(session.importId, { fileId: selectedFile.id, sheetIndex })
      setValidationResult(result)
      updateStepAndUrl('validate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    }
  }, [session, selectedFile, sheetIndex, columnMapping, validation, updateStepAndUrl, setError])

  const handlePreview = useCallback(async () => {
    if (!session) return
    try {
      const preview = await validation.fetchNormalizedPreview(session.importId)
      const sheetPreview = preview.find((p) => p.fileId === selectedFile?.id && p.sheetIndex === sheetIndex)
      if (sheetPreview) {
        setNormalizedRecords(sheetPreview.records)
        updateStepAndUrl('correlate')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preview')
    }
  }, [session, selectedFile, sheetIndex, validation, updateStepAndUrl, setError])

  const downloadValidationReport = useCallback((format: 'json' | 'csv') => {
    if (!validationResult) return
    const content = format === 'json'
      ? JSON.stringify(validationResult, null, 2)
      : ['severity,code,file,sheet,row,sourceColumn,targetField,message', ...validationResult.issues.map((issue) => [issue.severity, issue.code, issue.file, issue.sheet, issue.row, issue.sourceColumn, issue.targetField, issue.message].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `import-${session?.importId}-validation.${format}`; anchor.click(); URL.revokeObjectURL(url)
  }, [session?.importId, validationResult])

  const handleCorrelation = useCallback(async () => {
    if (!session) return
    try {
      await correlation.correlate(session.importId)
      updateStepAndUrl('graphPreview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Correlation failed')
    }
  }, [session, correlation, updateStepAndUrl, setError])

  const handleConversion = useCallback(async () => {
    if (!session) return
    try {
      await conversion.convert(session.importId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Graph conversion failed')
    }
  }, [session, conversion, updateStepAndUrl, setError])

  const handlePersisted = useCallback((summary: ImportPersistenceSummary) => {
    setPersistenceSummary(summary)
    updateStepAndUrl('complete')
  }, [updateStepAndUrl])

  const handleNewImport = useCallback(() => {
    clearStoredImportId()
    clearFiles()
    setSelectedFile(null)
    setSelectedSheet(null)
    setValidationResult(null)
    setNormalizedRecords([])
    setPersistenceSummary(null)
    setCompletedSteps(new Set())
    setEffectiveStep('upload')
    setSearchParams({}, { replace: true })
  }, [clearFiles, setSearchParams])

  useEffect(() => {
    const completed = new Set<WorkflowStepId>()
    if (session?.files.length) completed.add('upload')
    if (selectedFile) completed.add('inspect')
    if (columnMapping.mappings.length > 0) completed.add('map')
    if (validationResult) completed.add('validate')
    if (correlation.result) completed.add('correlate')
    if (conversion.result) completed.add('graphPreview')
    if (persistenceSummary) { completed.add('persist'); completed.add('complete') }
    setCompletedSteps((previous) => new Set([...previous, ...completed]))
  }, [session?.files.length, selectedFile?.id, columnMapping.mappings.length, validationResult, correlation.result, conversion.result, persistenceSummary])

  const blockedReason = (() => {
    if (effectiveStep === 'inspect' && !selectedFile) return 'Select a file to inspect'
    if (effectiveStep === 'map' && !selectedFile) return 'Select a file to map columns'
    if (effectiveStep === 'validate' && !validationResult) return 'Run validation first'
    if (effectiveStep === 'correlate' && !correlation.result) return 'Run correlation first'
    if (effectiveStep === 'graphPreview' && !correlation.result) return 'Run correlation first'
    if (effectiveStep === 'persist' && !conversion.result) return 'Run graph conversion first'
    return null
  })()

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Import Data</h1>
          <p className="text-sm text-gray-500">
            Upload Excel, CSV or JSON files to import identities, groups, applications, and infrastructure data.
          </p>
        </div>
        {limits && <ImportLimitsPanel limits={limits} />}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-200">Dismiss</button>
        </div>
      )}

      {sessionError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-300">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{sessionError}</span>
          <button onClick={() => { setSessionError(null); clearStoredImportId() }} className="shrink-0 text-yellow-400 hover:text-yellow-200">Start fresh</button>
        </div>
      )}

      {loadingSession && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-400">Restoring previous import session...</span>
        </div>
      )}

      {progress && (
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-300 capitalize">File processing: {progress.status}</span>
            <span className="text-gray-400">{progress.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-700">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Rows: {progress.rowsProcessed.toLocaleString()}{progress.totalRows > 0 ? ` / ${progress.totalRows.toLocaleString()}` : ''}</span>
            {progress.throughput > 0 && <span>{(progress.throughput / 1000).toFixed(1)}K rows/s</span>}
            {progress.estimatedRemainingMs > 0 && <span>~{Math.ceil(progress.estimatedRemainingMs / 1000)}s remaining</span>}
          </div>
          {progress.truncated && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <span>Truncated: {progress.truncationReason || 'Row limit reached'}</span>
            </div>
          )}
          {progress.warnings.length > 0 && (
            <div className="max-h-16 overflow-y-auto text-xs text-yellow-400">
              {progress.warnings.map((w, i) => <div key={i}>{w}</div>)}
            </div>
          )}
          {progress.status !== 'cancelled' && progress.status !== 'completed' && (
            <button
              onClick={cancel}
              disabled={cancelling}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
            >
              <XCircle className="h-3 w-3" />
              {cancelling ? 'Cancelling...' : 'Cancel import'}
            </button>
          )}
        </div>
      )}

      {!session && !loadingSession && effectiveStep === 'upload' && (
        <div className="space-y-4">
          <FileDropzone onFilesSelected={addFiles} disabled={uploading} maxFileSizeMb={limits?.maxFileSizeMb} previewRows={limits?.previewRows} />

          {pendingFiles.length > 0 && (
            <>
              <UploadedFileList files={pendingFiles} onRemove={removeFile} />

              <div className="flex items-center gap-3">
                <Button onClick={upload} disabled={uploading} className="inline-flex items-center gap-2">
                  {uploading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file(s)`}
                </Button>
                <button
                  onClick={clearFiles}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {session && !loadingSession && (
        <div className="space-y-4 flex-1 overflow-y-auto">
          <ImportSessionHeader
            importId={session.importId}
            fileCount={session.files.length}
            onNewImport={handleNewImport}
          />

          {effectiveStep !== 'upload' && (
            <ImportWorkflowStepper
              currentStep={effectiveStep}
              completedSteps={completedSteps}
              blockedReason={blockedReason ?? undefined}
              onStepClick={(step) => {
                if (isStepAccessible(effectiveStep, step, completedSteps)) {
                  setEffectiveStep(step)
                  setSearchParams((prev) => { prev.set('step', step); return prev }, { replace: true })
                }
              }}
            />
          )}

          {effectiveStep === 'upload' && (
            <div className="space-y-4">
              <FileDropzone onFilesSelected={addFiles} disabled={uploading} maxFileSizeMb={limits?.maxFileSizeMb} previewRows={limits?.previewRows} />

              {pendingFiles.length > 0 && (
                <>
                  <UploadedFileList files={pendingFiles} onRemove={removeFile} />

                  <div className="flex items-center gap-3">
                    <Button onClick={upload} disabled={uploading} className="inline-flex items-center gap-2">
                      {uploading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file(s)`}
                    </Button>
                    <button
                      onClick={clearFiles}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Clear all
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {effectiveStep === 'inspect' && (
            <div className="space-y-4">
              <UploadedFileList
                files={[]}
                onRemove={() => {}}
                sessionFiles={session.files}
                onRetry={retry}
                onRemoveSessionFile={removeSessionFile}
                retrying={retrying}
              />
              {session.files.map((file) => (
                <WorkbookInspector
                  key={file.id}
                  file={file}
                  onClassify={handleClassify}
                  onSelect={handleFileSelect}
                />
              ))}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => updateStepAndUrl('upload')}>Back to Upload</Button>
                <Button
                  onClick={() => {
                    if (selectedFile && selectedSheet) {
                      updateStepAndUrl('map')
                    }
                  }}
                  disabled={!selectedFile}
                >
                  Next: Map Columns
                </Button>
              </div>
            </div>
          )}

          {effectiveStep === 'map' && selectedFile && selectedSheet && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-sm text-gray-300">{selectedFile.originalName}</span>
                </div>
                <Badge variant="outline">{selectedSheet.classification}</Badge>
                <Badge variant="secondary">{selectedSheet.rowCount} rows</Badge>
              </div>

              <ColumnMappingEditor
                mappings={columnMapping.mappings}
                targetFields={[]}
                onMappingsChange={columnMapping.setMappings}
                onValidate={handleValidate}
                onApply={columnMapping.apply}
                onAutoMap={columnMapping.autoMap}
                onReset={columnMapping.reset}
                requiredFields={columnMapping.mappings.filter((m) => m.required).map((m) => m.sourceColumn)}
              />

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => updateStepAndUrl('inspect')}>Back to Inspect</Button>
              </div>
            </div>
          )}

          {effectiveStep === 'validate' && selectedFile && (
            <div className="space-y-4">
              {validationResult && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                      <span className="font-mono text-sm text-gray-300">{selectedFile.originalName}</span>
                    </div>
                    <Badge variant="outline">{selectedSheet?.classification}</Badge>
                  </div>

                  <ValidationSummary summary={validationResult.summary} />

                  <ValidationIssueList
                    issues={validationResult.issues}
                    filter={validationFilter}
                    onFilterChange={setValidationFilter}
                  />
                  <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => downloadValidationReport('json')}>Export JSON</Button><Button size="sm" variant="ghost" onClick={() => downloadValidationReport('csv')}>Export CSV</Button></div>
                </>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => updateStepAndUrl('map')}>Back to Mapping</Button>
                <Button onClick={handlePreview} disabled={validation.loading || Boolean(validationResult && (validationResult.summary.error > 0 || validationResult.summary.critical > 0))}>
                  {validation.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  {validation.loading ? 'Loading...' : 'Continue to Preview'}
                </Button>
              </div>
            </div>
          )}

          {effectiveStep === 'correlate' && (
            <div className="space-y-4">
              {normalizedRecords.length > 0 && (
                <NormalizedPreview records={normalizedRecords} />
              )}

              {correlation.result ? (
                <>
                  <IdentityCorrelationSummary result={correlation.result} />
                  <CorrelationConflictList groups={correlation.result.groups} />
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {correlation.result.groups.slice(0, 50).map((group) => (
                      <CorrelationGroupCard key={group.canonicalIdentityId} group={group} />
                    ))}
                  </div>
                </>
              ) : correlation.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-gray-400">Running identity correlation...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  Click "Correlate Identities" to match records against existing identities.
                </div>
              )}

              <div className="flex gap-2">
                {correlation.result ? (
                  <>
                    <Button variant="ghost" onClick={() => updateStepAndUrl('validate')}>Back to Validation</Button>
                    <Button onClick={() => updateStepAndUrl('graphPreview')}>Next: Build Graph</Button>
                  </>
                ) : (
                  <Button onClick={handleCorrelation} disabled={correlation.loading}>
                    {correlation.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    {correlation.loading ? 'Correlating...' : 'Correlate Identities'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {effectiveStep === 'graphPreview' && (
            <div className="space-y-4">
              {conversion.result ? (
                <>
                  <GraphConversionSummary result={conversion.result} />
                  <ImportGraphPreview preview={conversion.result.preview} />
                  <UnresolvedReferenceList items={conversion.result.unresolvedReferences} />
                </>
              ) : conversion.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-gray-400">Building graph preview...</span>
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-gray-300">Correlation is complete. Build the graph preview to continue.</p>
                  <Button onClick={handleConversion} disabled={conversion.loading || !correlation.result}>
                    {conversion.loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                    {conversion.loading ? 'Building graph...' : 'Build Graph Preview'}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => updateStepAndUrl('correlate')}>Back to Correlation</Button>
                <Button onClick={goToNextStep} disabled={!conversion.result}>
                  Next: Persist to Graph
                </Button>
              </div>
            </div>
          )}

          {effectiveStep === 'persist' && (
            <div className="space-y-4">
              <PersistImportPanel
                importId={session.importId}
                onPersisted={handlePersisted}
              />

              {!persistenceSummary && (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => updateStepAndUrl('graphPreview')}>Back to Graph Preview</Button>
                </div>
              )}
            </div>
          )}

          {effectiveStep === 'complete' && (
            <ImportComplete
              importId={session.importId}
              persistenceSummary={persistenceSummary}
              session={session}
              correlation={correlation.result}
              conversion={conversion.result}
              onNewImport={handleNewImport}
            />
          )}
        </div>
      )}
    </div>
  )
}
