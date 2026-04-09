export interface Product {
  id: string
  name: string
  price: number
  category: string
  tags: string[]
  stock: number
  images: string[]
}

export interface CreateProductInput {
  name: string
  price: number
  category: string
  tags?: string[]
  stock: number
  images?: string[]
}

export interface UpdateProductInput {
  name?: string
  price?: number
  category?: string
  tags?: string[]
  stock?: number
  images?: string[]
}

export type ProductSort = 'BESTSELLERS'

export interface ProductFilters {
  search?: string
  category?: string
  tag?: string
  sort?: ProductSort
}
