import type { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  children: ReactNode
  className?: string
}

const colors = {
  primary: 'bg-primary-muted text-primary',
  secondary: 'bg-secondary-muted text-secondary',
  accent: 'bg-accent-muted text-accent',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  info: 'bg-blue-900/30 text-blue-300',
  outline: 'border border-border text-gray-300',
}

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
