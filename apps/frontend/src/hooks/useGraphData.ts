import { useCallback,useEffect,useState } from 'react'
import type { GraphData } from '../types/graph'
import type { GraphSourceMode } from '../types/neo4j'
import { buildGraphData } from '../services/graphDataAdapter'
import { getActiveImportGraphPreview, getImportGraphPreview, ImportApiError } from '../services/importApi'
import { useNeo4jGraph } from './useNeo4jGraph'

export function useGraphData(importId?:string|null,source:GraphSourceMode=importId?'imported':'mock',filters:Record<string,unknown>={}){
  const neo4j=useNeo4jGraph(source==='neo4j',filters)
  const[data,setData]=useState<GraphData|null>(source==='mock'?buildGraphData():null)
  const[loading,setLoading]=useState(source!=='mock'&&source!=='neo4j')
  const[error,setError]=useState<string|null>(null)
  const[fallbackNotice,setFallbackNotice]=useState<string|null>(null)
  const[revision,setRevision]=useState(0)

  useEffect(()=>{
    if(source==='neo4j')return
    if(source==='mock'){
      setData(buildGraphData());setLoading(false);setError(null);setFallbackNotice(null);return
    }
    let cancelled=false
    setLoading(true);setError(null);setFallbackNotice(null)
    const load=async()=>{
      try{
        let result
        if(importId){
          try{result=await getImportGraphPreview(importId,500,2000)}
          catch(error){
            if(error instanceof ImportApiError&&error.status===404){
              result=await getActiveImportGraphPreview(500,2000)
              setFallbackNotice('The requested import session expired. Loaded the latest active import instead.')
            }else throw error
          }
        }else result=await getActiveImportGraphPreview(500,2000)
        if(!cancelled)setData({nodes:result.nodes,links:result.links})
      }catch(error){
        if(cancelled)return
        setData(null)
        if(error instanceof ImportApiError&&error.status===404)setError('No active imported dataset is available. Create a new import or switch to Mock Enterprise.')
        else setError((error as Error).message)
      }finally{if(!cancelled)setLoading(false)}
    }
    void load()
    return()=>{cancelled=true}
  },[importId,source,revision])

  const retry=useCallback(()=>{if(source==='neo4j')void neo4j.retry();else setRevision((value)=>value+1)},[source,neo4j.retry])
  if(source==='neo4j')return{data:neo4j.data,loading:neo4j.loading,error:neo4j.error,retry,partial:neo4j.partial,expanding:neo4j.expanding,expandRemote:neo4j.expand,fallbackNotice:null}
  return{data,loading,error,retry,partial:false,expanding:new Set<string>(),expandRemote:async()=>undefined,fallbackNotice}
}
