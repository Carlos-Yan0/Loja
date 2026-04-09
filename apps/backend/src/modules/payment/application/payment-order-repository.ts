import type { Order, OrderStatus } from '../../order/domain/order'

export interface PaymentOrderRepository {
  findById(id: string): Promise<Order | null>
  updateStatus(id: string, status: OrderStatus): Promise<Order>
  confirmPayment(id: string): Promise<Order>
}
