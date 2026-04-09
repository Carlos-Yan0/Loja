import { badRequest } from '../errors/error-factory'

interface TextOptions {
  field: string
  minLength?: number
  maxLength?: number
}

export const normalizeText = (value: string, options: TextOptions) => {
  const normalized = value.trim().replace(/\s+/g, ' ')
  const minLength = options.minLength ?? 1
  const maxLength = options.maxLength ?? 255

  if (normalized.length < minLength) {
    throw badRequest(`${options.field} precisa ter pelo menos ${minLength} caractere(s).`)
  }

  if (normalized.length > maxLength) {
    throw badRequest(`${options.field} precisa ter no maximo ${maxLength} caracteres.`)
  }

  return normalized
}

export const normalizeOptionalText = (value: string | null | undefined, options: TextOptions) => {
  if (value == null) return undefined
  if (value.trim().length === 0) return undefined
  return normalizeText(value, options)
}

export const normalizeStringArray = (
  values: string[] | undefined,
  options: TextOptions & { maxItems?: number }
) => {
  if (!values) return undefined

  const deduplicated = [...new Set(values.map((value) => normalizeText(value, options)))]
  const maxItems = options.maxItems ?? 20

  if (deduplicated.length > maxItems) {
    throw badRequest(`${options.field} permite no maximo ${maxItems} item(ns).`)
  }

  return deduplicated
}

export const normalizeEmail = (value: string) => {
  const normalized = normalizeText(value.toLowerCase(), {
    field: 'E-mail',
    minLength: 6,
    maxLength: 320,
  })

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalized)) {
    throw badRequest('E-mail invalido.')
  }

  return normalized
}

export const ensureUuid = (value: string, field: string) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(value)) {
    throw badRequest(`${field} invalido.`)
  }

  return value
}

export const normalizeCep = (value: string) => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 8) {
    throw badRequest('CEP invalido.')
  }

  return digits
}

export const normalizePhone = (value: string | undefined) => {
  if (!value) return undefined

  const digits = value.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 11) {
    throw badRequest('Telefone invalido.')
  }

  return digits
}
