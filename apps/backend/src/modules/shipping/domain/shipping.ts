import type { PostalCodeAddress } from '../../postal-code/domain/postal-code'

export interface ShippingItemQuote {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface ShippingQuote {
  destination: PostalCodeAddress
  items: ShippingItemQuote[]
  subtotal: number
  shipping: number
  total: number
  estimatedDays: number
}
