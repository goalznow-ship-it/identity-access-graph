import {
  Controller, Post, Put, Get, Delete, HttpCode, HttpException, HttpStatus,
  UseInterceptors, UploadedFiles, Param, Body, Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger'
import { FilesInterceptor } from '@nestjs/platform-express'
import { IMPORT_CONFIG } from './import-config'
import { ImportsService } from './imports.service'
import { MappingService } from './mapping/mapping.service'
import { ValidationService } from './validation/validation.service'
import { generateNormalizedPreview } from './validation/normalized-preview'
import type { ClassifyRequest, ApplyMappingsRequest, ValidateRequest } from './types'
import { IdentityCorrelationService, type CorrelationOptions, type CorrelationRecord } from './correlation'
import { GraphConversionService } from './graph-conversion'
import { deterministicId } from './graph-conversion/deterministic-id'
import { ImportGraphPersistenceService } from './import-graph-persistence.service'

@ApiTags('Imports')
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly service: ImportsService,
    private readonly mappingService: MappingService,
    private readonly validationService: ValidationService,
    private readonly correlationService: IdentityCorrelationService,
    private readonly conversionService: GraphConversionService,
    private readonly persistenceService: ImportGraphPersistenceService,
  ) {}

  @Get('limits')
  @ApiOperation({ summary: 'Get import limits configuration' })
  getLimits() {
    return this.service.getLimits()
  }

  @Post('upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload Excel/CSV/JSON files for import' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Files uploaded and inspected' })
  @UseInterceptors(FilesInterceptor('files', 50))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new HttpException('No files provided.', HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.service.upload(files)
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the most recent import session' })
  getActiveSession() {
    const session = this.service.getLatestSession()
    if (!session) throw new HttpException('No import session is available.', HttpStatus.NOT_FOUND)
    return session
  }

  @Get('active/graph-preview')
  @ApiOperation({ summary: 'Get graph preview for the most recent import session' })
  getActiveGraphPreview(@Query('nodeLimit') nodeLimit?: string, @Query('relationshipLimit') relationshipLimit?: string) {
    const session = this.service.getLatestSession()
    if (!session) throw new HttpException('No import session is available.', HttpStatus.NOT_FOUND)
    return this.getGraphPreview(session.importId, nodeLimit, relationshipLimit)
  }

  @Get(':importId')
  @ApiOperation({ summary: 'Get import session status' })
  @ApiResponse({ status: 200, description: 'Import session data' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getSession(@Param('importId') importId: string) {
    const session = this.service.getSession(importId)
    if (!session) {
      throw new HttpException('Import session not found.', HttpStatus.NOT_FOUND)
    }
    return session
  }

  @Get(':importId/progress')
  @ApiOperation({ summary: 'Get import progress' })
  @ApiResponse({ status: 200, description: 'Progress data' })
  getProgress(@Param('importId') importId: string) {
    const progress = this.service.getProgress(importId)
    if (!progress) {
      throw new HttpException('Import session not found.', HttpStatus.NOT_FOUND)
    }
    return progress
  }

  @Post(':importId/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel an import session' })
  cancel(@Param('importId') importId: string) {
    if (!this.service.cancel(importId)) {
      throw new HttpException('Import session not found.', HttpStatus.NOT_FOUND)
    }
    return { status: 'cancelled' }
  }

  @Post(':importId/files/:fileId/retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retry a failed file' })
  async retryFile(
    @Param('importId') importId: string,
    @Param('fileId') fileId: string,
  ) {
    const session = await this.service.retryFile(importId, fileId)
    if (!session) {
      throw new HttpException('File not found or not in error state.', HttpStatus.NOT_FOUND)
    }
    return session
  }

  @Delete(':importId/files/:fileId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a file from an import session' })
  removeFile(
    @Param('importId') importId: string,
    @Param('fileId') fileId: string,
  ) {
    const session = this.service.removeFile(importId, fileId)
    if (!session) {
      throw new HttpException('File not found.', HttpStatus.NOT_FOUND)
    }
    return session
  }

  @Post(':importId/classify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Override sheet classification' })
  @ApiResponse({ status: 200, description: 'Classification updated' })
  @ApiResponse({ status: 404, description: 'Session/file/sheet not found' })
  classify(
    @Param('importId') importId: string,
    @Body() body: ClassifyRequest,
  ) {
    const session = this.service.classify(importId, body.fileId, body.sheetIndex, body.type)
    if (!session) {
      throw new HttpException('Session, file, or sheet not found.', HttpStatus.NOT_FOUND)
    }
    return session
  }

  @Get(':importId/mappings')
  @ApiOperation({ summary: 'Get suggested column mappings' })
  @ApiResponse({ status: 200, description: 'Suggested column mappings' })
  getMappings(
    @Param('importId') importId: string,
    @Query('fileId') fileId?: string,
    @Query('sheetIndex') sheetIndexValue?: string,
  ) {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)

    const sheetIndex = sheetIndexValue === undefined ? undefined : Number(sheetIndexValue)
    if (sheetIndex !== undefined && (!Number.isInteger(sheetIndex) || sheetIndex < 0)) {
      throw new HttpException('Invalid sheetIndex.', HttpStatus.BAD_REQUEST)
    }
    const results: any[] = []
    for (const file of session.files) {
      if (fileId && file.id !== fileId) continue
      for (let si = 0; si < file.sheets.length; si++) {
        if (sheetIndex !== undefined && si !== sheetIndex) continue
        const sheet = file.sheets[si]
        const mappings = this.service.getMappings(importId, file.id, si) ?? this.mappingService.suggestMappings(
          sheet.headers,
          sheet.previewRows,
          sheet.classification,
        )
        results.push({
          fileId: file.id,
          originalName: file.originalName,
          sheetIndex: si,
          sheetName: sheet.name,
          mappings,
          unmappedColumns: mappings.filter((m) => m.confidence === 0).map((m) => m.sourceColumn),
          mappedCount: mappings.filter((m) => !m.ignored).length,
          ignoredCount: mappings.filter((m) => m.ignored).length,
        })
      }
    }
    return results
  }

  @Post(':importId/mappings')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply column mapping overrides' })
  @ApiResponse({ status: 200, description: 'Mappings applied' })
  applyMappings(
    @Param('importId') importId: string,
    @Body() body: ApplyMappingsRequest,
  ) {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)

    const file = session.files.find((f) => f.id === body.fileId)
    if (!file || !file.sheets[body.sheetIndex]) {
      throw new HttpException('File or sheet not found.', HttpStatus.NOT_FOUND)
    }

    const sheet = file.sheets[body.sheetIndex]
    const current = this.service.getMappings(importId, body.fileId, body.sheetIndex)
      ?? this.mappingService.suggestMappings(sheet.headers, sheet.previewRows, sheet.classification)
    const updated = this.mappingService.applyMappings(current, body.overrides)
    this.service.setMappings(importId, body.fileId, body.sheetIndex, updated)

    return {
      fileId: body.fileId,
      sheetIndex: body.sheetIndex,
      mappings: updated,
      unmappedColumns: updated.filter((m) => m.ignored).map((m) => m.sourceColumn),
      mappedCount: updated.filter((m) => !m.ignored).length,
      ignoredCount: updated.filter((m) => m.ignored).length,
    }
  }

  @Get(':importId/files/:fileId/sheets/:sheetIndex/mappings')
  @ApiOperation({ summary: 'Get mappings for one sheet' })
  getSheetMappings(
    @Param('importId') importId: string,
    @Param('fileId') fileId: string,
    @Param('sheetIndex') sheetIndexValue: string,
  ) {
    const sheetIndex = Number(sheetIndexValue)
    if (!Number.isInteger(sheetIndex) || sheetIndex < 0) {
      throw new HttpException('Invalid sheetIndex.', HttpStatus.BAD_REQUEST)
    }
    const results = this.getMappings(importId, fileId, String(sheetIndex))
    if (results.length === 0) throw new HttpException('File or sheet not found.', HttpStatus.NOT_FOUND)
    return results[0]
  }

  @Put(':importId/files/:fileId/sheets/:sheetIndex/mappings')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace mappings for one sheet' })
  applySheetMappings(
    @Param('importId') importId: string,
    @Param('fileId') fileId: string,
    @Param('sheetIndex') sheetIndexValue: string,
    @Body() body: Pick<ApplyMappingsRequest, 'overrides'>,
  ) {
    const sheetIndex = Number(sheetIndexValue)
    if (!Number.isInteger(sheetIndex) || sheetIndex < 0) {
      throw new HttpException('Invalid sheetIndex.', HttpStatus.BAD_REQUEST)
    }
    return this.applyMappings(importId, { fileId, sheetIndex, overrides: body.overrides })
  }

  @Post(':importId/validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate mapped data' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validate(
    @Param('importId') importId: string,
    @Body() body: ValidateRequest,
  ) {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)

    const file = session.files.find((f) => f.id === body.fileId)
    if (!file || !file.sheets[body.sheetIndex]) {
      throw new HttpException('File or sheet not found.', HttpStatus.NOT_FOUND)
    }

    const sheet = file.sheets[body.sheetIndex]
    const mappings = this.service.getMappings(importId, body.fileId, body.sheetIndex)
      ?? this.mappingService.suggestMappings(sheet.headers, sheet.previewRows, sheet.classification)
    const rows = await this.service.getSheetRows(importId, body.fileId, body.sheetIndex)
    const result = this.validationService.validateSheet(
      importId, body.fileId, file.originalName,
      body.sheetIndex, sheet.name,
      sheet.headers, rows, mappings,
    )
    this.service.setValidationResult(importId, result)
    return result
  }

  @Get(':importId/validation')
  @ApiOperation({ summary: 'Get cached validation results' })
  @ApiResponse({ status: 200, description: 'Cached validation results' })
  getValidation(
    @Param('importId') importId: string,
  ) {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)
    return this.service.getValidationResults(importId)
  }

  @Get(':importId/normalized-preview')
  @ApiOperation({ summary: 'Get normalized record preview' })
  @ApiResponse({ status: 200, description: 'Normalized preview' })
  getNormalizedPreview(
    @Param('importId') importId: string,
  ) {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)

    const results: any[] = []
    for (const file of session.files) {
      for (let si = 0; si < file.sheets.length; si++) {
        const sheet = file.sheets[si]
        const mappings = this.service.getMappings(importId, file.id, si)
          ?? this.mappingService.suggestMappings(sheet.headers, sheet.previewRows, sheet.classification)
        const preview = generateNormalizedPreview(sheet.previewRows, mappings, IMPORT_CONFIG.previewRows)
        results.push({
          fileId: file.id,
          originalName: file.originalName,
          sheetIndex: si,
          sheetName: sheet.name,
          records: preview,
        })
      }
    }
    return results
  }

  private async buildCorrelationRecords(importId: string): Promise<CorrelationRecord[]> {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)
    const validations = this.service.getValidationResults(importId)
    const records: CorrelationRecord[] = []
    for (const file of session.files) {
      for (let sheetIndex = 0; sheetIndex < file.sheets.length; sheetIndex++) {
        const sheet = file.sheets[sheetIndex]
        const mappings = this.service.getMappings(importId, file.id, sheetIndex)
          ?? this.mappingService.suggestMappings(sheet.headers, sheet.previewRows, sheet.classification)
        const rows = await this.service.getSheetRows(importId, file.id, sheetIndex)
        const normalized = generateNormalizedPreview(rows, mappings, rows.length)
        const validation = validations.find((result) => result.fileId === file.id && result.sheetIndex === sheetIndex)
        for (const record of normalized) {
          const hasError = validation?.issues.some((issue) => issue.row === record.row && ['ERROR', 'CRITICAL'].includes(issue.severity))
          records.push({
            recordId: deterministicId('record', importId, file.id, sheetIndex, record.row),
            sourceSystem: String(record.mapped.sourceSystem ?? 'CUSTOM'), fields: record.mapped,
            fileId: file.id, fileName: file.originalName, sheetIndex, sheetName: sheet.name, row: record.row,
            datasetType: sheet.classification, validationStatus: hasError ? 'INVALID' : 'VALID', raw: record.original,
          })
        }
      }
    }
    return records
  }

  @Post(':importId/correlate')
  @HttpCode(200)
  async correlate(@Param('importId') importId: string, @Body() options: CorrelationOptions = {}) {
    const result = this.correlationService.correlate(importId, await this.buildCorrelationRecords(importId), options)
    this.service.setCorrelationResult(importId, result)
    return result
  }

  @Get(':importId/correlation')
  getCorrelation(@Param('importId') importId: string) {
    if (!this.service.getSession(importId)) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)
    const result = this.service.getCorrelationResult(importId)
    if (!result) throw new HttpException('Correlation has not been run.', HttpStatus.NOT_FOUND)
    return result
  }

  @Post(':importId/convert')
  @HttpCode(200)
  async convert(@Param('importId') importId: string, @Body() body: { nodeLimit?: number; relationshipLimit?: number } = {}) {
    const records = await this.buildCorrelationRecords(importId)
    const correlation = this.service.getCorrelationResult(importId) ?? this.correlationService.correlate(importId, records)
    this.service.setCorrelationResult(importId, correlation)
    const result = this.conversionService.convert(
      importId, records, correlation,
      body.nodeLimit ?? IMPORT_CONFIG.maxGraphPreviewNodes,
      body.relationshipLimit ?? IMPORT_CONFIG.maxGraphPreviewRelationships,
    )
    this.service.setConversionResult(importId, result)
    const { fullGraph: _fullGraph, ...response } = result
    return response
  }

  @Get(':importId/graph-preview')
  async getGraphPreview(@Param('importId') importId: string, @Query('nodeLimit') nodeLimit?: string, @Query('relationshipLimit') relationshipLimit?: string) {
    const requestedLimits = nodeLimit !== undefined || relationshipLimit !== undefined
    const parsedNodeLimit = Number(nodeLimit ?? IMPORT_CONFIG.maxGraphPreviewNodes)
    const parsedRelationshipLimit = Number(relationshipLimit ?? IMPORT_CONFIG.maxGraphPreviewRelationships)
    if (requestedLimits && (!Number.isInteger(parsedNodeLimit) || parsedNodeLimit < 0 || !Number.isInteger(parsedRelationshipLimit) || parsedRelationshipLimit < 0)) {
      throw new HttpException('Preview limits must be non-negative integers.', HttpStatus.BAD_REQUEST)
    }
    if (requestedLimits) return (await this.convert(importId, { nodeLimit: parsedNodeLimit, relationshipLimit: parsedRelationshipLimit })).preview
    const result = this.service.getConversionResult(importId)
    if (!result) throw new HttpException('Conversion has not been run.', HttpStatus.NOT_FOUND)
    return result.preview
  }

  @Get(':importId/conversion-summary')
  getConversionSummary(@Param('importId') importId: string) {
    const result = this.service.getConversionResult(importId)
    if (!result) throw new HttpException('Conversion has not been run.', HttpStatus.NOT_FOUND)
    const { preview: _preview, fullGraph: _fullGraph, ...summary } = result
    return summary
  }

  @Post(':importId/persist')
  @HttpCode(200)
  persist(@Param('importId') importId: string) {
    if (!this.service.getSession(importId)) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)
    return this.persistenceService.persistConvertedGraph(importId)
  }
}
