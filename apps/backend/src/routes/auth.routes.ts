import { Elysia, t } from 'elysia'
import { getPrismaClient } from '../libs/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../libs/jwt'
import { authPlugin } from '../middlewares/auth.middleware'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
} as const

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body, cookie, set }) => {
      const prisma = getPrismaClient()
      const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })

      if (!user) {
        set.status = 401
        return { message: 'Credenciais invalidas.' }
      }

      const passwordMatches = await Bun.password.verify(body.password, user.password)
      if (!passwordMatches) {
        set.status = 401
        return { message: 'Credenciais invalidas.' }
      }

      const payload = { sub: user.id, role: user.role }
      const accessToken = generateAccessToken(payload)
      const refreshToken = generateRefreshToken(payload)

      cookie.accessToken.set({ ...COOKIE_OPTS, value: accessToken, maxAge: 60 * 60 })
      cookie.refreshToken.set({ ...COOKIE_OPTS, value: refreshToken, maxAge: 7 * 24 * 60 * 60 })

      return { message: 'Login realizado com sucesso.' }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post('/refresh', ({ cookie, set }) => {
    const token = cookie.refreshToken?.value
    if (!token) {
      set.status = 401
      return { message: 'Refresh token nao encontrado.' }
    }

    try {
      const decoded = verifyRefreshToken(token) as { sub: string; role: string }
      const payload = { sub: decoded.sub, role: decoded.role }

      cookie.accessToken.set({
        ...COOKIE_OPTS,
        value: generateAccessToken(payload),
        maxAge: 60 * 60,
      })
      cookie.refreshToken.set({
        ...COOKIE_OPTS,
        value: generateRefreshToken(payload),
        maxAge: 7 * 24 * 60 * 60,
      })

      return { message: 'Tokens renovados com sucesso.' }
    } catch {
      set.status = 401
      return { message: 'Refresh token invalido.' }
    }
  })
  .post('/logout', ({ cookie }) => {
    cookie.accessToken.remove()
    cookie.refreshToken.remove()
    return { message: 'Logout realizado com sucesso.' }
  })
  .use(authPlugin)
  .get('/me', ({ userId, role }) => ({ id: userId, role }))
  .post('/me', ({ userId, role }) => ({ id: userId, role }))
