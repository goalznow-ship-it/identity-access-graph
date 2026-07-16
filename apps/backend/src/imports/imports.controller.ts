import {
  Controller, Post, Put, Get, HttpCode, HttpException, HttpStatus,
  UseInterceptors, UploadedFiles, Param, Body, Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ImportsService } from './imports.service'
import { MappingService } from './mapping/mapping.service'
import { ValidationService } from './validation/validation.service'
import { generateNormalizedPreview } from './validation/normalized-preview'
import type { ClassifyRequest, ApplyMappingsRequest, ValidateRequest } from './types'
import { IdentityCorrelationService, type CorrelationOptions, type CorrelationRecord } from './correlation'
import { GraphConversionService } from './graph-conversion'
import { deterministicId } from './graph-conversion/deterministic-id'

@ApiTags('Imports')
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly service: ImportsService,
    private readonly mappingService: MappingService,
    private readonly validationService: ValidationService,
    private readonly correlationService: IdentityCorrelationService,
    private readonly conversionService: GraphConversionService,
  ) {}

  @Post('upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload Excel/CSV files for import' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Files uploaded and inspected' })
  @UseInterceptors(FilesInterceptor('files', 10))
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
  validate(
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
    const result = this.validationService.validateSheet(
      importId, body.fileId, file.originalName,
      body.sheetIndex, sheet.name,
      sheet.headers, sheet.previewRows, mappings,
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
        const preview = generateNormalizedPreview(sheet.previewRows, mappings, 20)
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

  private buildCorrelationRecords(importId: string): CorrelationRecord[] {
    const session = this.service.getSession(importId)
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND)
    const validations = this.service.getValidationResults(importId)
    const records: CorrelationRecord[] = []
    for (const file of session.files) {
      for (let sheetIndex = 0; sheetIndex < file.sheets.length; sheetIndex++) {
        const sheet = file.sheets[sheetIndex]
        const mappings = this.service.getMappings(importId, file.id, sheetIndex)
          ?? this.mappingService.suggestMappings(sheet.headers, sheet.previewRows, sheet.classification)
        const normalized = generateNormalizedPreview(sheet.previewRows, mappings, sheet.previewRows.length)
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
  correlate(@Param('importId') importId: string, @Body() options: CorrelationOptions = {}) {
    const result = this.correlationService.correlate(importId, this.buildCorrelationRecords(importId), options)
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
  convert(@Param('importId') importId: string, @Body() body: { nodeLimit?: number; relationshipLimit?: number } = {}) {
    const records = this.buildCorrelationRecords(importId)
    const correlation = this.service.getCorrelationResult(importId) ?? this.correlationService.correlate(importId, records)
    this.service.setCorrelationResult(importId, correlation)
    const result = this.conversionService.convert(importId, records, correlation, body.nodeLimit ?? 500, body.relationshipLimit ?? 2000)
    this.service.setConversionResult(importId, result)
    return result
  }

  @Get(':importId/graph-preview')
  getGraphPreview(@Param('importId') importId: string, @Query('nodeLimit') nodeLimit?: string, @Query('relationshipLimit') relationshipLimit?: string) {
    const requestedLimits = nodeLimit !== undefined || relationshipLimit !== undefined
    const parsedNodeLimit = Number(nodeLimit ?? 500)
    const parsedRelationshipLimit = Number(relationshipLimit ?? 2000)
    if (requestedLimits && (!Number.isInteger(parsedNodeLimit) || parsedNodeLimit < 0 || !Number.isInteger(parsedRelationshipLimit) || parsedRelationshipLimit < 0)) {
      throw new HttpException('Preview limits must be non-negative integers.', HttpStatus.BAD_REQUEST)
    }
    if (requestedLimits) return this.convert(importId, { nodeLimit: parsedNodeLimit, relationshipLimit: parsedRelationshipLimit }).preview
    const result = this.service.getConversionResult(importId)
    if (!result) throw new HttpException('Conversion has not been run.', HttpStatus.NOT_FOUND)
    return result.preview
  }

  @Get(':importId/conversion-summary')
  getConversionSummary(@Param('importId') importId: string) {
    const result = this.service.getConversionResult(importId)
    if (!result) throw new HttpException('Conversion has not been run.', HttpStatus.NOT_FOUND)
    const { preview: _preview, ...summary } = result
    return summary
  }
}
