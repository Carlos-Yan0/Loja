import { describe, expect, it } from 'bun:test'
import { OrderService } from '../../src/modules/order/application/order-service'
import { PostalCodeService } from '../../src/modules/postal-code/application/postal-code-service'
import { ShippingService } from '../../src/modules/shipping/application/shipping-service'
import {
  InMemoryOrderRepository,
  InMemoryPostalCodeGateway,
  InMemoryProductRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-dependencies'

describe('OrderService', () => {
  it('uses the current product price and calculates shipping on the server', async () => {
    const productRepository = new InMemoryProductRepository()
    const userRepository = new InMemoryUserRepository()
    const user = await userRepository.create({
      name: 'Cliente',
      email: 'cliente@test.com',
      password: 'hashed:12345678',
    })
    const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )
    const service = new OrderService(orderRepository, shippingService)

    const product = await productRepository.create({
      name: 'Teclado',
      price: 250,
      category: 'Perifericos',
      stock: 5,
    })

    const result = await service.create({
      userId: user.id,
      payMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        number: '100',
      },
      items: [{ productId: product.id, quantity: 2 }],
    })

    expect(result.order.total).toBeGreaterThan(500)
    expect(result.order.items[0]?.price).toBe(250)
    expect(result.receipt.shipping).toBe(result.order.shipping)
    expect(result.receipt.deliveryAddress.city).toBe('Sao Paulo')
  })

  it('rejects items that exceed stock', async () => {
    const productRepository = new InMemoryProductRepository()
    const userRepository = new InMemoryUserRepository()
    const user = await userRepository.create({
      name: 'Cliente',
      email: 'cliente2@test.com',
      password: 'hashed:12345678',
    })
    const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )
    const service = new OrderService(orderRepository, shippingService)

    const product = await productRepository.create({
      name: 'Mouse',
      price: 99,
      category: 'Perifericos',
      stock: 1,
    })

    await expect(
      service.create({
        userId: user.id,
        payMethod: 'PIX',
        deliveryAddress: {
          cep: '01001000',
          number: '100',
        },
        items: [{ productId: product.id, quantity: 2 }],
      })
    ).rejects.toThrow('Estoque insuficiente')
  })

  it('accepts empty complement as optional field', async () => {
    const productRepository = new InMemoryProductRepository()
    const userRepository = new InMemoryUserRepository()
    const user = await userRepository.create({
      name: 'Cliente',
      email: 'cliente3@test.com',
      password: 'hashed:12345678',
    })
    const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )
    const service = new OrderService(orderRepository, shippingService)

    const product = await productRepository.create({
      name: 'Boné',
      price: 49,
      category: 'Acessorios',
      stock: 2,
    })

    const result = await service.create({
      userId: user.id,
      payMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        number: '12',
        complement: '   ',
      },
      items: [{ productId: product.id, quantity: 1 }],
    })

    expect(result.receipt.deliveryAddress.complement).toBeNull()
  })

  it('allows customer cancellation inside the configured window', async () => {
    const productRepository = new InMemoryProductRepository()
    const userRepository = new InMemoryUserRepository()
    const user = await userRepository.create({
      name: 'Cliente',
      email: 'cliente4@test.com',
      password: 'hashed:12345678',
    })
    const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )
    const service = new OrderService(orderRepository, shippingService, {
      customerCancelWindowHours: 8,
    })

    const product = await productRepository.create({
      name: 'Calça',
      price: 180,
      category: 'Moda',
      stock: 3,
    })

    const created = await service.create({
      userId: user.id,
      payMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        number: '44',
      },
      items: [{ productId: product.id, quantity: 1 }],
    })

    const canceled = await service.cancelByCustomer(user.id, created.order.id)
    expect(canceled.status).toBe('CANCELED')
  })

  it('rejects customer cancellation after the configured window', async () => {
    const productRepository = new InMemoryProductRepository()
    const userRepository = new InMemoryUserRepository()
    const user = await userRepository.create({
      name: 'Cliente',
      email: 'cliente5@test.com',
      password: 'hashed:12345678',
    })
    const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
    const shippingService = new ShippingService(
      new PostalCodeService(new InMemoryPostalCodeGateway()),
      productRepository
    )
    const service = new OrderService(orderRepository, shippingService, {
      customerCancelWindowHours: 8,
    })

    const product = await productRepository.create({
      name: 'Jaqueta',
      price: 220,
      category: 'Moda',
      stock: 2,
    })

    const created = await service.create({
      userId: user.id,
      payMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        number: '20',
      },
      items: [{ productId: product.id, quantity: 1 }],
    })

    const storedOrder = orderRepository.items.get(created.order.id)
    if (!storedOrder) {
      throw new Error('Order should exist in memory')
    }

    const pastDate = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString()
    orderRepository.items.set(created.order.id, {
      ...storedOrder,
      createdAt: pastDate,
      updatedAt: pastDate,
    })

    await expect(service.cancelByCustomer(user.id, created.order.id)).rejects.toThrow(
      'Cancelamento permitido apenas'
    )
  })
})
