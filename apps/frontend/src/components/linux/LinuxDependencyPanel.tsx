import type { DependencyNode } from '../../types/linux'

interface LinuxDependencyPanelProps {
  dependencies: DependencyNode[]
}

export function LinuxDependencyPanel({ dependencies }: LinuxDependencyPanelProps) {
  const upstream = dependencies.filter((d) => d.direction === 'upstream')
  const downstream = dependencies.filter((d) => d.direction === 'downstream')

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          Upstream — access providers ({upstream.length})
        </h4>
        {upstream.length === 0 ? (
          <p className="text-sm text-gray-500">No upstream dependencies.</p>
        ) : (
          <div className="space-y-1">
            {upstream.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">
                <span className="text-xs font-medium text-red-300">{d.displayName}</span>
                <span className="text-[10px] text-red-600">{d.nodeType}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          Downstream — dependents ({downstream.length})
        </h4>
        {downstream.length === 0 ? (
          <p className="text-sm text-gray-500">No downstream dependencies.</p>
        ) : (
          <div className="space-y-1">
            {downstream.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-green-900/40 bg-green-950/20 px-3 py-2">
                <span className="text-xs font-medium text-green-300">{d.displayName}</span>
                <span className="text-[10px] text-green-600">{d.nodeType}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
