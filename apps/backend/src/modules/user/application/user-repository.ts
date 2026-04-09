import type { CreateUserInput, UpdateUserInput, User } from '../domain/user'

export interface CreateUserRecord extends CreateUserInput {
  password: string
}

export interface UpdateUserRecord extends UpdateUserInput {
  password?: string
}

export interface UserRepository {
  create(input: CreateUserRecord): Promise<User>
  findAll(search?: string): Promise<User[]>
  findById(id: string): Promise<User | null>
  update(id: string, input: UpdateUserRecord): Promise<User>
  delete(id: string): Promise<void>
}
