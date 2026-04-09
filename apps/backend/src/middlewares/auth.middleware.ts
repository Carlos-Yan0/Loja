import { Elysia } from 'elysia'
import { verifyAccessToken } from '../libs/jwt'
import { unauthorized } from '../shared/errors/error-factory'

interface JwtDecoded {
  sub: string
  role: string
}

export const authPlugin = new Elysia({ name: 'auth-plugin' }).derive(
  { as: 'scoped' },
  ({ cookie, set }) => {
    const token = cookie.accessToken?.value

    if (!token) {
      set.status = 401
      throw unauthorized('Nao autenticado')
    }

    try {
      const decoded = verifyAccessToken(token) as JwtDecoded
      return { userId: decoded.sub, role: decoded.role }
    } catch (error: unknown) {
      set.status = 401

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw unauthorized('TOKEN_EXPIRED')
      }

      throw unauthorized('Token invalido')
    }
  }
)
