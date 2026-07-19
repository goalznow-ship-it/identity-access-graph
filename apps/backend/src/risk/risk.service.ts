import { createHash, randomUUID } from 'node:crypto'
import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { NotificationsService } from '../notifications'
import { FindingRepository } from './finding.repository'
import { RiskGraphSourceService } from './risk-graph-source.service'
import { RiskScoringService } from './risk-scoring.service'
import { riskRules } from './rules'
import { FindingStatus, type FindingFilters, type RiskFinding, type RiskScanRequest, type RiskScanRun } from './risk.types'

export function stableFindingId(ruleId: string, nodes: string[], relationships: string[] = []) {
  return `finding-${createHash('sha256').update([ruleId, ...[...nodes].sort(), ...[...relationships].sort()].join('|')).digest('hex').slice(0, 20)}`
}

@Injectable()
export class RiskService {
  private scanning = false
  constructor(private source: RiskGraphSourceService, private findings: FindingRepository, private scoring: RiskScoringService, @Optional() private notifications?: NotificationsService) {}
  rules() { return riskRules.map(({ detect: _detect, ...rule }) => rule) }

  async scan(request: RiskScanRequest = {}) {
    if (this.scanning) throw new ConflictException('A risk scan is already running')
    this.scanning = true
    const started = Date.now()
    const graphSource = request.graphSource ?? 'auto'
    const selected = request.ruleIds?.length ? riskRules.filter((rule) => request.ruleIds!.includes(rule.id)) : riskRules
    const run: RiskScanRun = { id: randomUUID(), status: 'RUNNING', graphSource, ruleIds: selected.map((rule) => rule.id), rulesRun: 0, findingsDetected: 0, findingsResolved: 0, startedAt: new Date().toISOString() }
    this.findings.saveScan(run)
    await this.findings.flush()
    try {
      const graph = await this.source.load(graphSource)
      const now = new Date().toISOString()
      const detectedIds = new Set<string>()
      for (const rule of selected) {
        for (const match of rule.detect(graph, Math.min(10, Math.max(1, request.maxDepth ?? 6)))) {
          const id = stableFindingId(rule.id, match.nodes, match.relationships)
          const score = this.scoring.score(graph, match, { INFO: 5, LOW: 12, MEDIUM: 25, HIGH: 45, CRITICAL: 65 }[rule.defaultSeverity])
          const nodes = graph.nodes.filter((node) => match.nodes.includes(node.id))
          const finding: RiskFinding = { id, ruleId: rule.id, title: rule.title, description: match.description ?? `${rule.title} affects ${nodes.map((node) => node.displayName).join(', ')}`, category: rule.category, severity: score.severity, confidence: score.confidence, status: FindingStatus.OPEN, score: score.totalScore, scoreFactors: score.factorScores, affectedNodes: match.nodes, affectedRelationships: match.relationships ?? [], evidencePaths: match.path ? [match.path] : [], sourceSystems: [...new Set(nodes.map((node) => node.sourceSystem))], firstDetected: now, lastDetected: now, remediationGuidance: rule.remediation, metadata: match.metadata ?? {} }
          this.findings.upsert(finding)
          detectedIds.add(id)
        }
      }
      const resolved = this.findings.reconcile(run.ruleIds, detectedIds, now)
      const durationMs = Date.now() - started
      this.findings.setScan(durationMs)
      Object.assign(run, { status: 'COMPLETED', rulesRun: selected.length, findingsDetected: detectedIds.size, findingsResolved: resolved, durationMs, completedAt: new Date().toISOString() })
      this.findings.saveScan(run)
      await this.findings.flush()
      const critical = this.findings.list({ severity: 'CRITICAL' as any, status: FindingStatus.OPEN, limit: 500 }).length
      await this.notifications?.create({ type: 'RISK_SCAN', severity: critical ? 'CRITICAL' : detectedIds.size ? 'HIGH' : 'INFO', title: critical ? `${critical} critical risk finding${critical === 1 ? '' : 's'} detected` : 'Risk scan completed', message: `${detectedIds.size} findings detected and ${resolved} resolved across ${selected.length} rules.`, link: '/risk', metadata: { scanId: run.id, findingsDetected: detectedIds.size, findingsResolved: resolved } }).catch(() => undefined)
      return { scanId: run.id, rulesRun: run.rulesRun, findingsDetected: run.findingsDetected, findingsResolved: resolved, totalFindings: this.findings.list({ limit: 500 }).length, durationMs, graphSource }
    } catch (error) {
      Object.assign(run, { status: 'FAILED', rulesRun: selected.length, durationMs: Date.now() - started, error: (error as Error).message, completedAt: new Date().toISOString() })
      this.findings.saveScan(run)
      await this.findings.flush()
      await this.notifications?.create({ type: 'RISK_SCAN', severity: 'HIGH', title: 'Risk scan failed', message: (error as Error).message, link: '/risk', metadata: { scanId: run.id } }).catch(() => undefined)
      throw error
    } finally {
      this.scanning = false
    }
  }

  list(filters: FindingFilters) { return this.findings.list(filters) }
  get(id: string) { const finding = this.findings.get(id); if (!finding) throw new NotFoundException('Risk finding not found'); return finding }
  async setStatus(id: string, status: FindingStatus) { const result = this.findings.setStatus(id, status); if (!result) throw new NotFoundException('Risk finding not found'); await this.findings.flush(); return result }
  scans(limit?: number) { return this.findings.scansList(limit) }
  scanRun(id: string) { const run = this.findings.scanById(id); if (!run) throw new NotFoundException('Risk scan not found'); return run }
  summary() {
    const all = this.findings.list({ limit: 500 }), open = all.filter((finding) => finding.status === FindingStatus.OPEN)
    const count = (key: 'severity' | 'category') => all.reduce<Record<string, number>>((out, finding) => { out[finding[key]] = (out[finding[key]] ?? 0) + 1; return out }, {})
    const nodeScores = new Map<string, number>()
    all.forEach((finding) => finding.affectedNodes.forEach((id) => nodeScores.set(id, (nodeScores.get(id) ?? 0) + finding.score)))
    const top = [...nodeScores].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nodeId, score]) => ({ nodeId, score }))
    return { totalFindings: all.length, openFindings: open.length, countsBySeverity: count('severity'), countsByCategory: count('category'), topRiskyIdentities: top, topRiskyAssets: top, highestScoringPaths: all.filter((finding) => finding.evidencePaths.length).slice(0, 10).map((finding) => ({ findingId: finding.id, score: finding.score, path: finding.evidencePaths[0] })), latestScanTime: this.findings.getScan()?.at, scanDurationMs: this.findings.getScan()?.durationMs ?? 0 }
  }
}
