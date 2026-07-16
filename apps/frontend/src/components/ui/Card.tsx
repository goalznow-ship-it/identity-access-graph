import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
}

export function Card({ children, className = '', glass = true }: CardProps) {
  return (
    <div
      className={`rounded-xl ${
        glass
          ? 'border bg-card shadow-glass backdrop-blur-glass'
          : 'bg-surface shadow-soft'
      } ${className}`}
    >
      {children}
    </div>
  )
}
