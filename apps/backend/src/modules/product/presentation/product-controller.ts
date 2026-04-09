import type { ProductService } from '../application/product-service'
import type { CreateProductInput, ProductFilters, UpdateProductInput } from '../domain/product'

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  create(input: CreateProductInput) {
    return this.productService.create(input)
  }

  list(filters?: ProductFilters) {
    return this.productService.findAll(filters)
  }

  getById(id: string) {
    return this.productService.findById(id)
  }

  update(id: string, input: UpdateProductInput) {
    return this.productService.update(id, input)
  }

  delete(id: string) {
    return this.productService.delete(id)
  }
}
