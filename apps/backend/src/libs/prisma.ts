import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'
import { env } from '../config/env'
import { serviceUnavailable } from '../shared/errors/error-factory'

let prismaInstance: PrismaClient | null = null

export const isDatabaseAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('Authentication failed against the database server') ||
    message.includes('password authentication failed') ||
    message.includes('SASL') ||
    message.includes('28P01')
  )
}

export const isDatabaseUnavailableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return (
    isDatabaseAuthError(error) ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('database server') ||
    message.includes('Can\'t reach database server')
  )
}

export const getPrismaClient = () => {
  if (prismaInstance) {
    return prismaInstance
  }

  if (!env.databaseUrl) {
    throw serviceUnavailable('DATABASE_URL nao definido no ambiente.')
  }

  const pool = new Pool({ connectionString: env.databaseUrl })
  const adapter = new PrismaPg(pool)
  prismaInstance = new PrismaClient({ adapter })

  return prismaInstance
}

export const withDatabaseErrorHandling = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation()
  } catch (error) {
    if (isDatabaseAuthError(error)) {
      throw serviceUnavailable(
        'Falha ao autenticar no PostgreSQL. Revise o DATABASE_URL do backend para usar o usuario e a senha reais da sua instancia local.'
      )
    }

    if (isDatabaseUnavailableError(error)) {
      throw serviceUnavailable(
        'Nao foi possivel conectar ao PostgreSQL. Confirme se o servico local esta ativo e se o DATABASE_URL aponta para a instancia correta.'
      )
    }

    throw error
  }
}
