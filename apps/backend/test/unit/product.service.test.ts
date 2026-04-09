import { describe, expect, it } from 'bun:test'
import { ProductService } from '../../src/modules/product/application/product-service'
import { InMemoryProductRepository } from '../helpers/in-memory-dependencies'

describe('ProductService', () => {
  it('normalizes tags and image URLs when creating a product', async () => {
    const repository = new InMemoryProductRepository()
    const service = new ProductService(repository)

    const product = await service.create({
      name: '  Camiseta Premium  ',
      price: 99.9,
      category: '  Moda  ',
      tags: ['novo', 'novo', ' algodao '],
      stock: 10,
      images: ['https://cdn.test/a.png', ' https://cdn.test/a.png '],
    })

    expect(product.name).toBe('Camiseta Premium')
    expect(product.category).toBe('Moda')
    expect(product.tags).toEqual(['novo', 'algodao'])
    expect(product.images).toEqual(['https://cdn.test/a.png'])
  })

  it('blocks updates without any valid field', async () => {
    const repository = new InMemoryProductRepository()
    const service = new ProductService(repository)

    const created = await service.create({
      name: 'Produto',
      price: 10,
      category: 'Categoria',
      stock: 1,
    })

    await expect(service.update(created.id, {})).rejects.toThrow(
      'Nenhum campo valido foi enviado para atualizacao.'
    )
  })
})
