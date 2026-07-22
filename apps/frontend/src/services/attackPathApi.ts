import type { AttackPath, AttackPathRun, AttackSearch, AttackSummary, BlastRadius, ChokePoint } from '../types/attackPath'
const BASE=((import.meta as any).env?.VITE_API_URL||'/api').replace(/\/$/,'')
async function req<T>(path:string,init?:RequestInit){const response=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}});if(!response.ok)throw new Error(response.status===404?'Attack path not found':response.status===408?'Attack path analysis timed out':`Attack path request failed (${response.status})`);return response.json()as Promise<T>}
export const searchAttackPaths=(body:AttackSearch,signal?:AbortSignal)=>req<{runId:string;paths:AttackPath[];count:number;durationMs:number;truncated:boolean}>('/attack-path/search',{method:'POST',body:JSON.stringify(body),signal})
export const getAttackPath=(id:string)=>req<AttackPath>(`/attack-path/${encodeURIComponent(id)}`)
export const getAttackSummary=(signal?:AbortSignal)=>req<AttackSummary>('/attack-path/summary',{signal})
export const getPrivilegedTargets=()=>req<{node:AttackPath['targetNode'];type:string;criticality:number;reasons:string[]}[]>('/attack-path/targets')
export const getAttackPathHistory=(limit=20,signal?:AbortSignal)=>req<AttackPathRun[]>(`/attack-path/history?limit=${limit}`,{signal})
export const getBlastRadius=(nodeId:string,body:Partial<AttackSearch>,signal?:AbortSignal)=>req<BlastRadius>(`/attack-path/blast-radius/${encodeURIComponent(nodeId)}`,{method:'POST',body:JSON.stringify(body),signal})
export const getChokePoints=(body:Partial<AttackSearch>,signal?:AbortSignal)=>req<ChokePoint[]>('/attack-path/choke-points',{method:'POST',body:JSON.stringify(body),signal})
export const attackPathExportUrl=(format:'json'|'csv')=>`${BASE}/attack-path/export?format=${format}`
export function filterAttackPaths(paths:AttackPath[],type?:string,minScore=0){return paths.filter(path=>(!type||path.type===type)&&path.totalRiskScore>=minScore)}
export const attackGraphLink=(id:string)=>`/graph?mode=investigation&pathId=${encodeURIComponent(id)}`
