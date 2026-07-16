import { ReactNode, useState } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const sideStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
}

const arrowStyles = {
  top: 'left-1/2 top-full -translate-x-1/2 border-t-gray-800',
  right: 'top-1/2 right-full -translate-y-1/2 border-r-gray-800',
  bottom: 'left-1/2 bottom-full -translate-x-1/2 border-b-gray-800',
  left: 'top-1/2 left-full -translate-y-1/2 border-l-gray-800',
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1.5 text-xs text-gray-200 shadow-soft ${sideStyles[side]}`}
        >
          {content}
          <div
            className={`absolute border-4 border-transparent ${arrowStyles[side]}`}
          />
        </div>
      )}
    </div>
  )
}
