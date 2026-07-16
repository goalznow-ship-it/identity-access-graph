import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGraphData } from '../hooks/useGraphData'
import { DashboardEmpty, DashboardGrid, DashboardHeader, DashboardSkeleton } from '../components/dashboard'

function DashboardContent({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { data, loading, error } = useGraphData()
  if (loading) return <DashboardSkeleton />
  if (error || !data) return <DashboardEmpty onRetry={onRefresh} />
  return <><DashboardHeader nodes={data.nodes.length} onRefresh={onRefresh} refreshing={refreshing} /><div className="mt-5"><DashboardGrid data={data} /></div></>
}

export function Home() {
  const [revision, setRevision] = useState(0); const [refreshing, setRefreshing] = useState(false)
  const refresh = () => { setRefreshing(true); setRevision((value) => value + 1); window.setTimeout(() => setRefreshing(false), 700) }
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .25 }} className="mx-auto max-w-[1800px] pb-8"><DashboardContent key={revision} onRefresh={refresh} refreshing={refreshing} /></motion.div>
}
