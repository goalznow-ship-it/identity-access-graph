import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common'

interface Bucket {
  tokens: number
  last: number
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>()
  private readonly maxTokens: number
  private readonly refillMs: number
  private readonly cleanupInterval: ReturnType<typeof setInterval>

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxTokens = maxRequests
    this.refillMs = windowMs
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, bucket] of this.buckets) {
        if (now - bucket.last > this.refillMs * 2) this.buckets.delete(key)
      }
    }, 60000)
    if (this.cleanupInterval && typeof this.cleanupInterval === 'object') this.cleanupInterval.unref()
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const now = Date.now()
    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = { tokens: this.maxTokens, last: now }
      this.buckets.set(key, bucket)
    }
    const elapsed = now - bucket.last
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + (elapsed / this.refillMs) * this.maxTokens)
    bucket.last = now
    if (bucket.tokens < 1) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS)
    }
    bucket.tokens -= 1
    return true
  }
}
