import { Elysia, t } from 'elysia'
import { authPlugin } from '../middlewares/auth.middleware'
import type { AddressController } from '../modules/address/presentation/address-controller'

export const createAddressRoutes = (addressController: AddressController) =>
  new Elysia({ prefix: '/addresses' })
    .use(authPlugin)
    .get('/', ({ userId }) => addressController.list(userId))
    .post(
      '/',
      async ({ userId, body, set }) => {
        const address = await addressController.create(userId, body)
        set.status = 201
        return { message: 'Endereco criado com sucesso.', data: address }
      },
      {
        body: t.Object({
          cep: t.String(),
          street: t.String(),
          number: t.String(),
          complement: t.Optional(t.String()),
        }),
      }
    )
    .put(
      '/:id',
      async ({ userId, params, body }) => {
        const address = await addressController.update(params.id, userId, body)
        return { message: 'Endereco atualizado com sucesso.', data: address }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          cep: t.Optional(t.String()),
          street: t.Optional(t.String()),
          number: t.Optional(t.String()),
          complement: t.Optional(t.String()),
        }),
      }
    )
    .delete(
      '/:id',
      async ({ userId, params }) => {
        await addressController.delete(params.id, userId)
        return { message: 'Endereco removido com sucesso.' }
      },
      { params: t.Object({ id: t.String() }) }
    )
