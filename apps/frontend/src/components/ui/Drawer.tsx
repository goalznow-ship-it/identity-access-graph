import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'left' | 'right'
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`absolute top-0 h-full w-80 border-border bg-surface p-6 shadow-glass
              ${side === 'right' ? 'right-0 border-l' : 'left-0 border-r'}`}
          >
            {title && (
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300"
                >
                  &times;
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
