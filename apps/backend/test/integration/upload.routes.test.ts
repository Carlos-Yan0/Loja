import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('upload routes', () => {
  it('uploads a product image and stores the public URL on Product.images', async () => {
    const { app, productRepository } = createTestApp()
    const cookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    const product = await productRepository.create({
      name: 'Monitor',
      price: 899.9,
      category: 'Hardware',
      stock: 3,
    })

    const formData = new FormData()
    formData.set('productId', product.id)
    formData.set('file', new File([pngBytes], 'monitor.png', { type: 'image/png' }))

    const response = await app.handle(
      new Request('http://localhost/upload/product-image', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: formData,
      })
    )

    expect(response.status).toBe(201)
    const body = await readJson<{ data: { imageUrl: string; product: { images: string[] } } }>(
      response
    )

    expect(body.data.imageUrl).toContain(product.id)
    expect(body.data.product.images).toContain(body.data.imageUrl)
  })

  it('uploads a home banner image to the banners bucket', async () => {
    const { app } = createTestApp()
    const cookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    const formData = new FormData()
    formData.set('file', new File([pngBytes], 'banner.png', { type: 'image/png' }))

    const response = await app.handle(
      new Request('http://localhost/upload/banner-image', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: formData,
      })
    )

    expect(response.status).toBe(201)
    const body = await readJson<{ data: { imageUrl: string; imagePath: string } }>(response)

    expect(body.data.imagePath).toContain('home/')
    expect(body.data.imageUrl).toContain('/banners/')
  })
})
