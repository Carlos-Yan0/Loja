import { describe, expect, it } from 'bun:test'
import { MenuService } from '../../src/modules/menu/application/menu-service'
import {
  InMemoryMenuConfigRepository,
  InMemoryProductRepository,
} from '../helpers/in-memory-dependencies'

describe('MenuService', () => {
  it('returns fixed menu items and configurable home sections/banner', async () => {
    const productRepository = new InMemoryProductRepository()
    const menuConfigRepository = new InMemoryMenuConfigRepository()
    const service = new MenuService(menuConfigRepository, productRepository)

    await productRepository.create({
      name: 'Camiseta Oversized',
      price: 120,
      category: 'Oversized',
      tags: ['Lancamento'],
      stock: 5,
    })

    await service.updateSelection({
      categories: ['Oversized'],
      tags: ['Lancamento'],
      homeBanner: {
        enabled: true,
        imageUrl: 'https://cdn.test/banner-home.jpg',
        ctaLabel: 'Ver oversized',
        targetType: 'CATEGORY',
        targetValue: 'Oversized',
      },
      homeSections: [
        {
          type: 'CATEGORY',
          value: 'Oversized',
          title: 'Oversized em destaque',
        },
      ],
    })

    const result = await service.getPublicMenu()
    expect(result.items.some((item) => item.type === 'BESTSELLERS')).toBe(true)
    expect(result.items.some((item) => item.type === 'CATEGORY' && item.value === 'Oversized')).toBe(true)
    expect(result.items.some((item) => item.type === 'TAG' && item.value === 'Lancamento')).toBe(true)
    expect(result.home.banner.enabled).toBe(true)
    expect(result.home.banner.targetType).toBe('CATEGORY')
    expect(result.home.banner.targetValue).toBe('Oversized')
    expect(result.home.sections.length).toBe(2)
    expect(result.home.sections[0]?.value).toBe('Oversized')
    expect(result.home.sections[0]?.enabled).toBe(true)
  })

  it('keeps disabled sections persisted so admin can hide without losing configuration', async () => {
    const productRepository = new InMemoryProductRepository()
    const menuConfigRepository = new InMemoryMenuConfigRepository()
    const service = new MenuService(menuConfigRepository, productRepository)

    await productRepository.create({
      name: 'Camiseta Street',
      price: 120,
      category: 'Streetwear',
      tags: ['Urbano'],
      stock: 5,
    })

    await service.updateSelection({
      categories: ['Streetwear'],
      tags: ['Urbano'],
      homeSections: [
        {
          type: 'CATEGORY',
          value: 'Streetwear',
          title: 'Streetwear',
          enabled: false,
        },
      ],
    })

    const result = await service.getPublicMenu()
    expect(result.home.sections[0]?.value).toBe('Streetwear')
    expect(result.home.sections[0]?.enabled).toBe(false)
  })
})
