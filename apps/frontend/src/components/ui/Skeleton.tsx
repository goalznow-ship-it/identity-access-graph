interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const shape =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
        ? 'rounded-lg'
        : 'rounded h-4'

  return (
    <div
      className={`animate-pulse bg-white/5 ${shape} ${className}`}
    />
  )
}
