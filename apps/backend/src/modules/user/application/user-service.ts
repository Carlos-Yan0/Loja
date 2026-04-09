import type { PasswordHasher } from './password-hasher'
import type { UserRepository } from './user-repository'
import type { CreateUserInput, UpdateUserInput, UserRole } from '../domain/user'
import { badRequest, conflict, notFound } from '../../../shared/errors/error-factory'
import {
  ensureUuid,
  normalizeEmail,
  normalizeOptionalText,
  normalizePhone,
  normalizeText,
} from '../../../shared/utils/normalize'

const allowedRoles = new Set<UserRole>(['ADMIN', 'CUSTOMER'])
const isUniqueConstraintError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async create(input: CreateUserInput) {
    const password = this.normalizePassword(input.password)
    const hashedPassword = await this.passwordHasher.hash(password)

    try {
      return await this.userRepository.create({
        name: normalizeText(input.name, { field: 'Nome', maxLength: 120 }),
        email: normalizeEmail(input.email),
        password: hashedPassword,
        phone: normalizePhone(input.phone),
      })
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw conflict('E-mail ja cadastrado.')
      }

      throw error
    }
  }

  findAll(search?: string) {
    const normalizedSearch = normalizeOptionalText(search, {
      field: 'Busca de usuario',
      maxLength: 120,
    })
    return this.userRepository.findAll(normalizedSearch)
  }

  async findById(id: string) {
    const userId = ensureUuid(id, 'Usuario')
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw notFound('Usuario nao encontrado.')
    }

    return user
  }

  async update(id: string, input: UpdateUserInput) {
    const userId = ensureUuid(id, 'Usuario')
    await this.findById(userId)

    const payload: UpdateUserInput = {}

    if (input.name !== undefined) {
      payload.name = normalizeText(input.name, { field: 'Nome', maxLength: 120 })
    }

    if (input.email !== undefined) {
      payload.email = normalizeEmail(input.email)
    }

    if (input.phone !== undefined) {
      payload.phone = normalizePhone(input.phone)
    }

    if (input.role !== undefined) {
      if (!allowedRoles.has(input.role)) {
        throw badRequest('Papel de usuario invalido.')
      }

      payload.role = input.role
    }

    if (input.password !== undefined) {
      payload.password = await this.passwordHasher.hash(this.normalizePassword(input.password))
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest('Nenhum campo valido foi enviado para atualizacao.')
    }

    try {
      return await this.userRepository.update(userId, payload)
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw conflict('E-mail ja cadastrado.')
      }

      throw error
    }
  }

  async delete(id: string) {
    const userId = ensureUuid(id, 'Usuario')
    await this.findById(userId)
    await this.userRepository.delete(userId)
  }

  private normalizePassword(password: string) {
    if (password.length < 8 || password.length > 72) {
      throw badRequest('A senha precisa ter entre 8 e 72 caracteres.')
    }

    return password
  }
}
