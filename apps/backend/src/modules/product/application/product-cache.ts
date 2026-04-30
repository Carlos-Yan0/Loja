import type { Product, ProductFilters } from '../domain/product'
import type { RedisClient } from '../../../libs/redis'

const PRODUCTS_CACHE_VERSION_KEY = 'cache:products:version'

const stableStringify = (value: unknown) => {
  if (!value || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return JSON.stringify(value)

  const record = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(record).sort()) {
    sorted[key] = record[key]
  }
  return JSON.stringify(sorted)
}

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export class ProductCache {
  constructor(
    private readonly redis: RedisClient,
    private readonly options: {
      ttlSeconds: number
    }
  ) {}

  async getCachedList(filters: ProductFilters) {
    const version = await this.getVersion()
    const key = `cache:products:list:v${version}:${stableStringify(filters)}`
    const cached = await this.redis.get(key)
    if (!cached) return null
    return safeJsonParse<Product[]>(cached)
  }

  async setCachedList(filters: ProductFilters, products: Product[]) {
    const version = await this.getVersion()
    const key = `cache:products:list:v${version}:${stableStringify(filters)}`
    await this.redis.set(key, JSON.stringify(products), { EX: this.options.ttlSeconds })
  }

  async getCachedById(productId: string) {
    const version = await this.getVersion()
    const key = `cache:products:byId:v${version}:${productId}`
    const cached = await this.redis.get(key)
    if (!cached) return null
    return safeJsonParse<Product>(cached)
  }

  async setCachedById(product: Product) {
    const version = await this.getVersion()
    const key = `cache:products:byId:v${version}:${product.id}`
    await this.redis.set(key, JSON.stringify(product), { EX: this.options.ttlSeconds })
  }

  async bumpVersion() {
    await this.redis.incr(PRODUCTS_CACHE_VERSION_KEY)
  }

  private async getVersion() {
    const cached = await this.redis.get(PRODUCTS_CACHE_VERSION_KEY)
    if (cached) return cached
    await this.redis.set(PRODUCTS_CACHE_VERSION_KEY, '1', { NX: true })
    return '1'
  }
}

