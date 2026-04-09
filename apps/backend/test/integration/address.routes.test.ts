import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

describe('address routes', () => {
  it('covers create, list, update and delete for the authenticated user', async () => {
    const { app } = createTestApp()
    const userId = crypto.randomUUID()
    const cookie = createAuthCookie({ sub: userId, role: 'CUSTOMER' })

    const createResponse = await app.handle(
      new Request('http://localhost/addresses', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cep: '01001-000',
          street: 'Praca da Se',
          number: '10',
        }),
      })
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<{ data: { id: string } }>(createResponse)

    const listResponse = await app.handle(
      new Request('http://localhost/addresses', {
        headers: { Cookie: cookie },
      })
    )
    const listBody = await readJson<Array<{ id: string }>>(listResponse)
    expect(listBody).toHaveLength(1)
    expect(listBody[0]?.id).toBe(created.data.id)

    const updateResponse = await app.handle(
      new Request(`http://localhost/addresses/${created.data.id}`, {
        method: 'PUT',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ complement: 'Apto 12' }),
      })
    )
    const updateBody = await readJson<{ data: { complement: string } }>(updateResponse)
    expect(updateBody.data.complement).toBe('Apto 12')

    const deleteResponse = await app.handle(
      new Request(`http://localhost/addresses/${created.data.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
    )
    expect(deleteResponse.status).toBe(200)
  })
})
