import { Elysia, t } from 'elysia'
import { authPlugin } from '../middlewares/auth.middleware'
import type { MenuController } from '../modules/menu/presentation/menu-controller'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

export const createMenuRoutes = (menuController: MenuController) =>
  new Elysia({ prefix: '/menu' })
    .get('/', () => menuController.getPublicMenu())
    .use(authPlugin)
    .get('/admin', ({ role, set }) => {
      if (role !== 'ADMIN') {
        return forbiddenResponse(set)
      }

      return menuController.getAdminState()
    })
    .put(
      '/admin',
      ({ role, set, body }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        return menuController.updateSelection(body)
      },
      {
        body: t.Object({
          categories: t.Array(t.String()),
          tags: t.Array(t.String()),
          homeBanner: t.Optional(
            t.Object({
              enabled: t.Boolean(),
              imageUrl: t.String(),
              ctaEnabled: t.Optional(t.Boolean()),
              ctaTransparent: t.Optional(t.Boolean()),
              ctaLabel: t.String(),
              targetType: t.UnionEnum(['BESTSELLERS', 'CATEGORY', 'TAG', 'PRODUCT']),
              targetValue: t.String(),
            })
          ),
          homeSections: t.Optional(
            t.Array(
              t.Object({
                type: t.UnionEnum(['CATEGORY', 'TAG']),
                value: t.String(),
                title: t.Optional(t.String()),
                enabled: t.Optional(t.Boolean()),
              })
            )
          ),
        }),
      }
    )
