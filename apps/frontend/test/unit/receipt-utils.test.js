import { describe, expect, it } from 'bun:test'
import { buildReceiptFromOrder, canViewReceiptForOrder } from '../../src/utils/receipt'

describe('receipt utils', () => {
  const baseOrder = {
    id: '68fc1177-1111-2222-3333-444444444444',
    createdAt: '2026-04-21T23:53:00.000Z',
    payMethod: 'PIX',
    shipping: 9.9,
    total: 1008.9,
    status: 'PROCESSING',
    user: {
      name: 'satella',
    },
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 1,
        price: 999,
        product: {
          name: 'satella',
        },
      },
    ],
  }

  it('allows receipt when payment is approved', () => {
    expect(
      canViewReceiptForOrder({
        ...baseOrder,
        status: 'AWAITING_PAYMENT',
        payment: { status: 'APPROVED' },
      })
    ).toBe(true)
  })

  it('allows receipt when order already moved to fulfillment statuses', () => {
    expect(
      canViewReceiptForOrder({
        ...baseOrder,
        payment: null,
      })
    ).toBe(true)
  })

  it('blocks receipt while order/payment is still pending', () => {
    expect(
      canViewReceiptForOrder({
        ...baseOrder,
        status: 'AWAITING_PAYMENT',
        payment: { status: 'PENDING' },
      })
    ).toBe(false)
  })

  it('builds a printable simplified receipt from order payload', () => {
    const receipt = buildReceiptFromOrder({
      ...baseOrder,
      payment: { status: 'APPROVED' },
    })

    expect(receipt.orderNumber).toBe(baseOrder.id)
    expect(receipt.customerName).toBe('satella')
    expect(receipt.items[0].description).toBe('satella')
    expect(receipt.items[0].subtotal).toBe(999)
    expect(receipt.shipping).toBe(9.9)
    expect(receipt.total).toBe(1008.9)
  })
})
