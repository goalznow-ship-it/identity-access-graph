import { InputHTMLAttributes } from 'react'

interface SearchBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function SearchBox({ value, onChange, className = '', ...props }: SearchBoxProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3
          text-sm text-gray-100 placeholder-gray-500 transition-colors duration-200
          focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
    </div>
  )
}
