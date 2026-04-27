import { env } from '../../../config/env'
import type { CreateProviderCheckoutInput, PaymentProviderGateway } from '../application/payment-provider-gateway'
import type { PaymentStatus, ProviderCheckoutSession, ProviderPaymentDetails } from '../domain/payment'
import type { PaymentMethod } from '../../order/domain/order'

interface MockPaymentRecord {
  externalReference: string
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
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
      paymentMethod: input.paymentMethod,
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
      paymentMethod: payment.paymentMethod,
      payload: {
        provider: 'mock',
        status: payment.status,
        payment_method_id: payment.paymentMethod === 'PIX' ? 'pix' : payment.paymentMethod,
      },
    }
  }

  async getPaymentByExternalReference(externalReference: string): Promise<ProviderPaymentDetails | null> {
    const foundEntry = [...this.payments.entries()].find(
      ([, payment]) => payment.externalReference === externalReference
    )
    if (!foundEntry) return null

    const [externalId, payment] = foundEntry
    const normalizedPayment =
      payment.status === 'PENDING'
        ? {
            ...payment,
            status: 'APPROVED' as PaymentStatus,
          }
        : payment

    this.payments.set(externalId, normalizedPayment)

    return {
      externalId,
      externalReference: normalizedPayment.externalReference,
      status: normalizedPayment.status,
      amount: normalizedPayment.amount,
      currency: normalizedPayment.currency,
      paymentMethod: normalizedPayment.paymentMethod,
      payload: {
        provider: 'mock',
        status: normalizedPayment.status,
        payment_method_id:
          normalizedPayment.paymentMethod === 'PIX' ? 'pix' : normalizedPayment.paymentMethod,
        recoveredBy: 'external_reference',
      },
    }
  }
}
