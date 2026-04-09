import { describe, expect, it } from 'bun:test'
import { createTestApp } from '../helpers/in-memory-dependencies'
import { createAuthCookie, readJson } from '../helpers/http'

describe('menu routes', () => {
  it('returns public menu and allows admin to manage home banner/sections', async () => {
    const { app, productRepository } = createTestApp()
    const adminCookie = createAuthCookie({ sub: crypto.randomUUID(), role: 'ADMIN' })

    await productRepository.create({
      name: 'Camiseta Feminina',
      price: 89.9,
      category: 'Feminino',
      tags: ['Lancamento', 'Streetwear'],
      stock: 10,
    })

    await productRepository.create({
      name: 'Camiseta Masculina',
      price: 99.9,
      category: 'Masculino',
      tags: ['Basico'],
      stock: 12,
    })

    const publicBeforeResponse = await app.handle(new Request('http://localhost/menu'))
    expect(publicBeforeResponse.status).toBe(200)
    const publicBefore = await readJson<{ items: Array<{ type: string; label: string }> }>(
      publicBeforeResponse
    )
    expect(publicBefore.items.some((item) => item.type === 'BESTSELLERS')).toBe(true)

    const adminStateResponse = await app.handle(
      new Request('http://localhost/menu/admin', {
        headers: { Cookie: adminCookie },
      })
    )
    expect(adminStateResponse.status).toBe(200)

    const updateResponse = await app.handle(
      new Request('http://localhost/menu/admin', {
        method: 'PUT',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: ['Masculino'],
          tags: ['Streetwear'],
          homeBanner: {
            enabled: true,
            imageUrl: 'https://cdn.test/home-banner.jpg',
            ctaLabel: 'Ver camisa masculina',
            targetType: 'CATEGORY',
            targetValue: 'Masculino',
          },
          homeSections: [
            {
              type: 'CATEGORY',
              value: 'Masculino',
              title: 'Masculino em alta',
              enabled: true,
            },
            {
              type: 'TAG',
              value: 'Streetwear',
              title: 'Streetwear',
              enabled: false,
            },
          ],
        }),
      })
    )
    expect(updateResponse.status).toBe(200)

    const publicAfterResponse = await app.handle(new Request('http://localhost/menu'))
    const publicAfter = await readJson<{
      items: Array<{ type: string; label: string }>
      home: {
        banner: {
          enabled: boolean
          targetType: string
          targetValue: string
        }
        sections: Array<{ type: string; value: string; title: string; enabled: boolean }>
      }
    }>(
      publicAfterResponse
    )

    expect(publicAfter.items.some((item) => item.type === 'CATEGORY' && item.label === 'Masculino')).toBe(
      true
    )
    expect(publicAfter.items.some((item) => item.type === 'TAG' && item.label === 'Streetwear')).toBe(
      true
    )
    expect(publicAfter.home.banner.enabled).toBe(true)
    expect(publicAfter.home.banner.targetType).toBe('CATEGORY')
    expect(publicAfter.home.banner.targetValue).toBe('Masculino')
    expect(publicAfter.home.sections.length).toBe(4)
    expect(
      publicAfter.home.sections.some(
        (section) => section.type === 'TAG' && section.value === 'Streetwear'
      )
    ).toBe(true)
    expect(
      publicAfter.home.sections.some(
        (section) => section.type === 'TAG' && section.value === 'Streetwear' && section.enabled === false
      )
    ).toBe(true)
  })
})
