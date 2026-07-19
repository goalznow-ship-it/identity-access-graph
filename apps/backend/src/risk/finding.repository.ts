import { Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { OperationalStoreService } from '../database/operational-store.service'
import type { FindingFilters, RiskFinding } from './risk.types'

@Injectable()
export class FindingRepository implements OnModuleInit {
  private findings = new Map<string, RiskFinding>()
  private latestScan?: { at: string; durationMs: number }
  constructor(@Optional() private readonly store?: OperationalStoreService) {}

  async onModuleInit() {
    if (!this.store) return
    const [findings, scan] = await Promise.all([this.store.loadFindings(), this.store.getMetadata('risk.latestScan')])
    this.findings = new Map(findings.map((row) => [row.id, row.payload as unknown as RiskFinding]))
    this.latestScan = scan?.value as unknown as typeof this.latestScan
  }
  upsert(next: RiskFinding) {
    const old = this.findings.get(next.id)
    const value = { ...next, firstDetected: old?.firstDetected ?? next.firstDetected, status: old?.status ?? next.status }
    this.findings.set(next.id, value)
    this.store?.saveFinding({ id: value.id, ruleId: value.ruleId, severity: value.severity, category: value.category, status: value.status, score: value.score, payload: value as unknown as Record<string, unknown>, firstDetected: new Date(value.firstDetected), lastDetected: new Date(value.lastDetected) })
    return value
  }
  get(id: string) { return this.findings.get(id) }
  list(filters: FindingFilters = {}) {
    const all = [...this.findings.values()].filter((f) => !filters.severity || f.severity === filters.severity).filter((f) => !filters.category || f.category === filters.category).filter((f) => !filters.status || f.status === filters.status).filter((f) => !filters.sourceSystem || f.sourceSystems.includes(filters.sourceSystem)).filter((f) => !filters.nodeId || f.affectedNodes.includes(filters.nodeId)).filter((f) => !filters.ruleId || f.ruleId === filters.ruleId).sort((a, b) => b.score - a.score)
    const offset = Math.max(0, filters.offset ?? 0), limit = Math.min(500, Math.max(1, filters.limit ?? 100))
    return all.slice(offset, offset + limit)
  }
  setStatus(id: string, status: RiskFinding['status']) {
    const finding = this.findings.get(id)
    if (!finding) return
    finding.status = status
    this.upsert(finding)
    return finding
  }
  setScan(durationMs: number) {
    this.latestScan = { at: new Date().toISOString(), durationMs }
    this.store?.setMetadata('risk.latestScan', this.latestScan)
  }
  getScan() { return this.latestScan }
}
