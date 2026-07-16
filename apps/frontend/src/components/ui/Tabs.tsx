import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  return (
    <div>
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-200
              ${active === tab.id ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {tab.label}
            {active === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="pt-4"
        >
          {tabs.find((t) => t.id === active)?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
