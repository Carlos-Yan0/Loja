interface BucketState {
  count: number
  resetAt: number
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, BucketState>()

  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const current = this.buckets.get(key)

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfterMs: 0 }
    }

    if (current.count >= limit) {
      return { allowed: false, retryAfterMs: current.resetAt - now }
    }

    current.count += 1
    this.buckets.set(key, current)
    return { allowed: true, retryAfterMs: 0 }
  }
}
