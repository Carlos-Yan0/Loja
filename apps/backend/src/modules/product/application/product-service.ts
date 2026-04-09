import type { ProductRepository } from './product-repository'
import type { CreateProductInput, ProductFilters, UpdateProductInput } from '../domain/product'
import { badRequest, notFound } from '../../../shared/errors/error-factory'
import {
  ensureUuid,
  normalizeOptionalText,
  normalizeStringArray,
  normalizeText,
} from '../../../shared/utils/normalize'

const normalizeImageUrls = (images: string[] | undefined) => {
  if (!images) return undefined

  const deduplicated = [...new Set(images.map((value) => value.trim()).filter(Boolean))]

  for (const image of deduplicated) {
    let parsed: URL

    try {
      parsed = new URL(image)
    } catch {
      throw badRequest('Uma ou mais URLs de imagem sao invalidas.')
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw badRequest('Uma ou mais URLs de imagem usam um protocolo nao permitido.')
    }
  }

  if (deduplicated.length > 10) {
    throw badRequest('Cada produto pode ter no maximo 10 imagens.')
  }

  return deduplicated
}

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(input: CreateProductInput) {
    return this.productRepository.create({
      name: normalizeText(input.name, { field: 'Nome do produto', maxLength: 120 }),
      price: this.normalizePrice(input.price),
      category: normalizeText(input.category, { field: 'Categoria', maxLength: 80 }),
      tags: normalizeStringArray(input.tags, {
        field: 'Tag',
        maxLength: 30,
        maxItems: 20,
      }),
      stock: this.normalizeStock(input.stock),
      images: normalizeImageUrls(input.images) ?? [],
    })
  }

  findAll(filters?: ProductFilters) {
    const normalizedFilters: ProductFilters = {
      search: normalizeOptionalText(filters?.search, { field: 'Busca', maxLength: 80 }),
      category: normalizeOptionalText(filters?.category, { field: 'Categoria', maxLength: 80 }),
      tag: normalizeOptionalText(filters?.tag, { field: 'Tag', maxLength: 30 }),
      sort: this.normalizeSort(filters?.sort),
    }

    return this.productRepository.findAll(normalizedFilters)
  }

  async findById(id: string) {
    const productId = ensureUuid(id, 'Produto')
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw notFound('Produto nao encontrado.')
    }

    return product
  }

  async update(id: string, input: UpdateProductInput) {
    const productId = ensureUuid(id, 'Produto')
    await this.findById(productId)

    const payload: UpdateProductInput = {}

    if (input.name !== undefined) {
      payload.name = normalizeText(input.name, { field: 'Nome do produto', maxLength: 120 })
    }

    if (input.price !== undefined) {
      payload.price = this.normalizePrice(input.price)
    }

    if (input.category !== undefined) {
      payload.category = normalizeText(input.category, { field: 'Categoria', maxLength: 80 })
    }

    if (input.tags !== undefined) {
      payload.tags = normalizeStringArray(input.tags, {
        field: 'Tag',
        maxLength: 30,
        maxItems: 20,
      })
    }

    if (input.stock !== undefined) {
      payload.stock = this.normalizeStock(input.stock)
    }

    if (input.images !== undefined) {
      payload.images = normalizeImageUrls(input.images) ?? []
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest('Nenhum campo valido foi enviado para atualizacao.')
    }

    return this.productRepository.update(productId, payload)
  }

  async delete(id: string) {
    const productId = ensureUuid(id, 'Produto')
    await this.findById(productId)
    await this.productRepository.delete(productId)
  }

  async appendImage(productId: string, imageUrl: string) {
    const product = await this.findById(productId)

    if (product.images.includes(imageUrl)) {
      return product
    }

    if (product.images.length >= 10) {
      throw badRequest('Cada produto pode ter no maximo 10 imagens.')
    }

    return this.productRepository.appendImage(product.id, imageUrl)
  }

  private normalizePrice(price: number) {
    if (!Number.isFinite(price) || price < 0) {
      throw badRequest('Preco invalido.')
    }

    return Number(price.toFixed(2))
  }

  private normalizeStock(stock: number) {
    if (!Number.isInteger(stock) || stock < 0) {
      throw badRequest('Estoque invalido.')
    }

    return stock
  }

  private normalizeSort(sort: ProductFilters['sort']) {
    if (!sort) return undefined

    if (sort === 'BESTSELLERS') {
      return sort
    }

    throw badRequest('Ordenacao de produtos invalida.')
  }
}
