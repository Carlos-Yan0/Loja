import type { OrderService } from '../application/order-service'
import type { CreateOrderInput, OrderStatus } from '../domain/order'

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  create(input: CreateOrderInput) {
    return this.orderService.create(input)
  }

  list() {
    return this.orderService.findAll()
  }

  listByUserId(userId: string) {
    return this.orderService.findByUserId(userId)
  }

  getById(id: string) {
    return this.orderService.findById(id)
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.orderService.updateStatus(id, status)
  }

  cancelByCustomer(userId: string, orderId: string) {
    return this.orderService.cancelByCustomer(userId, orderId)
  }
}
