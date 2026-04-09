import type { PrismaClient } from '../../../../generated/prisma/client'
import type {
  CreatePaymentTransactionInput,
  CreatePaymentWebhookEventInput,
  PaymentRepository,
  UpdatePaymentTransactionInput,
} from '../application/payment-repository'
import type { PaymentProvider, PaymentTransaction, PaymentWebhookEvent, PaymentStatus } from '../domain/payment'
import { withDatabaseErrorHandling } from '../../../libs/prisma'

const toRecordOrNull = (value: unknown): Record<string, unknown> | null => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

const toDomainTransaction = (record: {
  id: string
  provider: PaymentProvider
  status: PaymentStatus
  amount: number
  currency: string
  externalId: string | null
  externalReference: string
  checkoutUrl: string | null
  idempotencyKey: string
  metadata: unknown
  orderId: string
  createdAt: Date
  updatedAt: Date
}): PaymentTransaction => ({
  id: record.id,
  provider: record.provider,
  status: record.status,
  amount: record.amount,
  currency: record.currency,
  externalId: record.externalId,
  externalReference: record.externalReference,
  checkoutUrl: record.checkoutUrl,
  idempotencyKey: record.idempotencyKey,
  metadata: toRecordOrNull(record.metadata),
  orderId: record.orderId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const toDomainWebhookEvent = (record: {
  id: string
  provider: PaymentProvider
  eventType: string
  eventId: string
  signatureValid: boolean
  payload: unknown
  transactionId: string | null
  createdAt: Date
}): PaymentWebhookEvent => ({
  id: record.id,
  provider: record.provider,
  eventType: record.eventType,
  eventId: record.eventId,
  signatureValid: record.signatureValid,
  payload: toRecordOrNull(record.payload) ?? {},
  transactionId: record.transactionId,
  createdAt: record.createdAt.toISOString(),
})

const isUniqueConstraintError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002')

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(
    private readonly prisma: Pick<
      PrismaClient,
      'paymentTransaction' | 'paymentWebhookEvent'
    >
  ) {}

  async createTransaction(input: CreatePaymentTransactionInput) {
    const transaction = await withDatabaseErrorHandling(() =>
      this.prisma.paymentTransaction.create({
        data: {
          provider: input.provider,
          status: input.status ?? 'PENDING',
          orderId: input.orderId,
          amount: input.amount,
          currency: input.currency,
          externalId: input.externalId ?? null,
          externalReference: input.externalReference,
          checkoutUrl: input.checkoutUrl ?? null,
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata ?? undefined,
        },
      })
    )

    return toDomainTransaction(transaction)
  }

  async findTransactionById(id: string) {
    const transaction = await withDatabaseErrorHandling(() =>
      this.prisma.paymentTransaction.findUnique({
        where: { id },
      })
    )

    return transaction ? toDomainTransaction(transaction) : null
  }

  async findLatestTransactionByOrderId(orderId: string) {
    const transaction = await withDatabaseErrorHandling(() =>
      this.prisma.paymentTransaction.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      })
    )

    return transaction ? toDomainTransaction(transaction) : null
  }

  async findTransactionByExternalId(provider: PaymentProvider, externalId: string) {
    const transaction = await withDatabaseErrorHandling(() =>
      this.prisma.paymentTransaction.findFirst({
        where: {
          provider,
          externalId,
        },
        orderBy: { createdAt: 'desc' },
      })
    )

    return transaction ? toDomainTransaction(transaction) : null
  }

  async updateTransaction(id: string, input: UpdatePaymentTransactionInput) {
    const transaction = await withDatabaseErrorHandling(() =>
      this.prisma.paymentTransaction.update({
        where: { id },
        data: {
          ...(input.status !== undefined && { status: input.status }),
          ...(input.externalId !== undefined && { externalId: input.externalId }),
          ...(input.checkoutUrl !== undefined && { checkoutUrl: input.checkoutUrl }),
          ...(input.metadata !== undefined && { metadata: input.metadata }),
        },
      })
    )

    return toDomainTransaction(transaction)
  }

  async createWebhookEvent(input: CreatePaymentWebhookEventInput) {
    try {
      const event = await withDatabaseErrorHandling(() =>
        this.prisma.paymentWebhookEvent.create({
          data: {
            provider: input.provider,
            eventType: input.eventType,
            eventId: input.eventId,
            signatureValid: input.signatureValid,
            payload: input.payload,
            transactionId: input.transactionId ?? null,
          },
        })
      )

      return toDomainWebhookEvent(event)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return null
      }

      throw error
    }
  }
}
