import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

describe('user routes', () => {
  it('covers create, get, update and delete', async () => {
    const { app } = createTestApp()

    const createResponse = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Joao',
          email: 'joao@example.com',
          password: '12345678',
        }),
      })
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<{ data: { id: string } }>(createResponse)
    const cookie = createAuthCookie({ sub: created.data.id, role: 'CUSTOMER' })

    const getResponse = await app.handle(
      new Request(`http://localhost/users/${created.data.id}`, {
        headers: { Cookie: cookie },
      })
    )
    expect(getResponse.status).toBe(200)

    const updateResponse = await app.handle(
      new Request(`http://localhost/users/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ phone: '11999998888' }),
      })
    )

    const updateBody = await readJson<{ data: { phone: string } }>(updateResponse)
    expect(updateBody.data.phone).toBe('11999998888')

    const deleteResponse = await app.handle(
      new Request(`http://localhost/users/${created.data.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
    )
    expect(deleteResponse.status).toBe(200)
  })

  it('prevents a customer from promoting their own role', async () => {
    const { app, userRepository } = createTestApp()

    const createResponse = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Maria',
          email: 'maria@example.com',
          password: '12345678',
        }),
      })
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<{ data: { id: string } }>(createResponse)
    const cookie = createAuthCookie({ sub: created.data.id, role: 'CUSTOMER' })

    const response = await app.handle(
      new Request(`http://localhost/users/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ role: 'ADMIN' }),
      })
    )

    expect(response.status).toBe(400)
    const body = await readJson<{ message: string }>(response)
    expect(body.message).toContain('Nenhum campo valido')

    const persistedUser = await userRepository.findById(created.data.id)
    expect(persistedUser?.role).toBe('CUSTOMER')
  })

  it('allows admin to search users by name', async () => {
    const { app } = createTestApp()
    const adminCookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Carlos Henrique',
          email: 'carlos@example.com',
          password: '12345678',
        }),
      })
    )

    await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ana Paula',
          email: 'ana@example.com',
          password: '12345678',
        }),
      })
    )

    const response = await app.handle(
      new Request('http://localhost/users?search=henri', {
        headers: { Cookie: adminCookie },
      })
    )

    expect(response.status).toBe(200)
    const users = await readJson<Array<{ name: string }>>(response)
    expect(users).toHaveLength(1)
    expect(users[0]?.name).toBe('Carlos Henrique')
  })

  it('prevents admin from changing customer password', async () => {
    const { app } = createTestApp()
    const adminCookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    const createResponse = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cliente Senha',
          email: 'clientesenha@example.com',
          password: '12345678',
        }),
      })
    )

    const created = await readJson<{ data: { id: string } }>(createResponse)

    const updateResponse = await app.handle(
      new Request(`http://localhost/users/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          password: '87654321',
        }),
      })
    )

    expect(updateResponse.status).toBe(403)
    const body = await readJson<{ message: string }>(updateResponse)
    expect(body.message).toContain('nao podem alterar senha de clientes')
  })
})
