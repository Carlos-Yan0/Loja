import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import { validateMercadoPagoWebhookSignature } from '../../src/modules/payment/infrastructure/mercado-pago-webhook-signature'

describe('validateMercadoPagoWebhookSignature', () => {
  it('returns true for a valid signature', () => {
    const secret = 'test-secret'
    const dataId = '123456'
    const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e'
    const ts = '1742505638683'
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const hash = createHmac('sha256', secret).update(manifest).digest('hex')
    const xSignature = `ts=${ts},v1=${hash}`

    const valid = validateMercadoPagoWebhookSignature({
      secret,
      xSignature,
      xRequestId: requestId,
      dataId,
      maxSkewMs: Number.MAX_SAFE_INTEGER,
    })

    expect(valid).toBe(true)
  })

  it('returns false for invalid signatures or missing fields', () => {
    const secret = 'test-secret'

    expect(
      validateMercadoPagoWebhookSignature({
        secret,
        xSignature: 'ts=1742505638683,v1=invalid',
        xRequestId: 'req-id',
        dataId: '123456',
      })
    ).toBe(false)

    expect(
      validateMercadoPagoWebhookSignature({
        secret,
        xSignature: undefined,
        xRequestId: 'req-id',
        dataId: '123456',
      })
    ).toBe(false)

    const ts = '1742505638683'
    const noRequestManifest = `id:123456;ts:${ts};`
    const noRequestHash = createHmac('sha256', secret).update(noRequestManifest).digest('hex')
    expect(
      validateMercadoPagoWebhookSignature({
        secret,
        xSignature: `ts=${ts},v1=${noRequestHash}`,
        xRequestId: undefined,
        dataId: '123456',
        maxSkewMs: Number.MAX_SAFE_INTEGER,
      })
    ).toBe(true)

    expect(
      validateMercadoPagoWebhookSignature({
        secret,
        xSignature: 'ts=1742505638683,v1=abc',
        xRequestId: undefined,
        dataId: '123456',
      })
    ).toBe(false)
  })

  it('rejects signatures outside accepted timestamp skew', () => {
    const secret = 'test-secret'
    const dataId = '123456'
    const requestId = 'req-1'
    const ts = '1000'
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const hash = createHmac('sha256', secret).update(manifest).digest('hex')

    const valid = validateMercadoPagoWebhookSignature({
      secret,
      xSignature: `ts=${ts},v1=${hash}`,
      xRequestId: requestId,
      dataId,
      nowMs: 1000 + 10_000,
      maxSkewMs: 5_000,
    })

    expect(valid).toBe(false)
  })
})
