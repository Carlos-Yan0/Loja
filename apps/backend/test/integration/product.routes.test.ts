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
})
