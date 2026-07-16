import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, UploadCloud, RefreshCw, ChevronRight, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { FileDropzone, UploadedFileList, WorkbookInspector, ColumnMappingEditor, ValidationSummary, ValidationIssueList, NormalizedPreview, IdentityCorrelationSummary, CorrelationGroupCard, CorrelationConflictList, GraphConversionSummary, ImportGraphPreview, UnresolvedReferenceList } from '../components/imports'
import { useFileImport } from '../hooks/useFileImport'
import { useColumnMapping } from '../hooks/useColumnMapping'
import { useImportValidation } from '../hooks/useImportValidation'
import { useIdentityCorrelation } from '../hooks/useIdentityCorrelation'
import { useGraphConversion } from '../hooks/useGraphConversion'
import type { ImportFile, SheetInfo, ValidationResult, NormalizedRecord } from '../types/import'

type ImportStep = 'upload' | 'classify' | 'map' | 'validate' | 'preview' | 'correlate' | 'graphPreview'

export function ImportsPage() {
  const navigate = useNavigate()
  const {
    pendingFiles, session, uploading, error,
    addFiles, removeFile, clearFiles, upload, classify, setError,
  } = useFileImport()

  const [step, setStep] = useState<ImportStep>('upload')
  const [selectedFile, setSelectedFile] = useState<ImportFile | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<SheetInfo | null>(null)
  const [sheetIndex, setSheetIndex] = useState<number>(0)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [normalizedPreview, setNormalizedPreview] = useState<NormalizedRecord[]>([])

  const columnMapping = useColumnMapping({
    importId: session?.importId || '',
    fileId: selectedFile?.id || '',
    sheetIndex,
    session,
  })

  const validation = useImportValidation()
  const correlation = useIdentityCorrelation()
  const conversion = useGraphConversion()

  const handleFileSelect = (file: ImportFile, index = 0) => {
    setSelectedFile(file)
    setSelectedSheet(file.sheets[index] || null)
    setSheetIndex(index)
    setStep('classify')
  }

  useEffect(() => {
    if (step === 'map' && selectedFile && selectedSheet) void columnMapping.fetchMappings()
  }, [step, selectedFile?.id, sheetIndex])

  const handleValidate = async () => {
    if (!session || !selectedFile) return
    try {
      await columnMapping.apply()
      const result = await validation.validate(session.importId, { fileId: selectedFile.id, sheetIndex })
      setValidationResult(result)
      setStep('validate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    }
  }

  const handlePreview = async () => {
    if (!session) return
    try {
      const preview = await validation.fetchNormalizedPreview(session.importId)
      const sheetPreview = preview.find((p) => p.fileId === selectedFile?.id && p.sheetIndex === sheetIndex)
      if (sheetPreview) {
        setNormalizedPreview(sheetPreview.records)
        setStep('preview')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preview')
    }
  }

  const handleCorrelation = async () => {
    if (!session) return
    try { await correlation.correlate(session.importId); setStep('correlate') }
    catch (e) { setError(e instanceof Error ? e.message : 'Correlation failed') }
  }

  const handleConversion = async () => {
    if (!session) return
    try { await conversion.convert(session.importId); setStep('graphPreview') }
    catch (e) { setError(e instanceof Error ? e.message : 'Graph conversion failed') }
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-100">Import Data</h1>
        <p className="text-sm text-gray-500">
          Upload Excel or CSV files to import identities, groups, applications, and infrastructure data.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">Dismiss</button>
        </div>
      )}

      {!session && (
        <div className="space-y-4">
          <FileDropzone onFilesSelected={addFiles} disabled={uploading} />

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

      {session && (
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-200">
                Import Session: <code className="text-primary">{session.importId.substring(0, 8)}...</code>
              </h2>
              <p className="text-xs text-gray-500">
                {session.files.length} file(s) &middot; {step === 'upload' ? 'Upload' : step === 'classify' ? 'Classify' : step === 'map' ? 'Map Columns' : step === 'validate' ? 'Validate' : 'Preview'}
              </p>
            </div>
            <button
              onClick={clearFiles}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            >
              <Upload className="h-3 w-3" />
              New import
            </button>
          </div>

          <div className="flex gap-2 border-b border-border pb-2">
            <button
              className={`px-3 py-1 text-xs rounded ${step === 'classify' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setStep('classify')}
              disabled={!selectedFile}
            >
              1. Classify
            </button>
            <button
              className={`px-3 py-1 text-xs rounded ${step === 'map' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setStep('map')}
              disabled={!selectedFile || step === 'upload'}
            >
              2. Map Columns
            </button>
            <button
              className={`px-3 py-1 text-xs rounded ${step === 'validate' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setStep('validate')}
              disabled={!selectedFile || step === 'upload' || step === 'classify'}
            >
              3. Validate
            </button>
            <button
              className={`px-3 py-1 text-xs rounded ${step === 'preview' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setStep('preview')}
              disabled={!selectedFile || step === 'upload' || step === 'classify' || step === 'map'}
            >
              4. Preview
            </button>
            <button className={`px-3 py-1 text-xs rounded ${step === 'correlate' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setStep('correlate')} disabled={!correlation.result}>5. Correlation</button>
            <button className={`px-3 py-1 text-xs rounded ${step === 'graphPreview' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setStep('graphPreview')} disabled={!conversion.result}>6. Graph Preview</button>
          </div>

          {step === 'classify' && (
            <div className="space-y-4">
              {session.files.map((file) => (
                <WorkbookInspector
                  key={file.id}
                  file={file}
                  onClassify={classify}
                  onSelect={handleFileSelect}
                />
              ))}
            </div>
          )}

          {step === 'map' && selectedFile && selectedSheet && (
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
                requiredFields={columnMapping.mappings.filter((mapping) => mapping.required).map((mapping) => mapping.sourceColumn)}
              />
            </div>
          )}

          {step === 'validate' && selectedFile && validationResult && (
            <div className="space-y-4">
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
                onFilterChange={() => undefined}
              />

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('map')}>
                  Back to Mapping
                </Button>
                <Button onClick={handlePreview} disabled={validation.loading}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  View Preview
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && selectedFile && normalizedPreview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-sm text-gray-300">{selectedFile.originalName}</span>
                </div>
                <Badge variant="outline">{selectedSheet?.classification}</Badge>
              </div>

              <NormalizedPreview records={normalizedPreview} />

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('validate')}>
                  Back to Validation
                </Button>
                <Button onClick={handleCorrelation} disabled={correlation.loading}>Correlate Identities</Button>
              </div>
            </div>
          )}

          {step === 'correlate' && correlation.result && <div className="space-y-4">
            <IdentityCorrelationSummary result={correlation.result} />
            <CorrelationConflictList groups={correlation.result.groups} />
            <div className="max-h-64 space-y-2 overflow-auto">{correlation.result.groups.slice(0, 50).map((group) => <CorrelationGroupCard key={group.canonicalIdentityId} group={group} />)}</div>
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep('preview')}>Back to Preview</Button><Button onClick={handleConversion} disabled={conversion.loading}>Convert to Graph</Button></div>
          </div>}

          {step === 'graphPreview' && conversion.result && <div className="space-y-4">
            <GraphConversionSummary result={conversion.result} />
            <ImportGraphPreview preview={conversion.result.preview} />
            <UnresolvedReferenceList items={conversion.result.unresolvedReferences} />
            <Button onClick={() => session && navigate(`/graph?importId=${session.importId}`)}>Open imported graph in Graph Explorer</Button>
          </div>}
        </div>
      )}
    </div>
  )
}
