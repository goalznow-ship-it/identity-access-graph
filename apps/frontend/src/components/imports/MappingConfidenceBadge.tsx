import { Badge } from '../ui/Badge'

interface MappingConfidenceBadgeProps {
  confidence: number
  className?: string
}

export function MappingConfidenceBadge({ confidence, className }: MappingConfidenceBadgeProps) {
  const getVariant = (c: number): 'success' | 'warning' | 'secondary' | 'outline' => {
    if (c >= 90) return 'success'
    if (c >= 70) return 'warning'
    if (c > 0) return 'secondary'
    return 'outline'
  }

  const getLabel = (c: number) => {
    if (c >= 90) return 'Exact'
    if (c >= 70) return 'Strong'
    if (c > 0) return 'Weak'
    return 'None'
  }

  return (
    <Badge variant={getVariant(confidence)} className={className}>
      {getLabel(confidence)} {confidence}%
    </Badge>
  )
}
