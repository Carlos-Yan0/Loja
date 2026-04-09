import { createHmac, timingSafeEqual } from 'node:crypto'

interface SignatureParts {
  ts: string
  v1: string
}

export interface ValidateMercadoPagoWebhookSignatureInput {
  secret: string
  xSignature: string | undefined
  xRequestId: string | undefined
  dataId: string | undefined
  maxSkewMs?: number
  nowMs?: number
}

const parseSignatureParts = (xSignature: string | undefined): SignatureParts | null => {
  if (!xSignature) return null

  let ts = ''
  let v1 = ''
  const parts = xSignature.split(',')

  for (const part of parts) {
    const [rawKey, rawValue] = part.split('=')
    const key = String(rawKey ?? '').trim().toLowerCase()
    const value = String(rawValue ?? '').trim()

    if (key === 'ts') ts = value
    if (key === 'v1') v1 = value.toLowerCase()
  }

  if (!ts || !v1) return null
  return { ts, v1 }
}

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export const validateMercadoPagoWebhookSignature = ({
  secret,
  xSignature,
  xRequestId,
  dataId,
  maxSkewMs = 5 * 60 * 1000,
  nowMs = Date.now(),
}: ValidateMercadoPagoWebhookSignatureInput) => {
  const signatureParts = parseSignatureParts(xSignature)
  const requestId = String(xRequestId ?? '').trim()
  const normalizedDataId = String(dataId ?? '').trim()
  const normalizedSecret = String(secret ?? '').trim()

  if (!signatureParts || !normalizedSecret) {
    return false
  }

  const tsAsNumber = Number(signatureParts.ts)
  if (!Number.isFinite(tsAsNumber)) return false

  if (Number.isFinite(maxSkewMs) && maxSkewMs > 0) {
    const skew = Math.abs(nowMs - tsAsNumber)
    if (skew > maxSkewMs) return false
  }

  const manifestParts: string[] = []
  if (normalizedDataId) manifestParts.push(`id:${normalizedDataId};`)
  if (requestId) manifestParts.push(`request-id:${requestId};`)
  manifestParts.push(`ts:${signatureParts.ts};`)
  const manifest = manifestParts.join('')

  const expected = createHmac('sha256', normalizedSecret).update(manifest).digest('hex').toLowerCase()
  return safeCompare(expected, signatureParts.v1)
}
