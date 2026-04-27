import { env } from '../../../config/env'
import { serviceUnavailable } from '../../../shared/errors/error-factory'
import type { CreateProviderCheckoutInput, PaymentProviderGateway } from '../application/payment-provider-gateway'
import type { ProviderCheckoutSession, ProviderPaymentDetails, PaymentStatus } from '../domain/payment'
import type { PaymentMethod } from '../../order/domain/order'

interface MercadoPagoPreferenceResponse {
  id?: string
  init_point?: string
  sandbox_init_point?: string
}

interface MercadoPagoPaymentResponse {
  id?: string | number
  status?: string
  transaction_amount?: number
  currency_id?: string
  external_reference?: string
  payment_type_id?: string
  payment_method_id?: string
}

interface MercadoPagoPaymentSearchResponse {
  results?: MercadoPagoPaymentResponse[]
}

const localhostHosts = new Set(['localhost', '127.0.0.1', '::1'])

const isHttpLocalhostUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && localhostHosts.has(url.hostname)
  } catch {
    return false
  }
}

const ensureHttpsOrLocalhost = (value: string, field: string) => {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || isHttpLocalhostUrl(value)) {
      return
    }
  } catch {
    throw serviceUnavailable(`URL invalida em ${field}.`)
  }

  throw serviceUnavailable(`${field} deve usar HTTPS em ambientes publicos.`)
}

const mapMercadoPagoStatus = (value: string | undefined): PaymentStatus => {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === 'approved') return 'APPROVED'
  if (normalized === 'pending' || normalized === 'in_process' || normalized === 'in_mediation') {
    return 'PENDING'
  }
  if (normalized === 'cancelled' || normalized === 'charged_back') return 'CANCELED'
  if (normalized === 'rejected') return 'REJECTED'
  if (normalized === 'refunded') return 'REFUNDED'
  if (normalized === 'expired') return 'EXPIRED'
  return 'PENDING'
}

const mapMercadoPagoPaymentMethod = (
  paymentTypeId: string | undefined,
  paymentMethodId: string | undefined
): PaymentMethod | null => {
  const normalizedType = String(paymentTypeId ?? '').trim().toLowerCase()
  const normalizedMethod = String(paymentMethodId ?? '').trim().toLowerCase()

  if (normalizedMethod === 'pix' || normalizedType === 'bank_transfer') {
    return 'PIX'
  }

  if (
    normalizedType === 'ticket' ||
    normalizedMethod.startsWith('bol') ||
    normalizedMethod.includes('boleto')
  ) {
    return 'BOLETO'
  }

  if (
    normalizedType === 'credit_card' ||
    normalizedType === 'debit_card' ||
    normalizedType === 'prepaid_card'
  ) {
    return 'CREDIT_CARD'
  }

  return null
}

const readJsonSafely = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

const getErrorMessage = async (response: Response) => {
  const payload = await readJsonSafely(response)
  const reason = payload.message || payload.error || payload.cause
  return typeof reason === 'string' ? reason : `status ${response.status}`
}

export class MercadoPagoGateway implements PaymentProviderGateway {
  readonly providerName = 'MERCADO_PAGO' as const

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async createCheckout(input: CreateProviderCheckoutInput): Promise<ProviderCheckoutSession> {
    const accessToken = env.mercadoPago.accessToken?.trim()
    if (!accessToken) {
      throw serviceUnavailable('MERCADO_PAGO_ACCESS_TOKEN nao configurado.')
    }

    const webhookUrl = this.buildWebhookUrl()
    const backUrlBase = `${env.frontendUrl.replace(/\/$/, '')}`
    ensureHttpsOrLocalhost(webhookUrl, 'notification_url do Mercado Pago')
    ensureHttpsOrLocalhost(backUrlBase, 'FRONTEND_URL para back_urls do Mercado Pago')

    const body = {
      external_reference: input.externalReference,
      notification_url: webhookUrl,
      items: [
        {
          id: input.externalReference,
          title: `Pedido ${input.externalReference.slice(0, 8).toUpperCase()}`,
          quantity: 1,
          currency_id: input.currency,
          unit_price: Number(input.amount.toFixed(2)),
        },
      ],
      metadata: {
        orderId: input.externalReference,
        payMethod: input.paymentMethod,
      },
      back_urls: {
        success: `${backUrlBase}/?payment=success&orderId=${encodeURIComponent(input.externalReference)}`,
        failure: `${backUrlBase}/?payment=failure&orderId=${encodeURIComponent(input.externalReference)}`,
        pending: `${backUrlBase}/?payment=pending&orderId=${encodeURIComponent(input.externalReference)}`,
      },
      auto_return: 'approved',
    }

    const response = await this.request('/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw serviceUnavailable(
        `Falha ao criar checkout no Mercado Pago: ${await getErrorMessage(response)}`
      )
    }

    const payload = (await readJsonSafely(response)) as MercadoPagoPreferenceResponse
    const externalId = String(payload.id ?? '')
    if (!externalId) {
      throw serviceUnavailable('Resposta invalida ao criar checkout no Mercado Pago.')
    }

    const checkoutUrlMode = env.mercadoPago.checkoutUrlMode
    const checkoutUrl =
      checkoutUrlMode === 'SANDBOX'
        ? payload.sandbox_init_point ?? payload.init_point ?? null
        : checkoutUrlMode === 'PRODUCTION'
          ? payload.init_point ?? payload.sandbox_init_point ?? null
          : payload.init_point ?? payload.sandbox_init_point ?? null

    if (!checkoutUrl) {
      throw serviceUnavailable('Resposta invalida ao criar checkout no Mercado Pago: URL ausente.')
    }

    return {
      externalId,
      checkoutUrl,
      status: 'PENDING',
      payload: payload as Record<string, unknown>,
    }
  }

  async getPayment(externalId: string): Promise<ProviderPaymentDetails> {
    const accessToken = env.mercadoPago.accessToken?.trim()
    if (!accessToken) {
      throw serviceUnavailable('MERCADO_PAGO_ACCESS_TOKEN nao configurado.')
    }

    const response = await this.request(`/v1/payments/${encodeURIComponent(externalId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw serviceUnavailable(
        `Falha ao consultar pagamento no Mercado Pago: ${await getErrorMessage(response)}`
      )
    }

    const payload = (await readJsonSafely(response)) as MercadoPagoPaymentResponse
    return this.toProviderPaymentDetails(payload, externalId)
  }

  async getPaymentByExternalReference(externalReference: string): Promise<ProviderPaymentDetails | null> {
    const accessToken = env.mercadoPago.accessToken?.trim()
    if (!accessToken) {
      throw serviceUnavailable('MERCADO_PAGO_ACCESS_TOKEN nao configurado.')
    }

    const query = new URLSearchParams({
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
      limit: '1',
    }).toString()

    const response = await this.request(`/v1/payments/search?${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw serviceUnavailable(
        `Falha ao pesquisar pagamento no Mercado Pago: ${await getErrorMessage(response)}`
      )
    }

    const payload = (await readJsonSafely(response)) as MercadoPagoPaymentSearchResponse
    const payment = Array.isArray(payload.results) ? payload.results[0] : undefined
    if (!payment) return null

    return this.toProviderPaymentDetails(payment, externalReference)
  }

  private toProviderPaymentDetails(
    payload: MercadoPagoPaymentResponse,
    fallbackExternalId: string
  ): ProviderPaymentDetails {
    const resolvedExternalId = String(payload.id ?? fallbackExternalId).trim()

    return {
      externalId: resolvedExternalId,
      externalReference:
        typeof payload.external_reference === 'string' ? payload.external_reference : null,
      status: mapMercadoPagoStatus(payload.status),
      amount:
        Number.isFinite(payload.transaction_amount) && payload.transaction_amount != null
          ? Number(payload.transaction_amount)
          : null,
      currency: typeof payload.currency_id === 'string' ? payload.currency_id : null,
      paymentMethod: mapMercadoPagoPaymentMethod(payload.payment_type_id, payload.payment_method_id),
      payload: payload as Record<string, unknown>,
    }
  }

  private buildWebhookUrl() {
    const base = `${env.backendPublicUrl.replace(/\/$/, '')}/payments/webhooks/mercado-pago`
    const token = env.payment.webhookToken?.trim()
    if (!token) return base
    return `${base}?token=${encodeURIComponent(token)}`
  }

  private async request(path: string, init: RequestInit) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), env.payment.providerTimeoutMs)

    try {
      return await this.fetcher(`${env.mercadoPago.apiBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      })
    } catch {
      throw serviceUnavailable('Nao foi possivel conectar ao Mercado Pago no momento.')
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
