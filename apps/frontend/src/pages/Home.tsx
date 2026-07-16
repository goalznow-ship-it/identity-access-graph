import { motion } from 'framer-motion'

export function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full items-center justify-center"
    >
      <h1 className="text-4xl font-bold text-gray-800">
        Identity Access Graph Platform
      </h1>
    </motion.div>
  )
}
