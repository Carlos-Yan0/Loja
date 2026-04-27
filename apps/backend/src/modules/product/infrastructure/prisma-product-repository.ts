import type { PrismaClient } from '../../../../generated/prisma/client'
import type { CreateProductInput, Product, ProductFilters, UpdateProductInput } from '../domain/product'
import type { ProductRepository } from '../application/product-repository'
import { deserializeTags, serializeTags } from '../../../shared/utils/product-mapper'
import { withDatabaseErrorHandling } from '../../../libs/prisma'

const confirmedBestSellerStatuses = ['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'] as const

const productSelect = {
  id: true,
  name: true,
  price: true,
  category: true,
  tags: true,
  stock: true,
  images: true,
} as const

type PrismaProductRecord = {
  id: string
  name: string
  price: number
  category: string
  tags: string | null
  stock: number
  images: string[]
}

const toDomain = (product: PrismaProductRecord): Product => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category: product.category,
  tags: deserializeTags(product.tags),
  stock: product.stock,
  images: product.images,
})

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: Pick<PrismaClient, 'product' | 'orderItem'>) {}

  async create(input: CreateProductInput) {
    const product = await withDatabaseErrorHandling(() =>
      this.prisma.product.create({
        data: {
          name: input.name,
          price: input.price,
          category: input.category,
          tags: serializeTags(input.tags),
          stock: input.stock,
          images: input.images ?? [],
        },
        select: productSelect,
      })
    )

    return toDomain(product)
  }

  async findAll(filters?: ProductFilters) {
    if (filters?.sort === 'BESTSELLERS') {
      const bestsellerRows = await withDatabaseErrorHandling(() =>
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              status: {
                in: [...confirmedBestSellerStatuses],
              },
            },
          },
          _sum: {
            quantity: true,
          },
        })
      )

      const soldRows = bestsellerRows
        .map((row) => ({
          productId: row.productId,
          soldQuantity: row._sum.quantity ?? 0,
        }))
        .filter((row) => row.soldQuantity > 0)

      if (soldRows.length === 0) {
        return []
      }

      const soldQuantityByProductId = new Map(
        soldRows.map((row) => [row.productId, row.soldQuantity])
      )

      const where: Record<string, unknown> = {
        id: {
          in: soldRows.map((row) => row.productId),
        },
      }

      if (filters?.search) {
        where.OR = [
          {
            name: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        ]
      }

      if (filters?.category) {
        where.category = {
          contains: filters.category,
          mode: 'insensitive',
        }
      }

      if (filters?.tag) {
        where.tags = {
          contains: filters.tag,
          mode: 'insensitive',
        }
      }

      const products = await withDatabaseErrorHandling(() =>
        this.prisma.product.findMany({
          where,
          select: productSelect,
        })
      )

      return products
        .map((product) => ({
          ...toDomain(product),
          soldQuantity: soldQuantityByProductId.get(product.id) ?? 0,
        }))
        .sort((left, right) => {
          const quantityDiff = (right.soldQuantity ?? 0) - (left.soldQuantity ?? 0)
          if (quantityDiff !== 0) return quantityDiff
          return left.name.localeCompare(right.name, 'pt-BR')
        })
    }

    const where: Record<string, unknown> = {}
    const orderBy = { name: 'asc' } as const

    if (filters?.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          category: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          tags: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ]
    }

    if (filters?.category) {
      where.category = {
        contains: filters.category,
        mode: 'insensitive',
      }
    }

    if (filters?.tag) {
      where.tags = {
        contains: filters.tag,
        mode: 'insensitive',
      }
    }

    const products = await withDatabaseErrorHandling(() =>
      this.prisma.product.findMany({
        where,
        orderBy,
        select: productSelect,
      })
    )

    return products.map(toDomain)
  }

  async findById(id: string) {
    const product = await withDatabaseErrorHandling(() =>
      this.prisma.product.findUnique({
        where: { id },
        select: productSelect,
      })
    )

    return product ? toDomain(product) : null
  }

  async findByIds(ids: string[]) {
    const products = await withDatabaseErrorHandling(() =>
      this.prisma.product.findMany({
        where: { id: { in: ids } },
        select: productSelect,
      })
    )

    return products.map(toDomain)
  }

  async update(id: string, input: UpdateProductInput) {
    const product = await withDatabaseErrorHandling(() =>
      this.prisma.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.tags !== undefined && { tags: serializeTags(input.tags) }),
          ...(input.stock !== undefined && { stock: input.stock }),
          ...(input.images !== undefined && { images: input.images }),
        },
        select: productSelect,
      })
    )

    return toDomain(product)
  }

  async delete(id: string) {
    await withDatabaseErrorHandling(() => this.prisma.product.delete({ where: { id } }))
  }

  async appendImage(productId: string, imageUrl: string) {
    const current = await withDatabaseErrorHandling(() =>
      this.prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: productSelect,
      })
    )

    const images = current.images.includes(imageUrl) ? current.images : [...current.images, imageUrl]

    const updated = await withDatabaseErrorHandling(() =>
      this.prisma.product.update({
        where: { id: productId },
        data: { images },
        select: productSelect,
      })
    )

    return toDomain(updated)
  }
}
