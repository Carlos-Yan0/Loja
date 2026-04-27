import type { Product } from '../../product/domain/product'

export type MenuItemType = 'BESTSELLERS' | 'CATEGORY' | 'TAG'
export type MenuFacetType = 'CATEGORY' | 'TAG'
export type MenuBannerTargetType = 'BESTSELLERS' | 'CATEGORY' | 'TAG' | 'PRODUCT'

export interface MenuItem {
  id: string
  label: string
  type: MenuItemType
  value?: string
}

export interface MenuConfig {
  categories: string[]
  tags: string[]
  homeBanner: MenuHomeBannerConfig
  homeSections: MenuHomeSectionConfig[]
}

export interface MenuFacets {
  categories: string[]
  tags: string[]
}

export interface MenuProductOption {
  id: string
  name: string
}

export interface MenuHomeBannerConfig {
  enabled: boolean
  imageUrl: string
  ctaEnabled: boolean
  ctaTransparent: boolean
  ctaLabel: string
  targetType: MenuBannerTargetType
  targetValue: string
}

export interface MenuHomeSectionConfig {
  id: string
  type: MenuFacetType
  value: string
  title: string
  enabled: boolean
}

export interface MenuHomeSectionPublic extends MenuHomeSectionConfig {
  products?: Product[]
}

export interface MenuConfigInput {
  categories: string[]
  tags: string[]
  homeBanner?: Partial<MenuHomeBannerConfig>
  homeSections?: Array<Partial<MenuHomeSectionConfig>>
}

export interface MenuAdminState {
  fixedItems: MenuItem[]
  available: MenuFacets & {
    products: MenuProductOption[]
  }
  selected: MenuConfig
}

export interface MenuPublicState {
  items: MenuItem[]
  home: {
    banner: MenuHomeBannerConfig
    sections: MenuHomeSectionPublic[]
  }
}
