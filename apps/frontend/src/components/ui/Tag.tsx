interface TagProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
  children: string
  onRemove?: () => void
}

const colors = {
  primary: 'bg-primary-muted text-primary border-primary/30',
  secondary: 'bg-secondary-muted text-secondary border-secondary/30',
  accent: 'bg-accent-muted text-accent border-accent/30',
  success: 'bg-success-muted text-success border-success/30',
  warning: 'bg-warning-muted text-warning border-warning/30',
  danger: 'bg-danger-muted text-danger border-danger/30',
}

export function Tag({ variant = 'primary', children, onRemove }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 hover:opacity-100"
        >
          &times;
        </button>
      )}
    </span>
  )
}
