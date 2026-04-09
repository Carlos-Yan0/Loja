import type { PrismaClient } from '../../../../generated/prisma/client'
import type { AddressRepository } from '../application/address-repository'
import type { AddressInput, UpdateAddressInput } from '../domain/address'
import { notFound } from '../../../shared/errors/error-factory'
import { withDatabaseErrorHandling } from '../../../libs/prisma'

const addressSelect = {
  id: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
} as const

export class PrismaAddressRepository implements AddressRepository {
  constructor(private readonly prisma: Pick<PrismaClient, 'address'>) {}

  findByUserId(userId: string) {
    return withDatabaseErrorHandling(() =>
      this.prisma.address.findMany({
        where: { UserId: userId },
        orderBy: { id: 'asc' },
        select: addressSelect,
      })
    )
  }

  create(userId: string, input: AddressInput) {
    return withDatabaseErrorHandling(() =>
      this.prisma.address.create({
        data: {
          UserId: userId,
          cep: input.cep,
          street: input.street,
          number: input.number,
          complement: input.complement ?? null,
        },
        select: addressSelect,
      })
    )
  }

  async update(id: string, userId: string, input: UpdateAddressInput) {
    const current = await withDatabaseErrorHandling(() =>
      this.prisma.address.findFirst({
        where: { id, UserId: userId },
        select: { id: true },
      })
    )

    if (!current) {
      throw notFound('Endereco nao encontrado.')
    }

    return withDatabaseErrorHandling(() =>
      this.prisma.address.update({
        where: { id },
        data: {
          ...(input.cep !== undefined && { cep: input.cep }),
          ...(input.street !== undefined && { street: input.street }),
          ...(input.number !== undefined && { number: input.number }),
          ...(input.complement !== undefined && { complement: input.complement ?? null }),
        },
        select: addressSelect,
      })
    )
  }

  async delete(id: string, userId: string) {
    const current = await withDatabaseErrorHandling(() =>
      this.prisma.address.findFirst({
        where: { id, UserId: userId },
        select: { id: true },
      })
    )

    if (!current) {
      throw notFound('Endereco nao encontrado.')
    }

    await withDatabaseErrorHandling(() => this.prisma.address.delete({ where: { id } }))
  }
}
