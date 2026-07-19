import { createHash, randomUUID } from 'node:crypto'
import { BadRequestException, Injectable, NotFoundException, RequestTimeoutException } from '@nestjs/common'
import { RiskService, type GraphSnapshot } from '../risk'
import { AttackPathRepository } from './attack-path.repository'
import { PrivilegeTargetService } from './privilege-target.service'
import { PathScoringService } from './path-scoring.service'
import { PathExplanationService } from './path-explanation.service'
import { AttackPathType, PathConfidence, type AttackPath, type AttackPathRun, type AttackPathSearch, type ChokePoint, type PrivilegedTarget } from './attack-path.types'

const endpoint = (value: any) => typeof value === 'object' ? value.id : value
const identity = (node: any) => ['USER','LINUX_USER','SERVICE_ACCOUNT','MANAGED_SERVICE_ACCOUNT'].includes(node.nodeType)
const application = (node: any) => node.nodeType === 'APPLICATION'
const database = (node: any) => node.nodeType === 'DATABASE'
const pathId = (nodes: string[], rels: string[]) => `path-${createHash('sha256').update(`${nodes.join('>')}|${rels.join('>')}`).digest('hex').slice(0,20)}`
const privilegeEdges = new Set(['GRANTS','HAS_ROLE','HAS_SUDO_POLICY','MEMBER_OF','TRUSTS','HAS_ACCESS_TO','AUTHENTICATES_TO'])
const edgeWeight = (type: string) => ({ GRANTS: 1, HAS_ROLE: 1, HAS_SUDO_POLICY: 1, HAS_SSH_KEY: 2, MEMBER_OF: 2, TRUSTS: 3, AUTHENTICATES_TO: 3, HAS_ACCESS_TO: 3, USES: 4, RUNS_ON: 4 }[type] ?? 5)

@Injectable()
export class AttackPathService {
  constructor(private repository: AttackPathRepository, private targetsService: PrivilegeTargetService, private scoring: PathScoringService, private explanations: PathExplanationService, private risk: RiskService) {}

  async search(request: AttackPathSearch = {}) {
    const normalized = this.normalize(request)
    const run: AttackPathRun = { id: randomUUID(), status: 'RUNNING', request: normalized, pathCount: 0, durationMs: null, startedAt: new Date().toISOString() }
    await this.repository.startRun(run)
    const started = Date.now()
    try {
      const graph = await this.repository.graph(normalized)
      const paths = this.discover(graph, normalized, started)
      const durationMs = Date.now() - started
      await this.repository.completeRun(run.id, paths, durationMs)
      return { runId: run.id, paths, count: paths.length, durationMs, truncated: paths.length >= normalized.maxPaths! }
    } catch (error) {
      await this.repository.failRun(run.id, error instanceof Error ? error.message : String(error), Date.now() - started)
      throw error
    }
  }

  async blastRadius(nodeId: string, request: AttackPathSearch = {}) {
    const normalized = this.normalize({ ...request, sourceNodeId: nodeId, targetNodeId: undefined, algorithm: 'all' })
    const graph = await this.repository.graph(normalized)
    if (!graph.nodes.some(node => node.id === nodeId)) throw new NotFoundException('Source node not found')
    const reachable = this.reachable(graph, nodeId, normalized)
    const targets = this.targetsService.targets({ nodes: reachable.nodes, relationships: reachable.relationships })
    return { nodeId, reachableNodeCount: reachable.nodes.length - 1, privilegedTargetCount: targets.length, maximumDepth: reachable.maximumDepth, affectedNodes: reachable.nodes.filter(node => node.id !== nodeId), privilegedTargets: targets }
  }

  async chokePoints(request: AttackPathSearch = {}): Promise<ChokePoint[]> {
    const result = await this.search({ ...request, algorithm: 'all', maxPaths: request.maxPaths ?? 200 })
    const stats = new Map<string, { node: AttackPath['sourceNode']; paths: Set<string>; sources: Set<string>; targets: Set<string> }>()
    for (const path of result.paths) for (const node of path.nodes.slice(1, -1)) {
      const item = stats.get(node.id) ?? { node, paths: new Set(), sources: new Set(), targets: new Set() }
      item.paths.add(path.id); item.sources.add(path.sourceNode.id); item.targets.add(path.targetNode.id); stats.set(node.id, item)
    }
    return [...stats.values()].map(item => ({ node: item.node, pathCount: item.paths.size, percentage: result.count ? Math.round(item.paths.size / result.count * 10000) / 100 : 0, sourceCount: item.sources.size, targetCount: item.targets.size })).sort((a,b) => b.pathCount-a.pathCount || b.percentage-a.percentage || a.node.id.localeCompare(b.node.id))
  }

  escalation(request: AttackPathSearch = {}) { return this.search({ ...request, targetType: request.targetType, allowedRelationshipTypes: request.allowedRelationshipTypes ?? [...privilegeEdges] }) }
  identityToApplications(sourceNodeId: string, request: AttackPathSearch = {}) { return this.search({ ...request, sourceNodeId, targetType: AttackPathType.IDENTITY_TO_APPLICATION }) }
  applicationToDatabases(sourceNodeId: string, request: AttackPathSearch = {}) { return this.search({ ...request, sourceNodeId, targetType: AttackPathType.APPLICATION_TO_DATABASE }) }
  get(id: string) { const path = this.repository.get(id); if (!path) throw new NotFoundException('Attack path not found'); return path }
  from(nodeId: string, query: AttackPathSearch = {}) { return this.search({ ...query, sourceNodeId: nodeId }) }
  to(nodeId: string, query: AttackPathSearch = {}) { return this.search({ ...query, targetNodeId: nodeId }) }
  top(limit = 10) { return this.repository.list().slice(0, Math.min(100, Math.max(1, limit))) }
  history(limit = 50) { return this.repository.history(limit) }
  historyRun(id: string) { return this.repository.run(id) }
  async targets(source: 'auto'|'neo4j'|'memory' = 'auto') { const graph = await this.repository.graph({ graphSource: source, maxDepth: 1, maxPaths: 200 }); return this.targetsService.targets(graph) }
  summary() { const paths=this.repository.list(), count=(values:string[])=>paths.filter(p=>values.includes(p.severity)).length, tally=(key:'type'|'sourceNode'|'targetNode')=>{const map=new Map<string,number>();paths.forEach(p=>{const value=key==='type'?p.type:key==='sourceNode'?p.sourceNode.id:p.targetNode.id;map.set(value,(map.get(value)??0)+1)});return[...map].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,count])=>({id,count}))};return{totalPaths:paths.length,criticalPaths:count(['CRITICAL']),highRiskPaths:count(['HIGH']),uniqueSourceIdentities:new Set(paths.map(p=>p.sourceNode.id)).size,uniquePrivilegedTargets:new Set(paths.map(p=>p.targetNode.id)).size,pathsByType:Object.fromEntries(tally('type').map(x=>[x.id,x.count])),topSourceIdentities:tally('sourceNode'),topPrivilegedTargets:tally('targetNode'),latestAnalysisTime:this.repository.latest()?.at,durationMs:this.repository.latest()?.duration??0} }

  private normalize(request: AttackPathSearch): AttackPathSearch {
    const algorithm = request.algorithm ?? (request.weighted ? 'weighted' : 'shortest')
    if (!['shortest','weighted','all'].includes(algorithm)) throw new BadRequestException('algorithm must be shortest, weighted, or all')
    return { ...request, algorithm, maxDepth: Math.min(12, Math.max(1, Math.trunc(request.maxDepth ?? 6))), maxPaths: Math.min(200, Math.max(1, Math.trunc(request.maxPaths ?? 25))), timeoutMs: Math.min(30000, Math.max(10, request.timeoutMs ?? 5000)), directed: request.directed !== false }
  }

  private discover(graph: GraphSnapshot, request: AttackPathSearch, started: number) {
    const allowed = new Set(this.repository.allowed(request.allowedRelationshipTypes)), byId = new Map(graph.nodes.map(node => [node.id,node]))
    let targets: PrivilegedTarget[]
    if (request.targetType === AttackPathType.IDENTITY_TO_APPLICATION) targets = graph.nodes.filter(application).map(node => ({ node, type: AttackPathType.IDENTITY_TO_APPLICATION, criticality: 65, reasons: ['Application access'] }))
    else if (request.targetType === AttackPathType.APPLICATION_TO_DATABASE) targets = graph.nodes.filter(database).map(node => ({ node, type: AttackPathType.APPLICATION_TO_DATABASE, criticality: 80, reasons: ['Database access'] }))
    else targets = this.targetsService.targets(graph, request.targetType)
    if (request.targetNodeId) targets = targets.filter(target => target.node.id === request.targetNodeId)
    const targetMap = new Map(targets.map(target => [target.node.id,target]))
    let sources = request.sourceNodeId ? [request.sourceNodeId] : graph.nodes.filter(request.targetType === AttackPathType.APPLICATION_TO_DATABASE ? application : identity).map(node => node.id).sort()
    const adjacency = new Map<string, typeof graph.relationships>()
    for (const rel of graph.relationships.filter(rel => allowed.has(rel.relationshipType))) {
      const source=endpoint(rel.source), target=endpoint(rel.target); adjacency.set(source,[...(adjacency.get(source)??[]),rel]); if (!request.directed) adjacency.set(target,[...(adjacency.get(target)??[]),rel])
    }
    const paths: AttackPath[] = [], seen = new Set<string>(), best = new Map<string,number>()
    type State={node:string;nodes:string[];rels:string[];cost:number}
    const queue: State[] = sources.filter(source=>byId.has(source)).map(source=>({node:source,nodes:[source],rels:[],cost:0}))
    while (queue.length && paths.length < request.maxPaths!) {
      if (Date.now()-started > request.timeoutMs!) throw new RequestTimeoutException('Attack-path analysis timed out')
      queue.sort((a,b)=>(request.algorithm==='weighted'?a.cost-b.cost:a.rels.length-b.rels.length)||a.node.localeCompare(b.node)); const current=queue.shift()!
      const target=targetMap.get(current.node)
      if (target && current.rels.length) { const path=this.create(graph,current.nodes,current.rels,target); if(path.totalRiskScore>=(request.minimumRiskScore??0)&&!seen.has(path.id)){seen.add(path.id);paths.push(path)}; if(request.algorithm!=='all') continue }
      if (current.rels.length >= request.maxDepth!) continue
      for (const rel of (adjacency.get(current.node)??[]).sort((a,b)=>a.id.localeCompare(b.id))) {
        const next=endpoint(rel.source)===current.node?endpoint(rel.target):endpoint(rel.source); if(current.nodes.includes(next)||!byId.has(next))continue
        const cost=current.cost+edgeWeight(rel.relationshipType), key=`${current.nodes[0]}:${next}`
        if(request.algorithm!=='all' && (best.get(key)??Infinity)<=cost)continue; if(request.algorithm!=='all')best.set(key,cost)
        queue.push({node:next,nodes:[...current.nodes,next],rels:[...current.rels,rel.id],cost})
      }
    }
    return paths.sort((a,b)=>request.algorithm==='weighted'?a.totalWeight-b.totalWeight||b.totalRiskScore-a.totalRiskScore:a.totalDepth-b.totalDepth||b.totalRiskScore-a.totalRiskScore||a.id.localeCompare(b.id)).slice(0,request.maxPaths)
  }

  private reachable(graph: GraphSnapshot, source: string, request: AttackPathSearch) {
    const allowed=new Set(this.repository.allowed(request.allowedRelationshipTypes)), byId=new Map(graph.nodes.map(n=>[n.id,n])), seen=new Set([source]), queue=[{id:source,depth:0}], relationships:typeof graph.relationships=[]; let maximumDepth=0
    while(queue.length){const current=queue.shift()!; if(current.depth>=request.maxDepth!)continue; for(const rel of graph.relationships.filter(r=>allowed.has(r.relationshipType)&&(endpoint(r.source)===current.id||(!request.directed&&endpoint(r.target)===current.id)))){const next=endpoint(rel.source)===current.id?endpoint(rel.target):endpoint(rel.source);if(seen.has(next))continue;seen.add(next);relationships.push(rel);maximumDepth=Math.max(maximumDepth,current.depth+1);queue.push({id:next,depth:current.depth+1})}}
    return {nodes:[...seen].map(id=>byId.get(id)!).filter(Boolean),relationships,maximumDepth}
  }

  private create(graph:GraphSnapshot,nodeIds:string[],relIds:string[],target:PrivilegedTarget):AttackPath { const nodes=nodeIds.map(id=>graph.nodes.find(n=>n.id===id)!),rels=relIds.map(id=>graph.relationships.find(r=>r.id===id)!),score=this.scoring.score(nodes,rels,target,this.risk.list({limit:500})),crossDomain=new Set(nodes.map(n=>n.properties?.domain).filter(Boolean)).size>1,type=crossDomain?AttackPathType.CROSS_DOMAIN:target.type,explanation=this.explanations.explain(nodes,rels,target.reasons[0]??'privileged access');return{id:pathId(nodeIds,relIds),type,sourceNode:nodes[0],targetNode:nodes[nodes.length-1],nodes,relationships:rels,totalDepth:rels.length,totalWeight:rels.reduce((sum,rel)=>sum+edgeWeight(rel.relationshipType),0),totalRiskScore:score.total,factorScores:score.factors,severity:score.severity as AttackPath['severity'],sourceSystems:[...new Set(nodes.map(n=>n.sourceSystem))],accessMode:rels.length===1?'DIRECT':'INHERITED',privilegedTargetType:target.type,explanation:explanation.explanation,confidence:score.confidence as PathConfidence,evidence:explanation.evidence,mitigations:explanation.mitigations,createdAt:new Date().toISOString()} }
}
