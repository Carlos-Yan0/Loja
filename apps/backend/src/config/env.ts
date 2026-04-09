import 'dotenv/config'

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const parseEnum = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  const match = allowed.find((entry) => entry.toLowerCase() === normalized)
  return match ?? fallback
}

const trimTrailingSlash = (value: string | undefined) => value?.replace(/\/+$/, '')
const port = parseNumber(process.env.PORT, 3000)

export const env = {
  port,
  backendPublicUrl: trimTrailingSlash(process.env.BACKEND_PUBLIC_URL) ?? `http://localhost:${port}`,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  upload: {
    maxImageBytes: parseNumber(process.env.UPLOAD_MAX_IMAGE_BYTES, 5 * 1024 * 1024),
  },
  security: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    maxRequestsPerWindow: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 120),
    maxUploadRequestsPerWindow: parseNumber(process.env.RATE_LIMIT_MAX_UPLOAD_REQUESTS, 20),
    maxWebhookRequestsPerWindow: parseNumber(process.env.RATE_LIMIT_MAX_WEBHOOK_REQUESTS, 40),
    maxJsonPayloadBytes: parseNumber(process.env.MAX_JSON_PAYLOAD_BYTES, 256 * 1024),
  },
  supabase: {
    url: trimTrailingSlash(process.env.SUPABASE_URL),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'products',
    bannersBucket: process.env.SUPABASE_STORAGE_BANNERS_BUCKET ?? 'banners',
  },
  order: {
    customerCancelWindowHours: parseNumber(process.env.ORDER_CUSTOMER_CANCEL_WINDOW_HOURS, 8),
  },
  payment: {
    currency: process.env.PAYMENT_CURRENCY ?? 'BRL',
    webhookToken: process.env.PAYMENT_WEBHOOK_TOKEN,
    providerTimeoutMs: parseNumber(process.env.PAYMENT_PROVIDER_TIMEOUT_MS, 10_000),
  },
  mercadoPago: {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    webhookMaxSkewMs: parseNumber(process.env.MERCADO_PAGO_WEBHOOK_MAX_SKEW_MS, 5 * 60 * 1000),
    checkoutUrlMode: parseEnum(
      process.env.MERCADO_PAGO_CHECKOUT_URL_MODE,
      ['AUTO', 'PRODUCTION', 'SANDBOX'] as const,
      'AUTO'
    ),
    apiBaseUrl:
      trimTrailingSlash(process.env.MERCADO_PAGO_API_BASE_URL) ?? 'https://api.mercadopago.com',
    useMockProvider: parseBoolean(process.env.MERCADO_PAGO_USE_MOCK, false),
  },
}

export const hasSupabaseStorageConfig = () =>
  Boolean(env.supabase.url && env.supabase.serviceRoleKey && env.supabase.bucket)

export const shouldUseMockPaymentProvider = () =>
  env.mercadoPago.useMockProvider || !env.mercadoPago.accessToken
