import type { OrderStatus } from '../../order/domain/order'
import type { PaymentStatus } from '../domain/payment'

export const mapPaymentStatusToOrderStatus = (
  paymentStatus: PaymentStatus,
  currentOrderStatus: OrderStatus
): OrderStatus => {
  const progressedStatuses = new Set<OrderStatus>([
    'PROCESSING',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
  ])

  if (paymentStatus === 'APPROVED') {
    return progressedStatuses.has(currentOrderStatus) ? currentOrderStatus : 'PROCESSING'
  }

  if (paymentStatus === 'REJECTED' || paymentStatus === 'CANCELED' || paymentStatus === 'EXPIRED') {
    if (currentOrderStatus === 'DELIVERED') {
      return currentOrderStatus
    }
    return 'CANCELED'
  }

  if (paymentStatus === 'REFUNDED') {
    return 'CANCELED'
  }

  if (currentOrderStatus === 'CANCELED' || progressedStatuses.has(currentOrderStatus)) {
    return currentOrderStatus
  }

  return 'AWAITING_PAYMENT'
}
