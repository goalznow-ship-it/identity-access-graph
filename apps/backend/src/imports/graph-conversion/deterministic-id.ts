import { createHash } from 'node:crypto'

export function deterministicId(type: string, ...parts: unknown[]): string {
  const seed = parts.map((part) => String(part ?? '').trim().toLowerCase()).join('|')
  return `${type.toLowerCase()}:${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`
}
