import { Elysia, t } from 'elysia'
import { authPlugin } from '../middlewares/auth.middleware'
import type { UploadController } from '../modules/upload/presentation/upload-controller'

const forbiddenResponse = (set: { status?: number }, message = 'Acesso negado') => {
  set.status = 403
  return { message, code: 'FORBIDDEN' }
}

export const createUploadRoutes = (uploadController: UploadController) =>
  new Elysia({ prefix: '/upload' })
    .use(authPlugin)
    .post(
      '/product-image',
      async ({ body, set, role }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        const result = await uploadController.uploadProductImage(body)
        set.status = 201
        return { message: 'Imagem enviada com sucesso.', data: result }
      },
      {
        body: t.Form({
          productId: t.String(),
          file: t.File({
            maxSize: '5m',
          }),
        }),
      }
    )
    .post(
      '/banner-image',
      async ({ body, set, role }) => {
        if (role !== 'ADMIN') {
          return forbiddenResponse(set)
        }

        const result = await uploadController.uploadBannerImage(body)
        set.status = 201
        return { message: 'Banner enviado com sucesso.', data: result }
      },
      {
        body: t.Form({
          file: t.File({
            maxSize: '5m',
          }),
        }),
      }
    )
