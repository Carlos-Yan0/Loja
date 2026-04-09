import { describe, expect, it } from 'bun:test'
import { createInMemoryDependencies } from '../helpers/in-memory-dependencies'

describe('PaymentService', () => {
  it('creates checkout transaction and reconciles order via webhook', async () => {
    const { controllers, productRepository, userRepository } = createInMemoryDependencies()

    const user = await userRepository.create({
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      phone: '11999999999',
      password: 'hashed',
    })

    const product = await productRepository.create({
      name: 'Produto teste',
      price: 100,
      category: 'Roupas',
      stock: 10,
    })

    const orderResult = await controllers.orderController.create({
      userId: user.id,
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
    })

    const checkout = await controllers.paymentController.createCheckoutForOrder({
      orderId: orderResult.order.id,
      userId: user.id,
      role: 'CUSTOMER',
    })

    expect(checkout.status).toBe('PENDING')
    expect(checkout.checkoutUrl).toBeTruthy()
    expect(checkout.externalId).toBeTruthy()
    const productBeforeApproval = await productRepository.findById(product.id)
    expect(productBeforeApproval?.stock).toBe(10)

    const webhookFirst = await controllers.paymentController.processWebhook({
      provider: 'MERCADO_PAGO',
      eventType: 'payment',
      eventId: 'event-1',
      externalId: checkout.externalId ?? undefined,
      signatureValid: true,
      payload: {
        id: 'event-1',
      },
    })

    const webhookDuplicate = await controllers.paymentController.processWebhook({
      provider: 'MERCADO_PAGO',
      eventType: 'payment',
      eventId: 'event-1',
      externalId: checkout.externalId ?? undefined,
      signatureValid: true,
      payload: {
        id: 'event-1',
      },
    })

    expect(webhookFirst.duplicated).toBe(false)
    expect(webhookDuplicate.duplicated).toBe(true)

    const updatedOrder = await controllers.orderController.getById(orderResult.order.id)
    expect(updatedOrder.status).toBe('PROCESSING')
    const productAfterApproval = await productRepository.findById(product.id)
    expect(productAfterApproval?.stock).toBe(9)
  })

  it('does not allow customer to open checkout for another user order', async () => {
    const { controllers, productRepository, userRepository } = createInMemoryDependencies()

    const owner = await userRepository.create({
      name: 'Owner',
      email: 'owner@teste.com',
      phone: '11999990000',
      password: 'hashed',
    })

    const otherUser = await userRepository.create({
      name: 'Other',
      email: 'other@teste.com',
      phone: '11999990001',
      password: 'hashed',
    })

    const product = await productRepository.create({
      name: 'Produto',
      price: 55,
      category: 'Moda',
      stock: 10,
    })

    const orderResult = await controllers.orderController.create({
      userId: owner.id,
      payMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        number: '10',
      },
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
    })

    await expect(
      controllers.paymentController.createCheckoutForOrder({
        orderId: orderResult.order.id,
        userId: otherUser.id,
        role: 'CUSTOMER',
      })
    ).rejects.toThrow('Pedido nao encontrado')
  })
})
