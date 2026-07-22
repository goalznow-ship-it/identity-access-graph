import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Search, Sun, User } from '../components/icons'
import { useAuth } from '../auth/AuthContext'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphSource } from '../hooks/useGraphSource'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { adaptNeo4jNode } from '../services/neo4jGraphAdapter'
import { searchNodes } from '../services/neo4jGraphApi'
import { nodeDestination, searchNavigationNodes } from '../services/navigation'
import type { GraphNode } from '../types/graph'
import { NotificationCenter } from './NotificationCenter'

export function Navbar() {
  const auth = useAuth(), { source } = useGraphSource(), navigate = useNavigate()
  const { data } = useGraphData(null, source)
  const [query, setQuery] = useState(''), [active, setActive] = useState(0), [remote, setRemote] = useState<GraphNode[]>([])
  const debounced = useDebouncedValue(query)
  useEffect(() => {
    if (source !== 'neo4j' || !debounced.trim()) { setRemote([]); return }
    const controller = new AbortController()
    void searchNodes(debounced, { limit: 8 }, { signal: controller.signal }).then(nodes => setRemote(nodes.map(adaptNeo4jNode))).catch(error => { if ((error as any).code !== 'ABORTED') setRemote([]) })
    return () => controller.abort()
  }, [source, debounced])
  const results = source === 'neo4j' ? remote : searchNavigationNodes(data?.nodes ?? [], query)
  const select = (index: number) => {
    const node = results[index]; if (!node) return
    const destination = source === 'neo4j' && !['USER','LINUX_USER'].includes(node.nodeType) && !(node.sourceSystem === 'LINUX' && ['HOST','COMPUTER'].includes(node.nodeType)) ? `/graph?source=neo4j&nodeId=${encodeURIComponent(node.id)}` : nodeDestination(node)
    navigate(destination); setQuery('')
  }
  return <nav className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background/70 backdrop-blur-xl"><div className="flex h-full items-center justify-between px-3 sm:px-6"><button onClick={()=>navigate('/')} className="text-lg font-semibold text-gray-100"><span className="hidden sm:inline">Identity Access Graph</span><span className="sm:hidden">IAG</span></button><div className="flex items-center gap-3"><div className="relative"><label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-gray-400 focus-within:border-primary"><Search className="h-4 w-4"/><input aria-label="Search identities and assets" value={query} onChange={event=>{setQuery(event.target.value);setActive(0)}} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>Math.min(results.length-1,value+1))}if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(0,value-1))}if(event.key==='Enter')select(active);if(event.key==='Escape')setQuery('')}} placeholder={source==='neo4j'?'Search Neo4j Live':'Search identities and assets'} className="hidden w-56 bg-transparent text-gray-200 outline-none md:block"/></label>{query&&<div className="absolute right-0 top-11 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">{results.map((node,index)=><button key={node.id} onMouseDown={()=>select(index)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${index===active?'bg-primary/10 text-white':'text-gray-400 hover:bg-white/5'}`}><span>{node.displayName}</span><span className="text-[10px] text-gray-600">{node.nodeType}</span></button>)}{results.length===0&&<p className="p-3 text-xs text-gray-500">No matching identities or assets.</p>}</div>}</div><NotificationCenter/><button aria-label="Toggle color theme" onClick={()=>document.documentElement.classList.toggle('light')} className="rounded-lg p-2 text-gray-400"><Sun className="h-5 w-5"/></button><button onClick={()=>navigate('/settings')} className="flex items-center gap-2 rounded-lg p-1.5 text-sm text-gray-400" title={`${auth.user?.displayName} · ${auth.user?.role}`}><User className="h-5 w-5"/><span className="hidden md:inline">{auth.user?.displayName}</span><span className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] lg:inline">{auth.user?.role}</span></button>{auth.authenticationEnabled&&<button aria-label="Sign out" onClick={()=>{auth.logout();navigate('/login')}} className="rounded-lg p-2 text-gray-400 hover:text-gray-200"><LogOut className="h-4 w-4"/></button>}</div></div></nav>
}
