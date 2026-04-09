import { env } from '../../../config/env'
import type { CreateProviderCheckoutInput, PaymentProviderGateway } from '../application/payment-provider-gateway'
import type { PaymentStatus, ProviderCheckoutSession, ProviderPaymentDetails } from '../domain/payment'

interface MockPaymentRecord {
  externalReference: string
  amount: number
  currency: string
  status: PaymentStatus
}

export class MockPaymentGateway implements PaymentProviderGateway {
  readonly providerName = 'MOCK' as const
  private readonly payments = new Map<string, MockPaymentRecord>()

  async createCheckout(input: CreateProviderCheckoutInput): Promise<ProviderCheckoutSession> {
    const externalId = `mock_${crypto.randomUUID()}`
    this.payments.set(externalId, {
      externalReference: input.externalReference,
      amount: Number(input.amount.toFixed(2)),
      currency: input.currency,
      status: 'PENDING',
    })

    return {
      externalId,
      checkoutUrl: `${env.frontendUrl.replace(/\/$/, '')}/checkout?payment=mock&orderId=${encodeURIComponent(
        input.externalReference
      )}&externalId=${encodeURIComponent(externalId)}`,
      status: 'PENDING',
      payload: {
        provider: 'mock',
      },
    }
  }

  async getPayment(externalId: string): Promise<ProviderPaymentDetails> {
    const payment = this.payments.get(externalId)

    if (!payment) {
      return {
        externalId,
        externalReference: null,
        status: 'REJECTED',
        amount: null,
        currency: null,
        payload: {
          provider: 'mock',
          found: false,
        },
      }
    }

    return {
      externalId,
      externalReference: payment.externalReference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      payload: {
        provider: 'mock',
        status: payment.status,
      },
    }
  }
}
