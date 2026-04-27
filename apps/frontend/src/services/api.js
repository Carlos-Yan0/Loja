import { normalizeReceipt } from '../utils/order'
import {
  lookupPostalCodeInPublicProviders,
  mergePostalCodeAddress,
  normalizeCepDigits,
  requiresPostalCodeFallback,
} from '../utils/postal-code'

const configuredApiUrl =
  typeof import.meta.env.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '')
    : ''

const browserHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const preferSameOriginApi =
  Boolean(browserHostname) &&
  browserHostname !== 'localhost' &&
  browserHostname !== '127.0.0.1'

const BASE = preferSameOriginApi ? '/api' : configuredApiUrl || '/api'

const withBase = (path) => `${BASE}${path}`
const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      searchParams.set(key, normalized)
    }
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

const readJsonSafely = async (response) => response.json().catch(() => ({}))

const extractApiError = async (response) => {
  const payload = await readJsonSafely(response)
  const message = payload.message || payload.error || `Erro ${response.status}`
  throw new Error(message)
}

const request = async (path, init = {}) => {
  const response = await fetch(withBase(path), {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    await extractApiError(response)
  }

  if (response.status === 204) {
    return null
  }

  return readJsonSafely(response)
}

const jsonRequest = (path, method, body, init = {}) =>
  request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  })

const formRequest = (path, method, formData) =>
  request(path, {
    method,
    body: formData,
  })

const normalizeProduct = (raw) => ({
  id: raw.id,
  name: raw.name,
  price: Number(raw.price ?? 0),
  category: raw.category ?? '',
  tags: Array.isArray(raw.tags) ? raw.tags : [],
  stock: Number(raw.stock ?? 0),
  images: Array.isArray(raw.images) ? raw.images : [],
})

const normalizeAddress = (raw) => ({
  id: raw.id,
  cep: raw.cep ?? '',
  street: raw.street ?? '',
  number: raw.number ?? '',
  complement: raw.complement ?? '',
})

const normalizeUser = (raw) => ({
  id: raw.id,
  name: raw.name ?? '',
  email: raw.email ?? '',
  phone: raw.phone ?? '',
  role: raw.role ?? 'CUSTOMER',
})

const normalizeOrderItem = (raw) => ({
  id: raw.id,
  productId: raw.productId,
  quantity: Number(raw.quantity ?? 0),
  price: Number(raw.price ?? 0),
  product: raw.product
    ? {
        id: raw.product.id,
        name: raw.product.name,
        images: Array.isArray(raw.product.images) ? raw.product.images : [],
      }
    : null,
})

const normalizeOrder = (raw) => ({
  id: raw.id,
  status: raw.status,
  total: Number(raw.total ?? 0),
  shipping: Number(raw.shipping ?? 0),
  payMethod: raw.payMethod ?? raw.PayMethod ?? 'PIX',
  userId: raw.userId ?? '',
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  payment: raw.payment
    ? {
        provider: raw.payment.provider,
        status: raw.payment.status,
        checkoutUrl: raw.payment.checkoutUrl ?? null,
        externalId: raw.payment.externalId ?? null,
        updatedAt: raw.payment.updatedAt,
      }
    : null,
  user: raw.user
    ? {
        id: raw.user.id,
        name: raw.user.name,
        email: raw.user.email,
      }
    : null,
  items: Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : [],
})

const normalizePaymentTransaction = (raw) => ({
  id: raw.id,
  provider: raw.provider,
  status: raw.status,
  orderId: raw.orderId,
  amount: Number(raw.amount ?? 0),
  currency: raw.currency ?? 'BRL',
  externalId: raw.externalId ?? null,
  externalReference: raw.externalReference ?? '',
  checkoutUrl: raw.checkoutUrl ?? null,
  idempotencyKey: raw.idempotencyKey ?? '',
  metadata: raw.metadata ?? null,
  walletBrick:
    raw.walletBrick && typeof raw.walletBrick === 'object'
      ? {
          preferenceId:
            typeof raw.walletBrick.preferenceId === 'string' ? raw.walletBrick.preferenceId : null,
          publicKey: typeof raw.walletBrick.publicKey === 'string' ? raw.walletBrick.publicKey : null,
        }
      : null,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
})

const normalizeMenuItem = (raw) => ({
  id: raw.id,
  label: raw.label ?? '',
  type: raw.type,
  value: raw.value ?? '',
})

const normalizeMenuProductOption = (raw) => ({
  id: raw.id,
  name: raw.name ?? '',
})

const normalizeMenuHomeBanner = (raw) => ({
  enabled: raw?.enabled === true,
  imageUrl: raw?.imageUrl ?? '',
  ctaEnabled: raw?.ctaEnabled !== false,
  ctaTransparent: raw?.ctaTransparent === true,
  ctaLabel: raw?.ctaLabel ?? 'Explorar agora',
  targetType: raw?.targetType ?? 'BESTSELLERS',
  targetValue: raw?.targetValue ?? '',
})

const normalizeMenuHomeSection = (raw, index) => ({
  id: raw?.id ?? `home-section-${index + 1}`,
  type: raw?.type === 'TAG' ? 'TAG' : 'CATEGORY',
  value: raw?.value ?? '',
  title: raw?.title ?? raw?.value ?? '',
  enabled: raw?.enabled !== false,
})

export const api = {
  get: (path) => request(path),
  post: (path, body) => jsonRequest(path, 'POST', body),
  put: (path, body) => jsonRequest(path, 'PUT', body),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => formRequest(path, 'POST', formData),
}

export const uploadApi = {
  uploadBannerImage: async (file) => {
    const formData = new FormData()
    formData.set('file', file)
    return (await api.postForm('/upload/banner-image', formData)).data
  },
}

export const usersApi = {
  create: async (data) => normalizeUser((await api.post('/users', data)).data),
  list: async (search) =>
    (await api.get(`/users${buildQueryString({ search })}`)).map(normalizeUser),
  get: async (id) => normalizeUser(await api.get(`/users/${id}`)),
  update: async (id, data) => normalizeUser((await api.put(`/users/${id}`, data)).data),
  remove: (id) => api.delete(`/users/${id}`),
}

export const authApi = {
  me: () => api.get('/auth/me'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout', {}),
  refresh: () => api.post('/auth/refresh', {}),
}

export const productsApi = {
  list: async (filters) =>
    (await api.get(`/products${buildQueryString(filters)}`)).map(normalizeProduct),
  get: async (id) => normalizeProduct(await api.get(`/products/${id}`)),
  create: async (data) => normalizeProduct((await api.post('/products', data)).data),
  update: async (id, data) => normalizeProduct((await api.put(`/products/${id}`, data)).data),
  remove: (id) => api.delete(`/products/${id}`),
  uploadImage: async (productId, file) => {
    const formData = new FormData()
    formData.set('productId', productId)
    formData.set('file', file)
    const response = (await api.postForm('/upload/product-image', formData)).data

    return {
      ...response,
      product: normalizeProduct(response.product),
    }
  },
}

export const menuApi = {
  getPublic: async () => {
    const response = await api.get('/menu')
    return {
      items: Array.isArray(response.items) ? response.items.map(normalizeMenuItem) : [],
      home: {
        banner: normalizeMenuHomeBanner(response.home?.banner),
        sections: Array.isArray(response.home?.sections)
          ? response.home.sections.map(normalizeMenuHomeSection)
          : [],
      },
    }
  },
  getAdmin: async () => {
    const response = await api.get('/menu/admin')
    return {
      fixedItems: Array.isArray(response.fixedItems) ? response.fixedItems.map(normalizeMenuItem) : [],
      available: {
        categories: Array.isArray(response.available?.categories) ? response.available.categories : [],
        tags: Array.isArray(response.available?.tags) ? response.available.tags : [],
        products: Array.isArray(response.available?.products)
          ? response.available.products.map(normalizeMenuProductOption)
          : [],
      },
      selected: {
        categories: Array.isArray(response.selected?.categories) ? response.selected.categories : [],
        tags: Array.isArray(response.selected?.tags) ? response.selected.tags : [],
        homeBanner: normalizeMenuHomeBanner(response.selected?.homeBanner),
        homeSections: Array.isArray(response.selected?.homeSections)
          ? response.selected.homeSections.map(normalizeMenuHomeSection)
          : [],
      },
    }
  },
  updateAdmin: async (payload) => {
    const response = await api.put('/menu/admin', payload)
    return {
      fixedItems: Array.isArray(response.fixedItems) ? response.fixedItems.map(normalizeMenuItem) : [],
      available: {
        categories: Array.isArray(response.available?.categories) ? response.available.categories : [],
        tags: Array.isArray(response.available?.tags) ? response.available.tags : [],
        products: Array.isArray(response.available?.products)
          ? response.available.products.map(normalizeMenuProductOption)
          : [],
      },
      selected: {
        categories: Array.isArray(response.selected?.categories) ? response.selected.categories : [],
        tags: Array.isArray(response.selected?.tags) ? response.selected.tags : [],
        homeBanner: normalizeMenuHomeBanner(response.selected?.homeBanner),
        homeSections: Array.isArray(response.selected?.homeSections)
          ? response.selected.homeSections.map(normalizeMenuHomeSection)
          : [],
      },
    }
  },
}

export const ordersApi = {
  create: async (payload) => {
    const response = (await api.post('/orders', payload)).data

    return {
      order: normalizeOrder(response.order),
      receipt: normalizeReceipt(response.receipt),
    }
  },
  list: async () => (await api.get('/orders')).map(normalizeOrder),
  listMine: async () => (await api.get('/orders/my')).map(normalizeOrder),
  get: async (id) => normalizeOrder(await api.get(`/orders/${id}`)),
  update: async (id, data) => normalizeOrder((await api.put(`/orders/${id}`, data)).data),
  cancelMine: async (id) => normalizeOrder((await api.post(`/orders/${id}/cancel`, {})).data),
}

export const paymentsApi = {
  createOrderCheckout: async (orderId) =>
    normalizePaymentTransaction((await api.post(`/payments/order/${orderId}/checkout`, {})).data),
  getOrderPayment: async (orderId, { sync = false } = {}) => {
    const query = sync ? '?sync=true' : ''
    const response = await api.get(`/payments/order/${orderId}${query}`)
    return response ? normalizePaymentTransaction(response) : null
  },
}

export const addressesApi = {
  list: async () => (await api.get('/addresses')).map(normalizeAddress),
  create: async (data) => (await api.post('/addresses', data)).data,
  update: async (id, data) => (await api.put(`/addresses/${id}`, data)).data,
  delete: (id) => api.delete(`/addresses/${id}`),
}

export const postalCodeApi = {
  lookup: async (cep) => {
    const cepDigits = normalizeCepDigits(cep)

    try {
      const backendAddress = await api.get(`/postal-code/${cep}`)

      if (cepDigits.length !== 8 || !requiresPostalCodeFallback(backendAddress)) {
        return backendAddress
      }

      const providerAddress = await lookupPostalCodeInPublicProviders(cepDigits)
      return providerAddress ? mergePostalCodeAddress(backendAddress, providerAddress) : backendAddress
    } catch (error) {
      if (cepDigits.length !== 8) {
        throw error
      }

      const providerAddress = await lookupPostalCodeInPublicProviders(cepDigits)
      if (providerAddress) {
        return providerAddress
      }

      throw error
    }
  },
}

export const shippingApi = {
  quote: async (payload, init) => {
    const response = await jsonRequest('/shipping/quote', 'POST', payload, init)

    return {
      ...response,
      subtotal: Number(response.subtotal ?? 0),
      shipping: Number(response.shipping ?? 0),
      total: Number(response.total ?? 0),
      estimatedDays: Number(response.estimatedDays ?? 0),
    }
  },
}
