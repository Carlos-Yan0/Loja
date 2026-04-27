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

interface AuthRouteUser {
  id: string
  role: string
  passwordHash: string
}

interface AuthRoutesDependencies {
  findUserByEmail(email: string): Promise<AuthRouteUser | null>
  verifyPassword(password: string, passwordHash: string): Promise<boolean>
}

const clearAuthCookies = (cookie: {
  accessToken?: { set(input: Record<string, unknown>): unknown }
  refreshToken?: { set(input: Record<string, unknown>): unknown }
}) => {
  const expiredCookie = {
    ...COOKIE_OPTS,
    value: '',
    maxAge: 0,
    expires: new Date(0),
  }

  cookie.accessToken?.set(expiredCookie)
  cookie.refreshToken?.set(expiredCookie)
}

const liveDependencies: AuthRoutesDependencies = {
  async findUserByEmail(email) {
    const user = await getPrismaClient().user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        password: true,
      },
    })

    return user
      ? {
          id: user.id,
          role: user.role,
          passwordHash: user.password,
        }
      : null
  },
  verifyPassword(password, passwordHash) {
    return Bun.password.verify(password, passwordHash)
  },
}

export const createAuthRoutes = (dependencies: AuthRoutesDependencies = liveDependencies) =>
  new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body, cookie, set }) => {
      const normalizedEmail = body.email.trim().toLowerCase()
      const user = await dependencies.findUserByEmail(normalizedEmail)

      if (!user) {
        set.status = 401
        return { message: 'Credenciais invalidas.' }
      }

      const passwordMatches = await dependencies.verifyPassword(body.password, user.passwordHash)
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
      clearAuthCookies(cookie)
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
      clearAuthCookies(cookie)
      set.status = 401
      return { message: 'Refresh token invalido.' }
    }
  })
  .post('/logout', ({ cookie }) => {
    clearAuthCookies(cookie)
    return { message: 'Logout realizado com sucesso.' }
  })
  .use(authPlugin)
  .get('/me', ({ userId, role }) => ({ id: userId, role }))
  .post('/me', ({ userId, role }) => ({ id: userId, role }))

export const authRoutes = createAuthRoutes()
