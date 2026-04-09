export type UserRole = 'ADMIN' | 'CUSTOMER'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string | null
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  phone?: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  phone?: string
  role?: UserRole
}
