import { Elysia, t } from 'elysia'
import { authPlugin } from '../middlewares/auth.middleware'
import type { OrderController } from '../modules/order/presentation/order-controller'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

export const createOrderRoutes = (orderController: OrderController) =>
  new Elysia({ prefix: '/orders' })
    .use(authPlugin)
    .post(
      '/',
      async ({ body, set, userId }) => {
        const order = await orderController.create({
          userId,
          payMethod: body.payMethod,
          items: body.items,
          deliveryAddress: body.deliveryAddress,
        })

        set.status = 201
        return { message: 'Pedido criado com sucesso.', data: order }
      },
      {
        body: t.Object({
          payMethod: t.UnionEnum(['PIX', 'CREDIT_CARD', 'BOLETO']),
          deliveryAddress: t.Object({
            cep: t.String(),
            number: t.String(),
            complement: t.Optional(t.String()),
          }),
          items: t.Array(
            t.Object({
              productId: t.String(),
              quantity: t.Integer(),
            })
          ),
        }),
      }
    )
    .get('/my', ({ userId }) => orderController.listByUserId(userId))
    .get('/', ({ role, set }) => {
      if (role !== 'ADMIN') {
        return forbiddenResponse(set)
      }

      return orderController.list()
    })
    .get(
      '/:id',
      async ({ params, role, userId, set }) => {
        const order = await orderController.getById(params.id)

        if (role !== 'ADMIN' && order.userId !== userId) {
          return forbiddenResponse(set)
        }

        return order
      },
      { params: t.Object({ id: t.String() }) }
    )
    .put(
      '/:id',
      async ({ params, body, role, set }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        const order = await orderController.updateStatus(params.id, body.status)
        return { message: 'Pedido atualizado com sucesso.', data: order }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          status: t.UnionEnum([
            'AWAITING_PAYMENT',
            'COMPLETED',
            'PROCESSING',
            'CANCELED',
            'DELIVERED',
            'IN_TRANSIT',
          ]),
        }),
      }
    )
    .post(
      '/:id/cancel',
      async ({ params, role, userId, set }) => {
        if (role === 'ADMIN') {
          return forbiddenResponse(set, 'Use a atualizacao de status para cancelamentos administrativos.')
        }

        const order = await orderController.cancelByCustomer(userId, params.id)
        return { message: 'Pedido cancelado com sucesso.', data: order }
      },
      {
        params: t.Object({ id: t.String() }),
      }
    )
