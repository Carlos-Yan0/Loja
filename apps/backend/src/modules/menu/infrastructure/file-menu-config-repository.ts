import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { MenuConfigRepository } from '../application/menu-config-repository'
import type { MenuConfig, MenuHomeBannerConfig, MenuHomeSectionConfig } from '../domain/menu'

const defaultConfig: MenuConfig = {
  categories: ['Feminino', 'Masculino', 'Oversized'],
  tags: ['Lancamento'],
  homeBanner: {
    enabled: false,
    imageUrl: '',
    ctaLabel: 'Explorar agora',
    targetType: 'BESTSELLERS',
    targetValue: '',
  },
  homeSections: [],
}

const toStringArray = (values: unknown) => (Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [])

const toHomeBanner = (value: unknown): MenuHomeBannerConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultConfig.homeBanner }
  }

  const parsed = value as Partial<MenuHomeBannerConfig>
  const allowedTypes = new Set(['BESTSELLERS', 'CATEGORY', 'TAG', 'PRODUCT'])

  return {
    enabled: parsed.enabled === true,
    imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : defaultConfig.homeBanner.imageUrl,
    ctaLabel: typeof parsed.ctaLabel === 'string' ? parsed.ctaLabel : defaultConfig.homeBanner.ctaLabel,
    targetType:
      typeof parsed.targetType === 'string' && allowedTypes.has(parsed.targetType)
        ? parsed.targetType
        : defaultConfig.homeBanner.targetType,
    targetValue:
      typeof parsed.targetValue === 'string'
        ? parsed.targetValue
        : defaultConfig.homeBanner.targetValue,
  }
}

const toHomeSections = (value: unknown): MenuHomeSectionConfig[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is Partial<MenuHomeSectionConfig> => Boolean(entry && typeof entry === 'object'))
    .map((entry, index) => {
      const type = entry.type === 'TAG' ? 'TAG' : 'CATEGORY'
      const sectionValue = typeof entry.value === 'string' ? entry.value : ''
      const title = typeof entry.title === 'string' ? entry.title : sectionValue

      return {
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `home-section-${index + 1}`,
        type,
        value: sectionValue,
        title,
        enabled: entry.enabled !== false,
      }
    })
    .slice(0, 4)
}

export class FileMenuConfigRepository implements MenuConfigRepository {
  constructor(
    private readonly filePath = process.env.MENU_CONFIG_FILE_PATH
      ? process.env.MENU_CONFIG_FILE_PATH
      : join(process.cwd(), 'data', 'menu-config.json')
  ) {}

  async get() {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<MenuConfig>

      return {
        categories: toStringArray(parsed.categories),
        tags: toStringArray(parsed.tags),
        homeBanner: toHomeBanner(parsed.homeBanner),
        homeSections: toHomeSections(parsed.homeSections),
      }
    } catch {
      await this.save(defaultConfig)
      return { ...defaultConfig }
    }
  }

  async save(config: MenuConfig) {
    await mkdir(dirname(this.filePath), { recursive: true })

    const sanitized: MenuConfig = {
      categories: toStringArray(config.categories),
      tags: toStringArray(config.tags),
      homeBanner: toHomeBanner(config.homeBanner),
      homeSections: toHomeSections(config.homeSections),
    }

    await writeFile(this.filePath, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8')
    return sanitized
  }
}
