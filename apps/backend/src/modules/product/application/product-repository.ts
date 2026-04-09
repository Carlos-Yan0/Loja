import type { CreateProductInput, Product, ProductFilters, UpdateProductInput } from '../domain/product'

export interface ProductRepository {
  create(input: CreateProductInput): Promise<Product>
  findAll(filters?: ProductFilters): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  findByIds(ids: string[]): Promise<Product[]>
  update(id: string, input: UpdateProductInput): Promise<Product>
  delete(id: string): Promise<void>
  appendImage(productId: string, imageUrl: string): Promise<Product>
}
