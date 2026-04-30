import { createClient } from 'redis'

export type RedisClient = ReturnType<typeof createClient>

export const createRedisClient = (redisUrl: string) => {
  const client = createClient({ url: redisUrl })

  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[redis:error]', message)
  })

  return client
}

