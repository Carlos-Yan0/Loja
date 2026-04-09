export interface AppErrorOptions {
  code?: string
  statusCode?: number
  details?: unknown
}

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppError'
    this.code = options.code ?? 'APP_ERROR'
    this.statusCode = options.statusCode ?? 400
    this.details = options.details
  }
}

export const isAppError = (error: unknown): error is AppError => {
  if (error instanceof AppError) return true
  if (!error || typeof error !== 'object') return false

  const candidate = error as Partial<AppError>
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.statusCode === 'number'
  )
}
