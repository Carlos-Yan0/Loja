import { describe, expect, it } from 'bun:test'
import { createAuthRoutes } from '../../src/routes/auth.routes'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { readJson } from '../helpers/http'

const readSetCookies = (response: Response) => {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
    toJSON?: () => Record<string, string>
  }

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const singleCookie = response.headers.get('set-cookie')
  return singleCookie ? [singleCookie] : []
}

const toCookieHeader = (setCookies: string[]) =>
  setCookies.map((entry) => entry.split(';', 1)[0]).join('; ')

describe('auth routes', () => {
  it('logs in, refreshes tokens and clears cookies on logout', async () => {
    const { app, userRepository } = createTestApp({
      authRoutes: createAuthRoutes({
        findUserByEmail: (email) => userRepository.findAuthByEmail(email),
        verifyPassword: async (password, passwordHash) => passwordHash === `hashed:${password}`,
      }),
    })

    const createUserResponse = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Admin Auth',
          email: 'adminauth@example.com',
          password: '12345678',
        }),
      })
    )

    const createdUser = await readJson<{ data: { id: string } }>(createUserResponse)
    await userRepository.update(createdUser.data.id, { role: 'ADMIN' })

    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ADMINAUTH@EXAMPLE.COM',
          password: '12345678',
        }),
      })
    )

    expect(loginResponse.status).toBe(200)
    const loginCookies = readSetCookies(loginResponse)
    expect(loginCookies.some((cookie) => cookie.startsWith('accessToken='))).toBe(true)
    expect(loginCookies.some((cookie) => cookie.startsWith('refreshToken='))).toBe(true)

    const authCookie = toCookieHeader(loginCookies)
    const meResponse = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: { Cookie: authCookie },
      })
    )

    expect(meResponse.status).toBe(200)
    const meBody = await readJson<{ id: string; role: string }>(meResponse)
    expect(meBody.id).toBe(createdUser.data.id)
    expect(meBody.role).toBe('ADMIN')

    const refreshResponse = await app.handle(
      new Request('http://localhost/auth/refresh', {
        method: 'POST',
        headers: { Cookie: authCookie },
      })
    )

    expect(refreshResponse.status).toBe(200)
    const refreshCookies = readSetCookies(refreshResponse)
    expect(refreshCookies.some((cookie) => cookie.startsWith('accessToken='))).toBe(true)
    expect(refreshCookies.some((cookie) => cookie.startsWith('refreshToken='))).toBe(true)

    const logoutResponse = await app.handle(
      new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: { Cookie: authCookie },
      })
    )

    expect(logoutResponse.status).toBe(200)
    const logoutCookies = readSetCookies(logoutResponse)
    expect(
      logoutCookies.some(
        (cookie) => cookie.startsWith('accessToken=') && cookie.includes('Max-Age=0')
      )
    ).toBe(true)
    expect(
      logoutCookies.some(
        (cookie) => cookie.startsWith('refreshToken=') && cookie.includes('Max-Age=0')
      )
    ).toBe(true)
  })

  it('clears auth cookies when refresh token is invalid', async () => {
    const { app, userRepository } = createTestApp({
      authRoutes: createAuthRoutes({
        findUserByEmail: (email) => userRepository.findAuthByEmail(email),
        verifyPassword: async (password, passwordHash) => passwordHash === `hashed:${password}`,
      }),
    })

    const response = await app.handle(
      new Request('http://localhost/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: 'refreshToken=invalid-token',
        },
      })
    )

    expect(response.status).toBe(401)
    const body = await readJson<{ message: string }>(response)
    expect(body.message).toBe('Refresh token invalido.')

    const cookies = readSetCookies(response)
    expect(cookies.some((cookie) => cookie.startsWith('accessToken=') && cookie.includes('Max-Age=0'))).toBe(
      true
    )
    expect(cookies.some((cookie) => cookie.startsWith('refreshToken=') && cookie.includes('Max-Age=0'))).toBe(
      true
    )
  })
})
