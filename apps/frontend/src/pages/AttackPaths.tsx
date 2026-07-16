import { useEffect,useMemo,useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AttackPathDetails,AttackPathList,AttackPathSearch,AttackPathSummary,PathFilters,PrivilegedTargetList } from '../components/attack-path'
import { filterAttackPaths,getAttackSummary,getPrivilegedTargets,searchAttackPaths } from '../services/attackPathApi'
import type { AttackPath,AttackSearch,AttackSummary } from '../types/attackPath'
const initial:AttackSearch={sourceNodeId:'',maxDepth:6,maxPaths:25,directed:true}
export function AttackPathsPage(){
  const[params]=useSearchParams()
  const[query,setQuery]=useState<AttackSearch>(()=>({...initial,sourceNodeId:params.get('sourceNodeId')??'',targetNodeId:params.get('targetNodeId')??undefined}))
  const[paths,setPaths]=useState<AttackPath[]>([]),[summary,setSummary]=useState<AttackSummary|null>(null),[targets,setTargets]=useState<any[]>([]),[selected,setSelected]=useState<AttackPath|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[type,setType]=useState(''),[minScore,setMinScore]=useState(0)
  useEffect(()=>{void Promise.all([getAttackSummary().then(setSummary),getPrivilegedTargets().then(setTargets)]).catch(()=>undefined)},[])
  const run=async()=>{setLoading(true);setError('');try{const result=await searchAttackPaths(query);setPaths(result.paths);setSummary(await getAttackSummary())}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
  const visible=useMemo(()=>filterAttackPaths(paths,type,minScore),[paths,type,minScore])
  return <div className="mx-auto max-w-[1500px] space-y-5"><header><h1 className="text-2xl font-semibold">Attack Paths & Privilege Escalation</h1><p className="mt-1 text-sm text-gray-500">Explain identity-to-privilege reachability across membership, access, trust, infrastructure, and business dependencies.</p></header><AttackPathSearch value={query}onChange={setQuery}onSearch={()=>void run()}loading={loading}/>{error&&<div role="alert"className="rounded border border-danger/40 bg-danger/10 p-3 text-danger">{error}<button onClick={()=>void run()}className="ml-3 underline">Retry</button></div>}{summary&&<AttackPathSummary summary={summary}/>}<div className="grid gap-4 xl:grid-cols-[1fr_18rem]"><div><div className="mb-3 flex items-center justify-between"><span className="text-sm text-gray-500">{visible.length} paths</span><PathFilters type={type}minScore={minScore}onType={setType}onScore={setMinScore}/></div>{loading?<div className="h-48 animate-pulse rounded-xl bg-white/5"/>:<AttackPathList paths={visible}onSelect={setSelected}/>}</div><PrivilegedTargetList targets={targets}/></div><AttackPathDetails path={selected}onClose={()=>setSelected(null)}/></div>
}
