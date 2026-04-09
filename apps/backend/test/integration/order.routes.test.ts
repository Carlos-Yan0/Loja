import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

describe('order routes', () => {
  it('covers create, list, get and update status', async () => {
    const { app, productRepository, userRepository } = createTestApp()
    const userId = crypto.randomUUID()
    await userRepository.create({
      name: 'Cliente Teste',
      email: 'cliente@example.com',
      password: 'hashed:12345678',
    })
    const user = [...userRepository.items.values()].find((entry) => entry.email === 'cliente@example.com')
    const cookie = createAuthCookie({ sub: user?.id ?? userId, role: 'CUSTOMER' })

    const product = await productRepository.create({
      name: 'Headset',
      price: 199.9,
      category: 'Audio',
      stock: 5,
    })

    const createResponse = await app.handle(
      new Request('http://localhost/orders', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payMethod: 'PIX',
          deliveryAddress: {
            cep: '01001000',
            number: '10',
          },
          items: [{ productId: product.id, quantity: 2 }],
        }),
      })
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<{ data: { order: { id: string; total: number; shipping: number } } }>(createResponse)
    expect(created.data.order.total).toBeGreaterThan(399.8)
    expect(created.data.order.shipping).toBeGreaterThan(0)

    const listResponse = await app.handle(
      new Request('http://localhost/orders/my', { headers: { Cookie: cookie } })
    )
    const listBody = await readJson<Array<{ id: string }>>(listResponse)
    expect(listBody).toHaveLength(1)

    const getResponse = await app.handle(
      new Request(`http://localhost/orders/${created.data.order.id}`, {
        headers: { Cookie: cookie },
      })
    )
    expect(getResponse.status).toBe(200)

    const adminCookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    const updateResponse = await app.handle(
      new Request(`http://localhost/orders/${created.data.order.id}`, {
        method: 'PUT',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      })
    )
    const updateBody = await readJson<{ data: { status: string } }>(updateResponse)
    expect(updateBody.data.status).toBe('DELIVERED')
  })

  it('allows customer to cancel an order within the allowed window', async () => {
    const { app, productRepository, userRepository } = createTestApp()
    await userRepository.create({
      name: 'Cliente Cancelamento',
      email: 'cancelamento@example.com',
      password: 'hashed:12345678',
    })
    const user = [...userRepository.items.values()].find(
      (entry) => entry.email === 'cancelamento@example.com'
    )
    const cookie = createAuthCookie({ sub: user?.id ?? crypto.randomUUID(), role: 'CUSTOMER' })

    const product = await productRepository.create({
      name: 'Moletom',
      price: 149.9,
      category: 'Moda',
      stock: 10,
    })

    const createResponse = await app.handle(
      new Request('http://localhost/orders', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payMethod: 'PIX',
          deliveryAddress: {
            cep: '01001000',
            number: '99',
          },
          items: [{ productId: product.id, quantity: 1 }],
        }),
      })
    )

    const created = await readJson<{ data: { order: { id: string } } }>(createResponse)

    const cancelResponse = await app.handle(
      new Request(`http://localhost/orders/${created.data.order.id}/cancel`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })
    )

    expect(cancelResponse.status).toBe(200)
    const cancelBody = await readJson<{ data: { status: string } }>(cancelResponse)
    expect(cancelBody.data.status).toBe('CANCELED')
  })

  it('keeps product stock unchanged while order is awaiting payment', async () => {
    const { app, productRepository, userRepository } = createTestApp()
    await userRepository.create({
      name: 'Cliente Estoque',
      email: 'estoque@example.com',
      password: 'hashed:12345678',
    })
    const user = [...userRepository.items.values()].find((entry) => entry.email === 'estoque@example.com')
    const cookie = createAuthCookie({ sub: user?.id ?? crypto.randomUUID(), role: 'CUSTOMER' })

    const product = await productRepository.create({
      name: 'Regata',
      price: 79.9,
      category: 'Moda',
      stock: 6,
    })

    const createResponse = await app.handle(
      new Request('http://localhost/orders', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payMethod: 'PIX',
          deliveryAddress: {
            cep: '01001000',
            number: '10',
          },
          items: [{ productId: product.id, quantity: 2 }],
        }),
      })
    )

    expect(createResponse.status).toBe(201)

    const updatedProduct = await productRepository.findById(product.id)
    expect(updatedProduct?.stock).toBe(6)
  })
})
