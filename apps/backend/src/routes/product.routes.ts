import { Elysia, t } from 'elysia'
import type { ProductController } from '../modules/product/presentation/product-controller'
import { authPlugin } from '../middlewares/auth.middleware'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

export const createProductRoutes = (productController: ProductController) =>
  new Elysia({ prefix: '/products' })
    .get(
      '/',
      ({ query, request }) =>
        productController.list({
          search: query.search,
          category: query.category,
          tag: query.tag,
          sort:
            new URL(request.url).searchParams.get('sort') === 'bestsellers'
              ? 'BESTSELLERS'
              : undefined,
        }),
      {
        query: t.Object({
          search: t.Optional(t.String()),
          category: t.Optional(t.String()),
          tag: t.Optional(t.String()),
          sort: t.Optional(t.UnionEnum(['bestsellers'])),
        }),
      }
    )
    .get(
      '/:id',
      ({ params }) => productController.getById(params.id),
      { params: t.Object({ id: t.String() }) }
    )
    .use(authPlugin)
    .post(
      '/',
      async ({ body, set, role }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        const product = await productController.create(body)
        set.status = 201
        return { message: 'Produto criado com sucesso.', data: product }
      },
      {
        body: t.Object({
          name: t.String(),
          price: t.Number(),
          category: t.String(),
          tags: t.Optional(t.Array(t.String())),
          stock: t.Integer(),
          images: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      '/:id',
      async ({ params, body, role, set }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        const product = await productController.update(params.id, body)
        return { message: 'Produto atualizado com sucesso.', data: product }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String()),
          price: t.Optional(t.Number()),
          category: t.Optional(t.String()),
          tags: t.Optional(t.Array(t.String())),
          stock: t.Optional(t.Integer()),
          images: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .delete(
      '/:id',
      async ({ params, role, set }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        await productController.delete(params.id)
        return { message: 'Produto removido com sucesso.' }
      },
      { params: t.Object({ id: t.String() }) }
    )
