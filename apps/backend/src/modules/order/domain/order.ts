import type { PostalCodeAddress } from '../../postal-code/domain/postal-code'

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'PROCESSING'
  | 'CANCELED'
  | 'DELIVERED'
  | 'IN_TRANSIT'
export type OrderPaymentProvider = 'MERCADO_PAGO' | 'MOCK'
export type OrderPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED'
  | 'EXPIRED'
  | 'REFUNDED'

export interface OrderItemInput {
  productId: string
  quantity: number
}

export interface DeliveryAddressInput {
  cep: string
  number: string
  complement?: string
}

export interface OrderCustomer {
  id: string
  name: string
  email: string
}

export interface OrderProductSummary {
  id: string
  name: string
  images: string[]
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product?: OrderProductSummary
}

export interface OrderPaymentSummary {
  provider: OrderPaymentProvider
  status: OrderPaymentStatus
  checkoutUrl: string | null
  externalId: string | null
  updatedAt: string
}

export interface Order {
  id: string
  status: OrderStatus
  total: number
  shipping: number
  payMethod: PaymentMethod
  userId: string
  createdAt: string
  updatedAt: string
  payment?: OrderPaymentSummary | null
  user?: OrderCustomer
  items: OrderItem[]
}

export interface OrderReceipt {
  issuedAt: string
  orderNumber: string
  customerName: string
  paymentMethod: PaymentMethod
  deliveryAddress: PostalCodeAddress & {
    number: string
    complement: string | null
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  shipping: number
  total: number
}

export interface CreateOrderInput {
  userId: string
  payMethod: PaymentMethod
  items: OrderItemInput[]
  deliveryAddress: DeliveryAddressInput
}

export interface CreateOrderResult {
  order: Order
  receipt: OrderReceipt
}
