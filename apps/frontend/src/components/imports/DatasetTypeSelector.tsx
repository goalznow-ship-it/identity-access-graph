import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { DatasetType } from '../../types/import'

const datasetTypes: DatasetType[] = [
  'Users', 'Groups', 'Group Memberships', 'Departments', 'Teams', 'Managers',
  'Roles', 'Permissions',
  'Computers', 'Linux Hosts', 'Linux Users', 'Linux Groups',
  'Sudo Policies', 'SSH Keys',
  'Applications', 'Databases', 'Business Services', 'Service Accounts',
  'Unknown',
]

interface DatasetTypeSelectorProps {
  value: DatasetType
  confidence: number
  onChange: (type: DatasetType) => void
}

export function DatasetTypeSelector({ value, confidence, onChange }: DatasetTypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
      >
        <span>{value}</span>
        {confidence > 0 && (
          <span className={`text-[10px] ${confidence > 70 ? 'text-green-400' : confidence > 40 ? 'text-yellow-400' : 'text-gray-500'}`}>
            {confidence}%
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {datasetTypes.map((dt) => (
            <button
              key={dt}
              onClick={() => { onChange(dt); setOpen(false) }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                dt === value ? 'bg-primary-muted text-primary' : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className={`h-3 w-3 rounded-full border ${dt === value ? 'border-primary bg-primary' : 'border-gray-600'}`}>
                {dt === value && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              {dt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
