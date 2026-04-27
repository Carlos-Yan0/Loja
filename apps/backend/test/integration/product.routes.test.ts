import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

describe('product routes', () => {
  it('covers create, list, update and delete', async () => {
    const { app } = createTestApp()
    const cookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    const createResponse = await app.handle(
      new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Camiseta',
          price: 59.9,
          category: 'Moda',
          tags: ['casual'],
          stock: 5,
        }),
      })
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<{ data: { id: string } }>(createResponse)

    const listResponse = await app.handle(new Request('http://localhost/products'))
    const listBody = await readJson<Array<{ id: string }>>(listResponse)
    expect(listBody).toHaveLength(1)
    expect(listBody[0]?.id).toBe(created.data.id)

    const updateResponse = await app.handle(
      new Request(`http://localhost/products/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ stock: 7 }),
      })
    )

    expect(updateResponse.status).toBe(200)
    const updateBody = await readJson<{ data: { stock: number } }>(updateResponse)
    expect(updateBody.data.stock).toBe(7)

    const deleteResponse = await app.handle(
      new Request(`http://localhost/products/${created.data.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
    )

    expect(deleteResponse.status).toBe(200)
  })

  it('filters products by category, tag and free-text search', async () => {
    const { app } = createTestApp()
    const adminCookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    await app.handle(
      new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          name: 'Camiseta Oversized Preta',
          price: 89.9,
          category: 'Oversized',
          tags: ['streetwear', 'preta'],
          stock: 8,
        }),
      })
    )

    await app.handle(
      new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          name: 'Camisa Social Azul',
          price: 129.9,
          category: 'Social',
          tags: ['alfaiataria'],
          stock: 3,
        }),
      })
    )

    const byCategoryResponse = await app.handle(
      new Request('http://localhost/products?category=over')
    )
    expect(byCategoryResponse.status).toBe(200)
    const byCategory = await readJson<Array<{ name: string }>>(byCategoryResponse)
    expect(byCategory).toHaveLength(1)
    expect(byCategory[0]?.name).toContain('Oversized')

    const byTagResponse = await app.handle(new Request('http://localhost/products?tag=street'))
    const byTag = await readJson<Array<{ name: string }>>(byTagResponse)
    expect(byTag).toHaveLength(1)
    expect(byTag[0]?.name).toContain('Oversized')

    const bySearchResponse = await app.handle(
      new Request('http://localhost/products?search=social')
    )
    const bySearch = await readJson<Array<{ name: string }>>(bySearchResponse)
    expect(bySearch).toHaveLength(1)
    expect(bySearch[0]?.name).toContain('Social')
  })

  it('returns an empty bestsellers list when there are no confirmed sales', async () => {
    const { app, productRepository } = createTestApp()

    await productRepository.create({
      name: 'Produto sem venda A',
      price: 49.9,
      category: 'Teste',
      tags: ['novo'],
      stock: 10,
    })

    await productRepository.create({
      name: 'Produto sem venda B',
      price: 59.9,
      category: 'Teste',
      tags: ['novo'],
      stock: 10,
    })

    const response = await app.handle(new Request('http://localhost/products?sort=bestsellers'))
    expect(response.status).toBe(200)

    const body = await readJson<Array<{ id: string }>>(response)
    expect(body).toEqual([])
  })

  it('ranks bestsellers by confirmed quantity sold and ignores non-confirmed orders', async () => {
    const { app, productRepository, orderRepository } = createTestApp()

    const alpha = await productRepository.create({
      name: 'Alpha',
      price: 30,
      category: 'Ranking',
      tags: ['teste'],
      stock: 30,
    })

    const beta = await productRepository.create({
      name: 'Beta',
      price: 30,
      category: 'Ranking',
      tags: ['teste'],
      stock: 30,
    })

    const gamma = await productRepository.create({
      name: 'Gamma',
      price: 30,
      category: 'Ranking',
      tags: ['teste'],
      stock: 30,
    })

    const betaConfirmedOrder = await orderRepository.create({
      userId: crypto.randomUUID(),
      payMethod: 'PIX',
      items: [{ productId: beta.id, quantity: 3, price: beta.price }],
      shipping: 0,
      total: 90,
    })
    await orderRepository.confirmPayment(betaConfirmedOrder.id)

    const alphaConfirmedOrder = await orderRepository.create({
      userId: crypto.randomUUID(),
      payMethod: 'PIX',
      items: [{ productId: alpha.id, quantity: 3, price: alpha.price }],
      shipping: 0,
      total: 90,
    })
    await orderRepository.confirmPayment(alphaConfirmedOrder.id)

    const alphaAwaitingPaymentOrder = await orderRepository.create({
      userId: crypto.randomUUID(),
      payMethod: 'PIX',
      items: [{ productId: alpha.id, quantity: 2, price: alpha.price }],
      shipping: 0,
      total: 60,
    })

    const gammaCanceledOrder = await orderRepository.create({
      userId: crypto.randomUUID(),
      payMethod: 'PIX',
      items: [{ productId: gamma.id, quantity: 8, price: gamma.price }],
      shipping: 0,
      total: 240,
    })
    await orderRepository.updateStatus(gammaCanceledOrder.id, 'CANCELED')

    const response = await app.handle(new Request('http://localhost/products?sort=bestsellers'))
    expect(response.status).toBe(200)

    const body = await readJson<Array<{ id: string; name: string; soldQuantity?: number }>>(response)
    expect(body.map((product) => product.name)).toEqual(['Alpha', 'Beta'])
    expect(body.map((product) => product.soldQuantity)).toEqual([3, 3])
    expect(body.some((product) => product.id === gamma.id)).toBe(false)

    const awaitingResponse = await app.handle(
      new Request('http://localhost/products?sort=bestsellers&search=Alpha')
    )
    const awaitingBody = await readJson<Array<{ name: string; soldQuantity?: number }>>(awaitingResponse)
    expect(awaitingBody).toEqual([
      expect.objectContaining({
        name: 'Alpha',
        soldQuantity: 3,
      }),
    ])

    expect(alphaAwaitingPaymentOrder.status).toBe('AWAITING_PAYMENT')
  })
})
