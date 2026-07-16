import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-gray-100
            placeholder-gray-500 transition-colors duration-200
            focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
            ${error ? 'border-danger' : 'border-border'}
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
