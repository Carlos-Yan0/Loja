import { beforeEach, describe, expect, it } from 'bun:test'
import { ProductService } from '../../src/modules/product/application/product-service'
import { UploadProductImageService } from '../../src/modules/upload/application/upload-product-image-service'
import {
  InMemoryProductRepository,
  InMemoryStorageGateway,
} from '../helpers/in-memory-dependencies'

describe('UploadProductImageService', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.SUPABASE_STORAGE_BUCKET = 'products'
  })

  it('uploads an image and appends the public URL to the product', async () => {
    const productRepository = new InMemoryProductRepository()
    const productService = new ProductService(productRepository)
    const storageGateway = new InMemoryStorageGateway()
    const service = new UploadProductImageService(productService, storageGateway)

    const product = await productRepository.create({
      name: 'Notebook',
      price: 4500,
      category: 'Informatica',
      stock: 2,
    })

    const file = new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'image.png',
      {
      type: 'image/png',
      }
    )

    const result = await service.execute({ productId: product.id, file })

    expect(result.imageUrl).toContain(product.id)
    expect(result.product.images).toContain(result.imageUrl)
    expect(storageGateway.uploadedPaths).toHaveLength(1)
  })

  it('deletes the uploaded file when persisting the URL fails', async () => {
    const storageGateway = new InMemoryStorageGateway()
    const failingProductService = {
      appendImage: async () => {
        throw new Error('db failure')
      },
    } as unknown as ProductService

    const service = new UploadProductImageService(failingProductService, storageGateway)

    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], 'image.jpg', {
      type: 'image/jpeg',
    })

    await expect(
      service.execute({ productId: crypto.randomUUID(), file })
    ).rejects.toThrow('db failure')

    expect(storageGateway.deletedPaths).toHaveLength(1)
  })
})
