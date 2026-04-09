import { Elysia, t } from 'elysia'
import type { PostalCodeController } from '../modules/postal-code/presentation/postal-code-controller'

export const createPostalCodeRoutes = (postalCodeController: PostalCodeController) =>
  new Elysia({ prefix: '/postal-code' }).get(
    '/:cep',
    ({ params }) => postalCodeController.lookup(params.cep),
    { params: t.Object({ cep: t.String() }) }
  )
