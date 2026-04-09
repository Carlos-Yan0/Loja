export const normalizeCepDigits = (value) => String(value ?? '').replace(/\D/g, '')

const toNormalizedText = (value) => String(value ?? '').trim()

const toUpper = (value) => toNormalizedText(value).toUpperCase()

const isProviderNotFoundPayload = (payload) =>
  Boolean(payload?.erro) || (Array.isArray(payload?.errors) && payload.errors.length > 0)

const normalizeProviderAddress = (payload) => ({
  cep: normalizeCepDigits(payload?.cep),
  street: toNormalizedText(payload?.street ?? payload?.logradouro),
  neighborhood: toNormalizedText(payload?.neighborhood ?? payload?.bairro),
  city: toNormalizedText(payload?.city ?? payload?.localidade),
  state: toUpper(payload?.state ?? payload?.uf),
})

export const requiresPostalCodeFallback = (address) => {
  const normalized = normalizeProviderAddress(address)

  if (normalized.cep.length !== 8) return true
  if (!normalized.city || normalized.city.toLowerCase() === 'nao informado') return true
  if (!normalized.state) return true
  return false
}

export const mergePostalCodeAddress = (primary, fallback) => {
  const base = normalizeProviderAddress(primary)
  const safeFallback = normalizeProviderAddress(fallback)

  return {
    cep: base.cep || safeFallback.cep,
    street: base.street || safeFallback.street,
    neighborhood: base.neighborhood || safeFallback.neighborhood,
    city:
      !base.city || base.city.toLowerCase() === 'nao informado'
        ? safeFallback.city || base.city
        : base.city,
    state: base.state || safeFallback.state,
  }
}

export const lookupPostalCodeInPublicProviders = async (cep, fetcher = fetch) => {
  const digits = normalizeCepDigits(cep)
  if (digits.length !== 8) return null

  const providers = [
    `https://viacep.com.br/ws/${digits}/json/`,
    `https://brasilapi.com.br/api/cep/v1/${digits}`,
  ]

  for (const url of providers) {
    let response

    try {
      response = await fetcher(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })
    } catch {
      continue
    }

    if (!response.ok) continue

    let payload
    try {
      payload = await response.json()
    } catch {
      continue
    }

    if (isProviderNotFoundPayload(payload)) continue

    const normalized = normalizeProviderAddress(payload)
    if (normalized.state && normalized.city) {
      return normalized
    }
  }

  return null
}

