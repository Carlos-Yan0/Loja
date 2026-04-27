import { describe, expect, it } from 'bun:test'
import { createHmac } from 'node:crypto'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

const buildWebhookSignature = (dataId: string, requestId: string, ts: string) => {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? 'test-webhook-secret'
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${hash}`
}

describe('payment routes', () => {
  it('creates checkout for an order and updates order status via idempotent webhook', async () => {
    const { app, productRepository, paymentGateway } = createTestApp()
    const userId = crypto.randomUUID()
    const cookie = createAuthCookie({ sub: userId, role: 'CUSTOMER' })

    const product = await productRepository.create({
      name: 'Camiseta',
      price: 79.9,
      category: 'Moda',
      stock: 5,
    })

    const createOrderResponse = await app.handle(
      new Request('http://localhost/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          payMethod: 'PIX',
          deliveryAddress: {
            cep: '01001000',
            number: '100',
          },
          items: [
            {
              productId: product.id,
              quantity: 1,
            },
          ],
        }),
      })
    )

    expect(createOrderResponse.status).toBe(201)
    const createOrderBody = await readJson<{ data: { order: { id: string } } }>(createOrderResponse)
    const orderId = createOrderBody.data.order.id

    const createCheckoutResponse = await app.handle(
      new Request(`http://localhost/payments/order/${orderId}/checkout`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
        },
      })
    )

    expect(createCheckoutResponse.status).toBe(201)
    const checkoutBody = await readJson<{
      data: { externalId: string; status: string; walletBrick: { preferenceId: string; publicKey: string } | null }
    }>(
      createCheckoutResponse
    )
    expect(checkoutBody.data.status).toBe('PENDING')
    expect(checkoutBody.data.walletBrick).toBeNull()
    paymentGateway.setPaymentMethod(checkoutBody.data.externalId, 'CREDIT_CARD')

    const getPaymentResponse = await app.handle(
      new Request(`http://localhost/payments/order/${orderId}`, {
        headers: {
          Cookie: cookie,
        },
      })
    )
    expect(getPaymentResponse.status).toBe(200)
    const getPaymentPayload = await readJson<{ status: string }>(getPaymentResponse)
    expect(['PENDING', 'APPROVED']).toContain(getPaymentPayload.status)

    const webhookBody = {
      id: 'webhook-event-1',
      type: 'payment',
      data: {
        id: checkoutBody.data.externalId,
      },
    }
    const requestId = crypto.randomUUID()
    const ts = String(Date.now())
    const signature = buildWebhookSignature(checkoutBody.data.externalId, requestId, ts)

    const webhookResponse = await app.handle(
      new Request(
        `http://localhost/payments/webhooks/mercado-pago?token=test-webhook-token&data.id=${encodeURIComponent(checkoutBody.data.externalId)}&type=payment`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          'x-signature': signature,
        },
        body: JSON.stringify(webhookBody),
      })
    )

    expect(webhookResponse.status).toBe(200)
    const webhookPayload = await readJson<{ duplicated: boolean }>(webhookResponse)
    expect(webhookPayload.duplicated).toBe(false)

    const webhookDuplicateResponse = await app.handle(
      new Request(
        `http://localhost/payments/webhooks/mercado-pago?token=test-webhook-token&data.id=${encodeURIComponent(checkoutBody.data.externalId)}&type=payment`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          'x-signature': signature,
        },
        body: JSON.stringify(webhookBody),
      })
    )

    expect(webhookDuplicateResponse.status).toBe(200)
    const webhookDuplicatePayload = await readJson<{ duplicated: boolean }>(webhookDuplicateResponse)
    expect(webhookDuplicatePayload.duplicated).toBe(true)

    const syncedPaymentResponse = await app.handle(
      new Request(`http://localhost/payments/order/${orderId}?sync=true`, {
        headers: {
          Cookie: cookie,
        },
      })
    )
    expect(syncedPaymentResponse.status).toBe(200)
    const syncedPaymentPayload = await readJson<{ status: string }>(syncedPaymentResponse)
    expect(syncedPaymentPayload.status).toBe('APPROVED')

    const orderResponse = await app.handle(
      new Request(`http://localhost/orders/${orderId}`, {
        headers: {
          Cookie: cookie,
        },
      })
    )

    expect(orderResponse.status).toBe(200)
    const orderBody = await readJson<{ status: string; payMethod: string }>(orderResponse)
    expect(orderBody.status).toBe('PROCESSING')
    expect(orderBody.payMethod).toBe('CREDIT_CARD')

    const updatedProduct = await productRepository.findById(product.id)
    expect(updatedProduct?.stock).toBe(4)
  })

  it('rejects unauthorized webhook requests when token is invalid', async () => {
    const { app } = createTestApp()

    const response = await app.handle(
      new Request('http://localhost/payments/webhooks/mercado-pago?token=invalid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'event-invalid',
          type: 'payment',
          data: {
            id: 'external-1',
          },
        }),
      })
    )

    expect(response.status).toBe(401)
  })
})
