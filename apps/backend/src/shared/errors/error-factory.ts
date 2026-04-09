import { AppError } from './app-error'

export const badRequest = (message: string, details?: unknown) =>
  new AppError(message, { code: 'BAD_REQUEST', statusCode: 400, details })

export const unauthorized = (message = 'Nao autenticado') =>
  new AppError(message, { code: 'UNAUTHORIZED', statusCode: 401 })

export const forbidden = (message = 'Acesso negado') =>
  new AppError(message, { code: 'FORBIDDEN', statusCode: 403 })

export const notFound = (message: string) =>
  new AppError(message, { code: 'NOT_FOUND', statusCode: 404 })

export const conflict = (message: string) =>
  new AppError(message, { code: 'CONFLICT', statusCode: 409 })

export const payloadTooLarge = (message: string) =>
  new AppError(message, { code: 'PAYLOAD_TOO_LARGE', statusCode: 413 })

export const unsupportedMediaType = (message: string) =>
  new AppError(message, { code: 'UNSUPPORTED_MEDIA_TYPE', statusCode: 415 })

export const tooManyRequests = (message = 'Muitas requisicoes, tente novamente em instantes.') =>
  new AppError(message, { code: 'TOO_MANY_REQUESTS', statusCode: 429 })

export const serviceUnavailable = (message: string) =>
  new AppError(message, { code: 'SERVICE_UNAVAILABLE', statusCode: 503 })
