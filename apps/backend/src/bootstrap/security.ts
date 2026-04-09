import { Elysia } from 'elysia'
import { env } from '../config/env'
import { tooManyRequests, payloadTooLarge } from '../shared/errors/error-factory'
import { InMemoryRateLimiter } from '../shared/security/rate-limiter'

const limiter = new InMemoryRateLimiter()

const getClientKey = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'local'
}

const getBodyLimit = (request: Request) => {
  const pathname = new URL(request.url).pathname
  return pathname.startsWith('/upload') ? env.upload.maxImageBytes : env.security.maxJsonPayloadBytes
}

const getRateLimit = (request: Request) => {
  const pathname = new URL(request.url).pathname
  if (pathname.startsWith('/payments/webhooks')) {
    return env.security.maxWebhookRequestsPerWindow
  }

  return pathname.startsWith('/upload')
    ? env.security.maxUploadRequestsPerWindow
    : env.security.maxRequestsPerWindow
}

export const securityPlugin = new Elysia({ name: 'security-plugin' })
  .onRequest(({ request }) => {
    const key = `${getClientKey(request)}:${new URL(request.url).pathname}`
    const result = limiter.consume(key, getRateLimit(request), env.security.windowMs)

    if (!result.allowed) {
      throw tooManyRequests()
    }

    const contentLengthHeader = request.headers.get('content-length')
    if (!contentLengthHeader) return

    const contentLength = Number(contentLengthHeader)
    if (Number.isFinite(contentLength) && contentLength > getBodyLimit(request)) {
      throw payloadTooLarge('Payload excede o limite configurado.')
    }
  })
  .onAfterHandle(({ set }) => {
    set.headers['x-content-type-options'] = 'nosniff'
    set.headers['x-frame-options'] = 'DENY'
    set.headers['referrer-policy'] = 'no-referrer'
    set.headers['permissions-policy'] = 'camera=(), microphone=(), geolocation=()'
    set.headers['cross-origin-opener-policy'] = 'same-origin'
    set.headers['content-security-policy'] = "default-src 'none'; frame-ancestors 'none'"
    return
  })
