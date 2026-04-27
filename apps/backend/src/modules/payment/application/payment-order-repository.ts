import type { Order, OrderStatus, PaymentMethod } from '../../order/domain/order'

export interface PaymentOrderRepository {
  findById(id: string): Promise<Order | null>
  updateStatus(id: string, status: OrderStatus): Promise<Order>
  updatePayMethod(id: string, payMethod: PaymentMethod): Promise<Order>
  confirmPayment(id: string): Promise<Order>
}
