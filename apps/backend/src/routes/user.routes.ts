import { Elysia, t } from 'elysia'
import type { UserController } from '../modules/user/presentation/user-controller'
import { authPlugin } from '../middlewares/auth.middleware'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

export const createUserRoutes = (userController: UserController) =>
  new Elysia({ prefix: '/users' })
    .post(
      '/',
      async ({ body, set }) => {
        const user = await userController.create(body)
        set.status = 201
        return { message: 'Usuario criado com sucesso.', data: user }
      },
      {
        body: t.Object({
          name: t.String(),
          email: t.String(),
          password: t.String(),
          phone: t.Optional(t.String()),
        }),
      }
    )
    .use(authPlugin)
    .get(
      '/',
      ({ role, set, query }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        return userController.list(query.search)
      },
      {
        query: t.Object({
          search: t.Optional(t.String()),
        }),
      }
    )
    .get(
      '/:id',
      ({ params, role, userId, set }) => {
        if (role !== 'ADMIN' && params.id !== userId) {
          return forbiddenResponse(set)
        }

        return userController.getById(params.id)
      },
      { params: t.Object({ id: t.String() }) }
    )
    .put(
      '/:id',
      async ({ params, body, role, userId, set }) => {
        if (role !== 'ADMIN' && params.id !== userId) {
          return forbiddenResponse(set)
        }

        if (role === 'ADMIN' && body.password !== undefined) {
          const targetUser = await userController.getById(params.id)

          if (targetUser.role === 'CUSTOMER') {
            return forbiddenResponse(set, 'Administradores nao podem alterar senha de clientes.')
          }
        }

        const payload =
          role === 'ADMIN'
            ? body
            : {
                name: body.name,
                email: body.email,
                password: body.password,
                phone: body.phone,
              }

        const user = await userController.update(params.id, payload)
        return { message: 'Usuario atualizado com sucesso.', data: user }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String()),
          email: t.Optional(t.String()),
          password: t.Optional(t.String()),
          phone: t.Optional(t.String()),
          role: t.Optional(t.UnionEnum(['ADMIN', 'CUSTOMER'])),
        }),
      }
    )
    .delete(
      '/:id',
      async ({ params, role, userId, set }) => {
        if (role !== 'ADMIN' && params.id !== userId) {
          return forbiddenResponse(set)
        }

        await userController.delete(params.id)
        return { message: 'Usuario removido com sucesso.' }
      },
      { params: t.Object({ id: t.String() }) }
    )
