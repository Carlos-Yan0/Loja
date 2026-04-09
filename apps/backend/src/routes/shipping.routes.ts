import { Elysia, t } from 'elysia'
import type { ShippingController } from '../modules/shipping/presentation/shipping-controller'

export const createShippingRoutes = (shippingController: ShippingController) =>
  new Elysia({ prefix: '/shipping' }).post(
    '/quote',
    ({ body }) => shippingController.quote(body),
    {
      body: t.Object({
        cep: t.String(),
        items: t.Array(
          t.Object({
            productId: t.String(),
            quantity: t.Integer(),
          })
        ),
      }),
    }
  )
