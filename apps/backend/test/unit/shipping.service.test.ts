import { describe, expect, it } from 'bun:test'
import { PostalCodeService } from '../../src/modules/postal-code/application/postal-code-service'
import { ShippingService } from '../../src/modules/shipping/application/shipping-service'
import { serviceUnavailable } from '../../src/shared/errors/error-factory'
import {
  InMemoryPostalCodeGateway,
  InMemoryProductRepository,
} from '../helpers/in-memory-dependencies'

describe('ShippingService', () => {
  it('returns a quote with subtotal, shipping and destination address', async () => {
    const productRepository = new InMemoryProductRepository()
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )

    const product = await productRepository.create({
      name: 'Jaqueta',
      price: 180,
      category: 'Moda',
      stock: 4,
    })

    const quote = await shippingService.quote({
      cep: '01001000',
      items: [{ productId: product.id, quantity: 2 }],
    })

    expect(quote.subtotal).toBe(360)
    expect(quote.shipping).toBeGreaterThan(0)
    expect(quote.total).toBe(quote.subtotal + quote.shipping)
    expect(quote.destination.state).toBe('SP')
  })

  it('falls back to inferred destination when CEP provider is unavailable', async () => {
    const productRepository = new InMemoryProductRepository()
    const shippingService = new ShippingService(
      new PostalCodeService({
        lookup: async () => {
          throw serviceUnavailable('CEP provider down')
        },
      }),
      productRepository
    )

    const product = await productRepository.create({
      name: 'Camiseta',
      price: 120,
      category: 'Moda',
      stock: 3,
    })

    const quote = await shippingService.quote({
      cep: '89234135',
      items: [{ productId: product.id, quantity: 1 }],
    })

    expect(quote.destination.cep).toBe('89234135')
    expect(quote.destination.state).toBe('PR')
    expect(quote.total).toBe(quote.subtotal + quote.shipping)
  })
})
