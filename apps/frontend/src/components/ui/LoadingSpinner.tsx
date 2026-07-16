interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-primary/30 border-t-primary ${sizes[size]}`}
    />
  )
}
