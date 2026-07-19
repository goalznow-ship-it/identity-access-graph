import { BadRequestException } from '@nestjs/common'

export function optionalInteger(value: string | undefined, name: string, options: { min?: number; max?: number } = {}) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  const min = options.min ?? 0
  const max = options.max ?? Number.MAX_SAFE_INTEGER
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`${name} must be an integer between ${min} and ${max}`)
  }
  return parsed
}

export function optionalBoolean(value: string | undefined, name: string) {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  throw new BadRequestException(`${name} must be true or false`)
}

export function optionalEnum<T extends string>(value: string | undefined, name: string, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined
  if (allowed.includes(value as T)) return value as T
  throw new BadRequestException(`${name} must be one of ${allowed.join(', ')}`)
}
