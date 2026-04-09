import { Elysia } from 'elysia'
import { authPlugin } from './auth.middleware'
import { forbidden } from '../shared/errors/error-factory'

export const adminPlugin = new Elysia({ name: 'admin-plugin' })
  .use(authPlugin)
  .derive({ as: 'scoped' }, ({ role, set }) => {
    if (role !== 'ADMIN') {
      set.status = 403
      throw forbidden('Acesso negado')
    }

    return {}
  })
