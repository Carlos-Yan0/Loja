import type { PrismaClient } from '../../../../generated/prisma/client'
import type { OrderRepository, PricedOrderItem } from '../application/order-repository'
import type { Order, OrderStatus, PaymentMethod } from '../domain/order'
import { withDatabaseErrorHandling } from '../../../libs/prisma'
import { badRequest } from '../../../shared/errors/error-factory'

const orderSelect = {
  id: true,
  status: true,
  total: true,
  shipping: true,
  PayMethod: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      price: true,
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  },
  paymentTransactions: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      provider: true,
      status: true,
      checkoutUrl: true,
      externalId: true,
      updatedAt: true,
    },
  },
} as const

type PrismaOrderRecord = {
  id: string
  status: OrderStatus
  total: number
  shipping: number
  PayMethod: PaymentMethod
  userId: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
  }
  items: {
    id: string
    productId: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      images: string[]
    }
  }[]
  paymentTransactions: {
    provider: 'MERCADO_PAGO' | 'MOCK'
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED'
    checkoutUrl: string | null
    externalId: string | null
    updatedAt: Date
  }[]
}

const toDomain = (order: PrismaOrderRecord): Order => ({
  id: order.id,
  status: order.status,
  total: order.total,
  shipping: order.shipping,
  payMethod: order.PayMethod,
  userId: order.userId,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
  payment: order.paymentTransactions[0]
    ? {
        provider: order.paymentTransactions[0].provider,
        status: order.paymentTransactions[0].status,
        checkoutUrl: order.paymentTransactions[0].checkoutUrl,
        externalId: order.paymentTransactions[0].externalId,
        updatedAt: order.paymentTransactions[0].updatedAt.toISOString(),
      }
    : null,
  user: order.user,
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    product: item.product,
  })),
})

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: Pick<PrismaClient, 'order' | 'product' | '$transaction'>) {}

  async create(input: {
    userId: string
    payMethod: PaymentMethod
    items: PricedOrderItem[]
    shipping: number
    total: number
  }) {
    const order = await withDatabaseErrorHandling(() =>
      this.prisma.order.create({
        data: {
          userId: input.userId,
          status: 'AWAITING_PAYMENT',
          total: input.total,
          shipping: input.shipping,
          PayMethod: input.payMethod,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        select: orderSelect,
      })
    )

    return toDomain(order)
  }

  async findAll() {
    const orders = await withDatabaseErrorHandling(() =>
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        select: orderSelect,
      })
    )

    return orders.map(toDomain)
  }

  async findById(id: string) {
    const order = await withDatabaseErrorHandling(() =>
      this.prisma.order.findUnique({
        where: { id },
        select: orderSelect,
      })
    )

    return order ? toDomain(order) : null
  }

  async findByUserId(userId: string) {
    const orders = await withDatabaseErrorHandling(() =>
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: orderSelect,
      })
    )

    return orders.map(toDomain)
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await withDatabaseErrorHandling(() =>
      this.prisma.order.update({
        where: { id },
        data: { status },
        select: orderSelect,
      })
    )

    return toDomain(order)
  }

  async updatePayMethod(id: string, payMethod: PaymentMethod) {
    const order = await withDatabaseErrorHandling(() =>
      this.prisma.order.update({
        where: { id },
        data: { PayMethod: payMethod },
        select: orderSelect,
      })
    )

    return toDomain(order)
  }

  async confirmPayment(id: string) {
    const order = await withDatabaseErrorHandling(() =>
      this.prisma.$transaction(async (transaction) => {
        const current = await transaction.order.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        })

        if (!current) {
          throw badRequest('Pedido nao encontrado para confirmacao de pagamento.')
        }

        if (current.status === 'PROCESSING') {
          return transaction.order.findUniqueOrThrow({
            where: { id },
            select: orderSelect,
          })
        }

        if (current.status !== 'AWAITING_PAYMENT') {
          return transaction.order.findUniqueOrThrow({
            where: { id },
            select: orderSelect,
          })
        }

        for (const item of current.items) {
          const updatedRows = await transaction.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })

          if (updatedRows.count === 0) {
            throw badRequest('Estoque insuficiente para confirmar o pagamento deste pedido.')
          }
        }

        return transaction.order.update({
          where: { id },
          data: { status: 'PROCESSING' },
          select: orderSelect,
        })
      })
    )

    return toDomain(order)
  }
}
