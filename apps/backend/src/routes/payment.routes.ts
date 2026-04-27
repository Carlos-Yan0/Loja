import { Elysia, t } from 'elysia'
import { authPlugin } from '../middlewares/auth.middleware'
import type { PaymentController } from '../modules/payment/presentation/payment-controller'
import type { PaymentTransaction } from '../modules/payment/domain/payment'
import { env } from '../config/env'
import { validateMercadoPagoWebhookSignature } from '../modules/payment/infrastructure/mercado-pago-webhook-signature'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

const buildWalletBrickPayload = (transaction: PaymentTransaction) => {
  const publicKey = env.mercadoPago.publicKey?.trim()
  const preferenceId = transaction.externalId?.trim()

  if (transaction.provider !== 'MERCADO_PAGO' || !publicKey || !preferenceId) {
    return null
  }

  return {
    publicKey,
    preferenceId,
  }
}

export const createPaymentRoutes = (paymentController: PaymentController) =>
  new Elysia({ prefix: '/payments' })
    .post(
      '/webhooks/mercado-pago',
      async ({ body, query, headers, request, set }) => {
        const headerToken =
          headers['x-payment-webhook-token'] ??
          headers['x-webhook-token'] ??
          headers.authorization?.replace(/^Bearer\s+/i, '').trim()
        const queryToken = query.token
        const providedToken = queryToken ?? headerToken

        if (!paymentController.isWebhookTokenValid(providedToken)) {
          set.status = 401
          return { message: 'Webhook nao autorizado.', code: 'UNAUTHORIZED' }
        }

        const queryDataId = new URL(request.url).searchParams.get('data.id')
        const dataId = body.data?.id
        const externalIdFromBody =
          typeof dataId === 'string' || typeof dataId === 'number' ? String(dataId) : undefined
        const externalId = String(queryDataId ?? externalIdFromBody ?? '').trim() || undefined
        const webhookSecret = env.mercadoPago.webhookSecret?.trim()

        if (webhookSecret) {
          const signatureValid = validateMercadoPagoWebhookSignature({
            secret: webhookSecret,
            xSignature: headers['x-signature'],
            xRequestId: headers['x-request-id'],
            dataId: externalId,
            maxSkewMs: env.mercadoPago.webhookMaxSkewMs,
          })

          if (!signatureValid) {
            set.status = 401
            return { message: 'Assinatura do webhook invalida.', code: 'UNAUTHORIZED' }
          }
        }

        const eventType = body.type ?? body.action ?? query.type ?? query.topic ?? 'unknown'
        const eventId =
          body.id != null
            ? String(body.id)
            : headers['x-request-id'] ?? `${eventType}:${externalId ?? 'none'}`

        const result = await paymentController.processWebhook({
          provider: 'MERCADO_PAGO',
          eventType,
          eventId,
          externalId,
          signatureValid: true,
          payload: body as Record<string, unknown>,
        })

        set.status = 200
        return result
      },
      {
        query: t.Object({
          token: t.Optional(t.String()),
          type: t.Optional(t.String()),
          topic: t.Optional(t.String()),
        }, { additionalProperties: true }),
        body: t.Object(
          {
            id: t.Optional(t.Union([t.String(), t.Number()])),
            type: t.Optional(t.String()),
            action: t.Optional(t.String()),
            data: t.Optional(
              t.Object({
                id: t.Optional(t.Union([t.String(), t.Number()])),
              })
            ),
          },
          { additionalProperties: true }
        ),
      }
    )
    .use(authPlugin)
    .post(
      '/order/:orderId/checkout',
      async ({ params, userId, role, set }) => {
        if (role !== 'ADMIN' && role !== 'CUSTOMER') {
          return forbiddenResponse(set)
        }

        const transaction = await paymentController.createCheckoutForOrder({
          orderId: params.orderId,
          userId,
          role,
        })

        set.status = 201
        return {
          message: 'Checkout de pagamento iniciado com sucesso.',
          data: {
            ...transaction,
            walletBrick: buildWalletBrickPayload(transaction),
          },
        }
      },
      {
        params: t.Object({
          orderId: t.String(),
        }),
      }
    )
    .get(
      '/order/:orderId',
      ({ params, query, userId, role, set }) => {
        if (role !== 'ADMIN' && role !== 'CUSTOMER') {
          return forbiddenResponse(set)
        }

        return paymentController.getOrderPayment({
          orderId: params.orderId,
          userId,
          role,
          sync: query.sync === 'true',
        })
      },
      {
        params: t.Object({
          orderId: t.String(),
        }),
        query: t.Object({
          sync: t.Optional(t.UnionEnum(['true', 'false'])),
        }),
      }
    )
