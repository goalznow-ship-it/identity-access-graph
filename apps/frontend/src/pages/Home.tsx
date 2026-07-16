import { useEffect,useState } from 'react'
import { motion } from 'framer-motion'
import { useGraphData } from '../hooks/useGraphData'
import { DashboardEmpty,DashboardGrid,DashboardHeader,DashboardSkeleton } from '../components/dashboard'
import { useGraphSource } from '../hooks/useGraphSource'
import { getDashboardSummary } from '../services/neo4jGraphApi'
import { getRiskSummary } from '../services/riskApi'
import type { DashboardSummary } from '../types/neo4j'
import type { RiskSummary } from '../types/risk'
import { loadSettings } from '../services/navigation'

function Content({revision,onRefresh,refreshing}:{revision:number;onRefresh:()=>void;refreshing:boolean}){
  const {source,setSource}=useGraphSource()
  const importId=typeof localStorage==='undefined'?null:localStorage.getItem('lastImportId')
  const {data,loading,error,retry}=useGraphData(source==='imported'?importId:null,source)
  const [summary,setSummary]=useState<DashboardSummary|null>(null)
  const [riskSummary,setRiskSummary]=useState<RiskSummary|null>(null)
  const [summaryError,setSummaryError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)
  useEffect(()=>{const controller=new AbortController();void getRiskSummary().then(setRiskSummary).catch(()=>setRiskSummary(null));return()=>controller.abort()},[revision])
  useEffect(()=>{if(source!=='neo4j'){setSummary(null);setSummaryError(null);return}const controller=new AbortController();void getDashboardSummary({}, {signal:controller.signal,timeoutMs:loadSettings(localStorage).apiTimeoutMs}).then(setSummary).catch((nextError)=>setSummaryError((nextError as Error).message));return()=>controller.abort()},[source,revision])
  useEffect(()=>{const failure=error||summaryError;if(source==='neo4j'&&failure&&loadSettings(localStorage).autoFallback){setNotice(`Neo4j Live unavailable: ${failure}. Switched to Mock Enterprise.`);setSource('mock')}},[source,error,summaryError,setSource])
  if(loading||(source==='neo4j'&&!summary&&!summaryError))return <DashboardSkeleton/>
  if(error||!data||summaryError)return <DashboardEmpty onRetry={()=>{void retry();onRefresh()}}/>
  const dashboardSummary=riskSummary?({...summary,riskCounts:riskSummary.countsBySeverity}as DashboardSummary):summary
  return <>{notice&&<div className="mb-3 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">{notice}</div>}<DashboardHeader nodes={summary?Object.values(summary.nodeTypeCounts).reduce((a,b)=>a+b,0):data.nodes.length} onRefresh={onRefresh} refreshing={refreshing} source={source} onSourceChange={setSource} importedAvailable={Boolean(importId)}/><div className="mt-5"><DashboardGrid data={data} summary={dashboardSummary}/></div></>
}
export function Home(){const[revision,setRevision]=useState(0);const[refreshing,setRefreshing]=useState(false);const refresh=()=>{setRefreshing(true);setRevision(value=>value+1);window.setTimeout(()=>setRefreshing(false),700)};return <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mx-auto max-w-[1800px] pb-8"><Content key={revision} revision={revision} onRefresh={refresh} refreshing={refreshing}/></motion.div>}
