import { ReactNode } from 'react'

interface SectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Section({ title, description, children, className = '' }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title && (
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
