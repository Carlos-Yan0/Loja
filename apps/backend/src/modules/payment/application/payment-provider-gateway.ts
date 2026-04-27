import type { ProviderCheckoutSession, ProviderPaymentDetails } from '../domain/payment'
import type { PaymentMethod } from '../../order/domain/order'

export interface CreateProviderCheckoutInput {
  idempotencyKey: string
  externalReference: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
}

export interface PaymentProviderGateway {
  readonly providerName: 'MERCADO_PAGO' | 'MOCK'
  createCheckout(input: CreateProviderCheckoutInput): Promise<ProviderCheckoutSession>
  getPayment(externalId: string): Promise<ProviderPaymentDetails>
  getPaymentByExternalReference?(externalReference: string): Promise<ProviderPaymentDetails | null>
}
