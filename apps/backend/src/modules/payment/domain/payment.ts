import type { PaymentMethod } from '../../order/domain/order'

export type PaymentProvider = 'MERCADO_PAGO' | 'MOCK'
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED'

export interface PaymentTransaction {
  id: string
  provider: PaymentProvider
  status: PaymentStatus
  orderId: string
  amount: number
  currency: string
  externalId: string | null
  externalReference: string
  checkoutUrl: string | null
  idempotencyKey: string
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface PaymentWebhookEvent {
  id: string
  provider: PaymentProvider
  eventType: string
  eventId: string
  signatureValid: boolean
  payload: Record<string, unknown>
  transactionId: string | null
  createdAt: string
}

export interface ProviderCheckoutSession {
  externalId: string
  checkoutUrl: string | null
  status: PaymentStatus
  payload: Record<string, unknown>
}

export interface ProviderPaymentDetails {
  externalId: string
  externalReference: string | null
  status: PaymentStatus
  amount: number | null
  currency: string | null
  paymentMethod?: PaymentMethod | null
  payload: Record<string, unknown>
}

export interface CreatePaymentCheckoutInput {
  orderId: string
  userId: string
  role: 'ADMIN' | 'CUSTOMER'
}

export interface GetOrderPaymentInput {
  orderId: string
  userId: string
  role: 'ADMIN' | 'CUSTOMER'
  sync?: boolean
}

export interface ProcessWebhookInput {
  provider: PaymentProvider
  eventType: string
  eventId: string
  externalId?: string
  signatureValid: boolean
  payload: Record<string, unknown>
}
