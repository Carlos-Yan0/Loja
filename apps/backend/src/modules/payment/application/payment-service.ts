import { timingSafeEqual } from 'node:crypto'
import type { PaymentMethod } from '../../order/domain/order'
import { badRequest, notFound, serviceUnavailable } from '../../../shared/errors/error-factory'
import { ensureUuid, normalizeText } from '../../../shared/utils/normalize'
import type { PaymentOrderRepository } from './payment-order-repository'
import type { PaymentProviderGateway } from './payment-provider-gateway'
import type { PaymentRepository } from './payment-repository'
import { mapPaymentStatusToOrderStatus } from './payment-status-mapper'
import type { CreatePaymentCheckoutInput, GetOrderPaymentInput, ProcessWebhookInput } from '../domain/payment'

interface PaymentServiceOptions {
  currency?: string
  webhookToken?: string
}

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export class PaymentService {
  private readonly currency: string
  private readonly webhookToken?: string

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderRepository: PaymentOrderRepository,
    private readonly paymentProviderGateway: PaymentProviderGateway,
    options: PaymentServiceOptions = {}
  ) {
    this.currency = normalizeText(options.currency ?? 'BRL', {
      field: 'Moeda de pagamento',
      maxLength: 6,
    }).toUpperCase()
    this.webhookToken = options.webhookToken?.trim()
  }

  isWebhookTokenValid(token: string | undefined) {
    if (!this.webhookToken) return true
    if (!token) return false
    return safeCompare(token.trim(), this.webhookToken)
  }

  async createCheckoutForOrder(input: CreatePaymentCheckoutInput) {
    const orderId = ensureUuid(input.orderId, 'Pedido')
    const userId = ensureUuid(input.userId, 'Usuario')
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      throw notFound('Pedido nao encontrado.')
    }

    if (input.role !== 'ADMIN' && order.userId !== userId) {
      throw notFound('Pedido nao encontrado.')
    }

    const latestTransaction = await this.paymentRepository.findLatestTransactionByOrderId(orderId)
    if (latestTransaction) {
      if (latestTransaction.status === 'APPROVED') {
        return latestTransaction
      }

      if (latestTransaction.status === 'PENDING' && latestTransaction.checkoutUrl) {
        return latestTransaction
      }
    }

    const idempotencyKey = crypto.randomUUID()
    const createdTransaction = await this.paymentRepository.createTransaction({
      provider: this.paymentProviderGateway.providerName,
      orderId,
      amount: order.total,
      currency: this.currency,
      externalReference: order.id,
      idempotencyKey,
      status: 'PENDING',
    })

    try {
      const providerCheckout = await this.paymentProviderGateway.createCheckout({
        idempotencyKey,
        externalReference: order.id,
        amount: order.total,
        currency: this.currency,
        paymentMethod: order.payMethod as PaymentMethod,
      })

      const updatedTransaction = await this.paymentRepository.updateTransaction(createdTransaction.id, {
        status: providerCheckout.status,
        externalId: providerCheckout.externalId,
        checkoutUrl: providerCheckout.checkoutUrl,
        metadata: providerCheckout.payload,
      })

      const nextOrderStatus = mapPaymentStatusToOrderStatus(updatedTransaction.status, order.status)
      if (nextOrderStatus !== order.status) {
        if (nextOrderStatus === 'PROCESSING') {
          await this.orderRepository.confirmPayment(order.id)
        } else {
          await this.orderRepository.updateStatus(order.id, nextOrderStatus)
        }
      }

      return updatedTransaction
    } catch (error) {
      await this.paymentRepository.updateTransaction(createdTransaction.id, {
        status: 'REJECTED',
        metadata: {
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  name: error.name,
                }
              : { message: 'unknown_error' },
        },
      })

      throw serviceUnavailable('Nao foi possivel iniciar o checkout de pagamento no momento.')
    }
  }

  async getOrderPayment(input: GetOrderPaymentInput) {
    const orderId = ensureUuid(input.orderId, 'Pedido')
    const userId = ensureUuid(input.userId, 'Usuario')
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      throw notFound('Pedido nao encontrado.')
    }

    if (input.role !== 'ADMIN' && order.userId !== userId) {
      throw notFound('Pedido nao encontrado.')
    }

    const latestTransaction = await this.paymentRepository.findLatestTransactionByOrderId(orderId)
    if (!latestTransaction) return null

    if (input.sync && latestTransaction.externalId) {
      await this.reconcileTransaction(latestTransaction.id, latestTransaction.externalId)
      return this.paymentRepository.findTransactionById(latestTransaction.id)
    }

    return latestTransaction
  }

  async processWebhook(input: ProcessWebhookInput) {
    const eventId = normalizeText(input.eventId, { field: 'EventId de webhook', maxLength: 120 })
    const eventType = normalizeText(input.eventType, { field: 'Tipo de webhook', maxLength: 120 })

    const createdEvent = await this.paymentRepository.createWebhookEvent({
      provider: input.provider,
      eventType,
      eventId,
      signatureValid: input.signatureValid,
      payload: input.payload,
    })

    if (!createdEvent) {
      return { accepted: true, duplicated: true }
    }

    if (!input.signatureValid) {
      return { accepted: true, ignored: 'INVALID_SIGNATURE' as const }
    }

    const externalId = input.externalId?.trim()
    if (!externalId) {
      return { accepted: true, ignored: 'MISSING_EXTERNAL_ID' as const }
    }

    await this.reconcileTransaction(undefined, externalId)

    return { accepted: true, duplicated: false }
  }

  private async reconcileTransaction(transactionId: string | undefined, externalId: string) {
    const transactionFromId = transactionId
      ? await this.paymentRepository.findTransactionById(transactionId)
      : null
    const fallbackExternalReference = transactionFromId?.externalReference

    let providerPayment
    try {
      providerPayment = await this.paymentProviderGateway.getPayment(externalId)
    } catch (error) {
      if (
        !fallbackExternalReference ||
        typeof this.paymentProviderGateway.getPaymentByExternalReference !== 'function'
      ) {
        throw error
      }

      const fallbackPayment = await this.paymentProviderGateway.getPaymentByExternalReference(
        fallbackExternalReference
      )
      if (!fallbackPayment) {
        return transactionFromId
      }

      providerPayment = fallbackPayment
    }

    if (
      !providerPayment.externalReference &&
      fallbackExternalReference &&
      typeof this.paymentProviderGateway.getPaymentByExternalReference === 'function'
    ) {
      const fallbackPayment = await this.paymentProviderGateway.getPaymentByExternalReference(
        fallbackExternalReference
      )
      if (fallbackPayment) {
        providerPayment = fallbackPayment
      }
    }

    const transactionByExternalId = await this.paymentRepository.findTransactionByExternalId(
      this.paymentProviderGateway.providerName,
      providerPayment.externalId
    )

    const resolvedTransaction =
      transactionByExternalId ??
      transactionFromId

    const resolvedOrderId = resolvedTransaction?.orderId ?? providerPayment.externalReference
    if (!resolvedOrderId) {
      throw badRequest('Referencia externa de pagamento ausente.')
    }

    const orderId = ensureUuid(resolvedOrderId, 'Pedido')
    const order = await this.orderRepository.findById(orderId)
    if (!order) {
      throw notFound('Pedido nao encontrado para reconciliacao do pagamento.')
    }

    const amount =
      providerPayment.amount != null && Number.isFinite(providerPayment.amount)
        ? Number(providerPayment.amount.toFixed(2))
        : order.total

    let persistedTransaction = resolvedTransaction
    if (!persistedTransaction) {
      persistedTransaction = await this.paymentRepository.createTransaction({
        provider: this.paymentProviderGateway.providerName,
        orderId: order.id,
        amount,
        currency: providerPayment.currency ?? this.currency,
        externalReference: order.id,
        externalId: providerPayment.externalId,
        idempotencyKey: crypto.randomUUID(),
        status: providerPayment.status,
        metadata: providerPayment.payload,
      })
    } else {
      persistedTransaction = await this.paymentRepository.updateTransaction(persistedTransaction.id, {
        status: providerPayment.status,
        externalId: providerPayment.externalId,
        metadata: providerPayment.payload,
      })
    }

    if (providerPayment.paymentMethod && providerPayment.paymentMethod !== order.payMethod) {
      await this.orderRepository.updatePayMethod(order.id, providerPayment.paymentMethod)
    }

    const nextOrderStatus = mapPaymentStatusToOrderStatus(providerPayment.status, order.status)
    if (nextOrderStatus !== order.status) {
      if (nextOrderStatus === 'PROCESSING') {
        await this.orderRepository.confirmPayment(order.id)
      } else {
        await this.orderRepository.updateStatus(order.id, nextOrderStatus)
      }
    }

    return persistedTransaction
  }
}
