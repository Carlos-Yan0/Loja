import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { readJson } from '../helpers/http'

describe('shipping and postal-code routes', () => {
  it('looks up a CEP and calculates shipping', async () => {
    const { app, productRepository } = createTestApp()
    const product = await productRepository.create({
      name: 'Vestido',
      price: 220,
      category: 'Moda',
      stock: 3,
    })

    const postalResponse = await app.handle(
      new Request(`http://localhost/postal-code/01001000`)
    )
    expect(postalResponse.status).toBe(200)
    const postalBody = await readJson<{ city: string; state: string }>(postalResponse)
    expect(postalBody.city).toBe('Sao Paulo')
    expect(postalBody.state).toBe('SP')

    const shippingResponse = await app.handle(
      new Request('http://localhost/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: '01001000',
          items: [{ productId: product.id, quantity: 2 }],
        }),
      })
    )
    expect(shippingResponse.status).toBe(200)
    const shippingBody = await readJson<{ subtotal: number; shipping: number; total: number }>(
      shippingResponse
    )
    expect(shippingBody.subtotal).toBe(440)
    expect(shippingBody.shipping).toBeGreaterThan(0)
    expect(shippingBody.total).toBe(shippingBody.subtotal + shippingBody.shipping)
  })
})
