import type { PaymentProvider, PaymentStatus, PaymentTransaction, PaymentWebhookEvent } from '../domain/payment'

export interface CreatePaymentTransactionInput {
  provider: PaymentProvider
  orderId: string
  amount: number
  currency: string
  externalReference: string
  idempotencyKey: string
  status?: PaymentStatus
  externalId?: string | null
  checkoutUrl?: string | null
  metadata?: Record<string, unknown> | null
}

export interface UpdatePaymentTransactionInput {
  status?: PaymentStatus
  externalId?: string | null
  checkoutUrl?: string | null
  metadata?: Record<string, unknown> | null
}

export interface CreatePaymentWebhookEventInput {
  provider: PaymentProvider
  eventType: string
  eventId: string
  signatureValid: boolean
  payload: Record<string, unknown>
  transactionId?: string | null
}

export interface PaymentRepository {
  createTransaction(input: CreatePaymentTransactionInput): Promise<PaymentTransaction>
  findTransactionById(id: string): Promise<PaymentTransaction | null>
  findLatestTransactionByOrderId(orderId: string): Promise<PaymentTransaction | null>
  findTransactionByExternalId(
    provider: PaymentProvider,
    externalId: string
  ): Promise<PaymentTransaction | null>
  updateTransaction(id: string, input: UpdatePaymentTransactionInput): Promise<PaymentTransaction>
  createWebhookEvent(input: CreatePaymentWebhookEventInput): Promise<PaymentWebhookEvent | null>
}
