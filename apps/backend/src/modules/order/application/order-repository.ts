import type { CreateOrderInput, Order, OrderStatus } from '../domain/order'

export interface PricedOrderItem {
  productId: string
  quantity: number
  price: number
}

export interface OrderRepository {
  create(input: {
    userId: string
    payMethod: CreateOrderInput['payMethod']
    items: PricedOrderItem[]
    shipping: number
    total: number
  }): Promise<Order>
  findAll(): Promise<Order[]>
  findById(id: string): Promise<Order | null>
  findByUserId(userId: string): Promise<Order[]>
  updateStatus(id: string, status: OrderStatus): Promise<Order>
  confirmPayment(id: string): Promise<Order>
}
