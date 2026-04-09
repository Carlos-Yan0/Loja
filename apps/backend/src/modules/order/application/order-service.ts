import type { OrderRepository } from './order-repository'
import type {
  CreateOrderInput,
  CreateOrderResult,
  DeliveryAddressInput,
  OrderStatus,
  PaymentMethod,
} from '../domain/order'
import type { ShippingService } from '../../shipping/application/shipping-service'
import { badRequest, notFound } from '../../../shared/errors/error-factory'
import { ensureUuid, normalizeOptionalText, normalizeText } from '../../../shared/utils/normalize'

const paymentMethods = new Set<PaymentMethod>(['PIX', 'CREDIT_CARD', 'BOLETO'])
const orderStatuses = new Set<OrderStatus>([
  'AWAITING_PAYMENT',
  'COMPLETED',
  'PROCESSING',
  'CANCELED',
  'DELIVERED',
  'IN_TRANSIT',
])
const customerNonCancelableStatuses = new Set<OrderStatus>(['CANCELED', 'DELIVERED', 'COMPLETED'])

interface OrderServiceOptions {
  customerCancelWindowHours?: number
}

export class OrderService {
  private readonly customerCancelWindowHours: number

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly shippingService: ShippingService,
    options: OrderServiceOptions = {}
  ) {
    this.customerCancelWindowHours = Math.max(1, Math.floor(options.customerCancelWindowHours ?? 8))
  }

  async create(input: CreateOrderInput): Promise<CreateOrderResult> {
    const userId = ensureUuid(input.userId, 'Usuario')

    if (!paymentMethods.has(input.payMethod)) {
      throw badRequest('Metodo de pagamento invalido.')
    }

    const normalizedAddress = this.normalizeDeliveryAddress(input.deliveryAddress)

    const quote = await this.shippingService.quote({
      cep: normalizedAddress.cep,
      items: input.items,
    })

    const order = await this.orderRepository.create({
      userId,
      payMethod: input.payMethod,
      items: quote.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      shipping: quote.shipping,
      total: quote.total,
    })

    const deliveryAddress = {
      ...quote.destination,
      number: normalizedAddress.number,
      complement: normalizedAddress.complement ?? null,
    }

    return {
      order,
      receipt: {
        issuedAt: order.createdAt,
        orderNumber: order.id,
        customerName: order.user?.name ?? 'Cliente',
        paymentMethod: order.payMethod,
        deliveryAddress,
        items: quote.items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: quote.subtotal,
        shipping: quote.shipping,
        total: quote.total,
      },
    }
  }

  findAll() {
    return this.orderRepository.findAll()
  }

  findByUserId(userId: string) {
    return this.orderRepository.findByUserId(ensureUuid(userId, 'Usuario'))
  }

  async findById(id: string) {
    const order = await this.orderRepository.findById(ensureUuid(id, 'Pedido'))

    if (!order) {
      throw notFound('Pedido nao encontrado.')
    }

    return order
  }

  async updateStatus(id: string, status: OrderStatus) {
    const orderId = ensureUuid(id, 'Pedido')
    await this.findById(orderId)

    if (!orderStatuses.has(status)) {
      throw badRequest('Status do pedido invalido.')
    }

    return this.orderRepository.updateStatus(orderId, status)
  }

  async cancelByCustomer(userId: string, orderId: string) {
    const normalizedUserId = ensureUuid(userId, 'Usuario')
    const normalizedOrderId = ensureUuid(orderId, 'Pedido')
    const order = await this.findById(normalizedOrderId)

    if (order.userId !== normalizedUserId) {
      throw notFound('Pedido nao encontrado.')
    }

    if (customerNonCancelableStatuses.has(order.status)) {
      throw badRequest('Este pedido nao pode mais ser cancelado.')
    }

    const createdAt = new Date(order.createdAt).getTime()
    if (!Number.isFinite(createdAt)) {
      throw badRequest('Data de criacao do pedido invalida.')
    }

    const elapsedMs = Date.now() - createdAt
    const cancelWindowMs = this.customerCancelWindowHours * 60 * 60 * 1000
    if (elapsedMs > cancelWindowMs) {
      throw badRequest(
        `Cancelamento permitido apenas ate ${this.customerCancelWindowHours} hora(s) apos o pedido.`
      )
    }

    return this.orderRepository.updateStatus(normalizedOrderId, 'CANCELED')
  }

  private normalizeDeliveryAddress(address: DeliveryAddressInput) {
    return {
      cep: address.cep,
      number: normalizeText(address.number, { field: 'Numero', maxLength: 20 }),
      complement: normalizeOptionalText(address.complement, {
        field: 'Complemento',
        maxLength: 120,
      }),
    }
  }
}
