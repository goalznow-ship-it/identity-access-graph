import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; positive: boolean }
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border bg-card p-5 shadow-soft backdrop-blur-glass"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-100">{value}</p>
          {trend && (
            <p
              className={`mt-1 text-xs ${
                trend.positive ? 'text-success' : 'text-danger'
              }`}
            >
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
    </motion.div>
  )
}
