interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
  children: string
}

const colors = {
  primary: 'bg-primary-muted text-primary',
  secondary: 'bg-secondary-muted text-secondary',
  accent: 'bg-accent-muted text-accent',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
}

export function Badge({ variant = 'primary', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {children}
    </span>
  )
}
