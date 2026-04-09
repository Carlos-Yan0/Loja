import type { ProductRepository } from '../../product/application/product-repository'
import type { MenuConfigRepository } from './menu-config-repository'
import type {
  MenuAdminState,
  MenuBannerTargetType,
  MenuConfig,
  MenuConfigInput,
  MenuFacetType,
  MenuFacets,
  MenuHomeBannerConfig,
  MenuHomeSectionConfig,
  MenuItem,
  MenuPublicState,
} from '../domain/menu'
import { badRequest } from '../../../shared/errors/error-factory'
import { normalizeOptionalText, normalizeStringArray } from '../../../shared/utils/normalize'

const fixedItems: MenuItem[] = [
  {
    id: 'fixed-bestsellers',
    label: 'Mais vendidas',
    type: 'BESTSELLERS',
  },
]

const homeBannerDefault: MenuHomeBannerConfig = {
  enabled: false,
  imageUrl: '',
  ctaLabel: 'Explorar agora',
  targetType: 'BESTSELLERS',
  targetValue: '',
}

const maxHomeSections = 4

const sortAndUnique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

const byCaseInsensitiveMatch = (available: string[], selected: string[]) => {
  const availableByLower = new Map(available.map((value) => [value.toLowerCase(), value]))
  return selected
    .map((entry) => availableByLower.get(entry.toLowerCase()))
    .filter((entry): entry is string => Boolean(entry))
}

const byCaseInsensitiveMatchOne = (available: string[], value: string) => {
  const found = byCaseInsensitiveMatch(available, [value])
  return found[0] ?? ''
}

const toIdFragment = (value: string) => value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

const homeSectionKey = (type: MenuFacetType, value: string) => `${type}:${value.toLowerCase()}`

export class MenuService {
  constructor(
    private readonly menuConfigRepository: MenuConfigRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async getPublicMenu(): Promise<MenuPublicState> {
    const available = await this.getAvailableState()
    const selected = await this.getSelectedConfig(available)
    const dynamicItems = this.toDynamicItems(selected)

    return {
      items: [...fixedItems, ...dynamicItems],
      home: {
        banner: selected.homeBanner,
        sections: selected.homeSections,
      },
    }
  }

  async getAdminState(): Promise<MenuAdminState> {
    const available = await this.getAvailableState()
    const selected = await this.getSelectedConfig(available)

    return {
      fixedItems,
      available,
      selected,
    }
  }

  async updateSelection(input: MenuConfigInput) {
    const current = await this.menuConfigRepository.get()
    const available = await this.getAvailableState()

    const normalizedCategories =
      normalizeStringArray(input.categories ?? current.categories, {
        field: 'Categoria',
        maxLength: 80,
        maxItems: 20,
      }) ?? []

    const normalizedTags =
      normalizeStringArray(input.tags ?? current.tags, {
        field: 'Tag',
        maxLength: 30,
        maxItems: 20,
      }) ?? []

    const persistedCategories = byCaseInsensitiveMatch(available.categories, normalizedCategories)
    const persistedTags = byCaseInsensitiveMatch(available.tags, normalizedTags)

    const homeBanner = this.normalizeHomeBanner(
      input.homeBanner ?? current.homeBanner,
      available,
      current.homeBanner
    )

    const homeSections = this.normalizeHomeSections(
      input.homeSections ?? current.homeSections,
      {
        categories: persistedCategories,
        tags: persistedTags,
      },
      available
    )

    const persisted = await this.menuConfigRepository.save({
      categories: persistedCategories,
      tags: persistedTags,
      homeBanner,
      homeSections,
    })

    return {
      fixedItems,
      available,
      selected: persisted,
    }
  }

  private async getAvailableState(): Promise<MenuAdminState['available']> {
    const products = await this.productRepository.findAll()

    return {
      categories: sortAndUnique(products.map((product) => product.category.trim()).filter(Boolean)),
      tags: sortAndUnique(
        products
          .flatMap((product) => product.tags)
          .map((tag) => tag.trim())
          .filter(Boolean)
      ),
      products: products
        .map((product) => ({
          id: product.id,
          name: product.name,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    }
  }

  private async getSelectedConfig(available: MenuAdminState['available']): Promise<MenuConfig> {
    const config = await this.menuConfigRepository.get()

    const categories = byCaseInsensitiveMatch(available.categories, config.categories)
    const tags = byCaseInsensitiveMatch(available.tags, config.tags)

    return {
      categories,
      tags,
      homeBanner: this.normalizeHomeBanner(config.homeBanner, available, homeBannerDefault),
      homeSections: this.normalizeHomeSections(
        config.homeSections,
        { categories, tags },
        available
      ),
    }
  }

  private normalizeHomeBanner(
    banner: Partial<MenuHomeBannerConfig> | undefined,
    available: MenuAdminState['available'],
    fallback: MenuHomeBannerConfig
  ): MenuHomeBannerConfig {
    const targetTypes = new Set<MenuBannerTargetType>(['BESTSELLERS', 'CATEGORY', 'TAG', 'PRODUCT'])
    const targetType = targetTypes.has(banner?.targetType as MenuBannerTargetType)
      ? (banner?.targetType as MenuBannerTargetType)
      : fallback.targetType

    const imageUrl =
      normalizeOptionalText(banner?.imageUrl, {
        field: 'URL da imagem do banner',
        maxLength: 500,
      }) ?? ''

    const ctaLabel =
      normalizeOptionalText(banner?.ctaLabel, {
        field: 'Texto do botao do banner',
        minLength: 2,
        maxLength: 60,
      }) ?? homeBannerDefault.ctaLabel

    const targetValueRaw =
      normalizeOptionalText(banner?.targetValue, {
        field: 'Destino do banner',
        maxLength: 120,
      }) ?? ''

    let targetValue = ''
    if (targetType === 'CATEGORY') {
      targetValue = byCaseInsensitiveMatchOne(available.categories, targetValueRaw)
    } else if (targetType === 'TAG') {
      targetValue = byCaseInsensitiveMatchOne(available.tags, targetValueRaw)
    } else if (targetType === 'PRODUCT') {
      targetValue = available.products.some((product) => product.id === targetValueRaw)
        ? targetValueRaw
        : ''
    }

    const enabled = banner?.enabled === true
    if (enabled && !imageUrl) {
      throw badRequest('Informe a URL da imagem do banner da home.')
    }

    if (enabled && targetType !== 'BESTSELLERS' && !targetValue) {
      throw badRequest('Selecione um destino valido para o banner da home.')
    }

    return {
      enabled,
      imageUrl,
      ctaLabel,
      targetType,
      targetValue,
    }
  }

  private normalizeHomeSections(
    homeSectionsInput: Array<Partial<MenuHomeSectionConfig>> | undefined,
    selected: Pick<MenuConfig, 'categories' | 'tags'>,
    available: MenuAdminState['available']
  ) {
    const selectedEntries: MenuHomeSectionConfig[] = []
    const selectedKeys = new Set<string>()

    const requestedSections = Array.isArray(homeSectionsInput)
      ? homeSectionsInput.slice(0, maxHomeSections)
      : []

    for (const section of requestedSections) {
      const type: MenuFacetType = section.type === 'TAG' ? 'TAG' : 'CATEGORY'
      const rawValue =
        normalizeOptionalText(section.value, {
          field: 'Filtro da secao da home',
          maxLength: 80,
        }) ?? ''

      const value =
        type === 'CATEGORY'
          ? byCaseInsensitiveMatchOne(available.categories, rawValue)
          : byCaseInsensitiveMatchOne(available.tags, rawValue)

      if (!value) {
        continue
      }

      const key = homeSectionKey(type, value)
      if (selectedKeys.has(key)) {
        continue
      }

      selectedKeys.add(key)
      selectedEntries.push({
        id: `home-section-${selectedEntries.length + 1}`,
        type,
        value,
        title:
          normalizeOptionalText(section.title, {
            field: 'Titulo da secao da home',
            maxLength: 60,
          }) ?? value,
        enabled: section.enabled !== false,
      })
    }

    const fallbackSections: MenuHomeSectionConfig[] = [
      ...selected.categories.map((category) => ({
        id: '',
        type: 'CATEGORY' as const,
        value: category,
        title: category,
        enabled: true,
      })),
      ...selected.tags.map((tag) => ({
        id: '',
        type: 'TAG' as const,
        value: tag,
        title: tag,
        enabled: true,
      })),
      ...available.categories.map((category) => ({
        id: '',
        type: 'CATEGORY' as const,
        value: category,
        title: category,
        enabled: true,
      })),
      ...available.tags.map((tag) => ({
        id: '',
        type: 'TAG' as const,
        value: tag,
        title: tag,
        enabled: true,
      })),
    ]

    for (const fallback of fallbackSections) {
      if (selectedEntries.length >= maxHomeSections) break

      const key = homeSectionKey(fallback.type, fallback.value)
      if (selectedKeys.has(key)) continue

      selectedKeys.add(key)
      selectedEntries.push({
        id: `home-section-${selectedEntries.length + 1}`,
        type: fallback.type,
        value: fallback.value,
        title: fallback.title,
        enabled: fallback.enabled,
      })
    }

    return selectedEntries.slice(0, maxHomeSections)
  }

  private toDynamicItems(selection: MenuConfig): MenuItem[] {
    const categoryItems = selection.categories.map((category) => ({
      id: `category-${toIdFragment(category)}`,
      label: category,
      type: 'CATEGORY' as const,
      value: category,
    }))

    const tagItems = selection.tags.map((tag) => ({
      id: `tag-${toIdFragment(tag)}`,
      label: tag,
      type: 'TAG' as const,
      value: tag,
    }))

    return [...categoryItems, ...tagItems]
  }
}
