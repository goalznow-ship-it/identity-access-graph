interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

const barColors = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>
            {value}/{max}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
