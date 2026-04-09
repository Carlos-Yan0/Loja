import type { PrismaClient } from '../../../../generated/prisma/client'
import type { CreateUserRecord, UpdateUserRecord, UserRepository } from '../application/user-repository'
import { withDatabaseErrorHandling } from '../../../libs/prisma'

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
} as const

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: Pick<PrismaClient, 'user'>) {}

  create(input: CreateUserRecord) {
    return withDatabaseErrorHandling(() =>
      this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone ?? null,
        },
        select: userSelect,
      })
    )
  }

  findAll(search?: string) {
    return withDatabaseErrorHandling(() =>
      this.prisma.user.findMany({
        where: search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : undefined,
        orderBy: { name: 'asc' },
        select: userSelect,
      })
    )
  }

  findById(id: string) {
    return withDatabaseErrorHandling(() =>
      this.prisma.user.findUnique({
        where: { id },
        select: userSelect,
      })
    )
  }

  update(id: string, input: UpdateUserRecord) {
    return withDatabaseErrorHandling(() =>
      this.prisma.user.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.password !== undefined && { password: input.password }),
          ...(input.phone !== undefined && { phone: input.phone ?? null }),
          ...(input.role !== undefined && { role: input.role }),
        },
        select: userSelect,
      })
    )
  }

  async delete(id: string) {
    await withDatabaseErrorHandling(() => this.prisma.user.delete({ where: { id } }))
  }
}
