import { Injectable } from '@nestjs/common'
import { findTargetField, getFieldDef } from './mapping-aliases'
import { detectValuePattern } from './value-patterns'
import type { DatasetType } from '../types'

export interface ColumnMapping {
  sourceColumn: string
  sampleValues: string[]
  targetField: string
  confidence: number
  required: boolean
  ignored: boolean
  duplicateTarget: boolean
}

export interface MappingSet {
  importId: string
  fileId: string
  sheetIndex: number
  mappings: ColumnMapping[]
  unmappedColumns: string[]
  mappedCount: number
  ignoredCount: number
}

@Injectable()
export class MappingService {
  private getSampleValues(rows: Record<string, unknown>[], column: string): string[] {
    return rows.slice(0, 5).map((r) => {
      const v = r[column]
      return v !== null && v !== undefined ? String(v) : ''
    })
  }

  suggestMappings(
    headers: string[],
    rows: Record<string, unknown>[],
    datasetType?: DatasetType,
  ): ColumnMapping[] {
    const usedTargets = new Map<string, number>()
    const mappings: ColumnMapping[] = []

    for (const header of headers) {
      const samples = this.getSampleValues(rows, header)
      const alias = findTargetField(header, datasetType)
      const fieldDef = getFieldDef(alias.field)
      const patternConfidence = fieldDef ? detectValuePattern(samples, alias.field) : 0
      const confidence = Math.max(alias.confidence, patternConfidence)

      const existing = usedTargets.get(alias.field) ?? 0
      usedTargets.set(alias.field, existing + 1)

      mappings.push({
        sourceColumn: header,
        sampleValues: samples,
        targetField: alias.field,
        confidence,
        required: fieldDef?.required ?? false,
        ignored: confidence === 0,
        duplicateTarget: existing > 0,
      })
    }

    const counts = new Map<string, number>()
    mappings.forEach((mapping) => {
      if (!mapping.ignored) counts.set(mapping.targetField, (counts.get(mapping.targetField) ?? 0) + 1)
    })
    return mappings.map((mapping) => ({
      ...mapping,
      duplicateTarget: !mapping.ignored && (counts.get(mapping.targetField) ?? 0) > 1,
    }))
  }

  applyMappings(
    currentMappings: ColumnMapping[],
    overrides: { sourceColumn: string; targetField: string; ignored: boolean }[],
  ): ColumnMapping[] {
    const updated = currentMappings.map((m) => {
      const override = overrides.find((o) => o.sourceColumn === m.sourceColumn)
      if (override) {
        return { ...m, targetField: override.targetField, ignored: override.ignored, confidence: override.ignored ? 0 : 100 }
      }
      return m
    })
    const counts = new Map<string, number>()
    updated.forEach((m) => {
      if (!m.ignored) counts.set(m.targetField, (counts.get(m.targetField) ?? 0) + 1)
    })
    return updated.map((m) => ({
      ...m,
      duplicateTarget: !m.ignored && (counts.get(m.targetField) ?? 0) > 1,
    }))
  }
}
