import { normalizeReceipt } from './order'

const paidOrderStatuses = new Set(['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'])
const paidPaymentStatuses = new Set(['APPROVED', 'REFUNDED'])

const toNumber = (value) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export const canViewReceiptForOrder = (order) => {
  if (!order) return false

  if (paidPaymentStatuses.has(order.payment?.status)) {
    return true
  }

  return paidOrderStatuses.has(order.status)
}

export const buildReceiptFromOrder = (order) => {
  if (!order) return null

  const items = Array.isArray(order.items)
    ? order.items.map((item) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = toNumber(item.price)
        return {
          description: item.product?.name ?? `Produto ${String(item.productId ?? '').slice(0, 8)}`,
          quantity,
          unitPrice,
          subtotal: Number((quantity * unitPrice).toFixed(2)),
        }
      })
    : []

  const subtotalFromItems = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2))
  const shipping = toNumber(order.shipping)
  const total = toNumber(order.total)

  return normalizeReceipt({
    issuedAt: order.createdAt,
    orderNumber: order.id,
    customerName: order.user?.name ?? 'Cliente',
    paymentMethod: order.payMethod,
    deliveryAddress: {
      cep: '',
      street: 'Nao informado',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Nao informado',
      state: '--',
    },
    items,
    subtotal: subtotalFromItems,
    shipping,
    total: total > 0 ? total : subtotalFromItems + shipping,
  })
}
