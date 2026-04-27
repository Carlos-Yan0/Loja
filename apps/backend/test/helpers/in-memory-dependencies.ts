import { createApiApp } from '../../src/app'
import type { AppControllers } from '../../src/bootstrap/create-live-dependencies'
import type { AnyElysia } from 'elysia'
import type { AddressRepository } from '../../src/modules/address/application/address-repository'
import { AddressService } from '../../src/modules/address/application/address-service'
import { AddressController } from '../../src/modules/address/presentation/address-controller'
import type { Address, AddressInput, UpdateAddressInput } from '../../src/modules/address/domain/address'
import type { OrderRepository } from '../../src/modules/order/application/order-repository'
import { OrderService } from '../../src/modules/order/application/order-service'
import { OrderController } from '../../src/modules/order/presentation/order-controller'
import type {
  CreateOrderInput,
  CreateOrderResult,
  Order,
  OrderStatus,
  PaymentMethod,
} from '../../src/modules/order/domain/order'
import type {
  CreatePaymentTransactionInput,
  CreatePaymentWebhookEventInput,
  PaymentRepository,
  UpdatePaymentTransactionInput,
} from '../../src/modules/payment/application/payment-repository'
import type {
  CreateProviderCheckoutInput,
  PaymentProviderGateway,
} from '../../src/modules/payment/application/payment-provider-gateway'
import { PaymentService } from '../../src/modules/payment/application/payment-service'
import { PaymentController } from '../../src/modules/payment/presentation/payment-controller'
import type {
  PaymentStatus,
  PaymentTransaction,
  PaymentWebhookEvent,
  ProviderPaymentDetails,
} from '../../src/modules/payment/domain/payment'
import type { PostalCodeGateway } from '../../src/modules/postal-code/application/postal-code-gateway'
import { PostalCodeService } from '../../src/modules/postal-code/application/postal-code-service'
import { PostalCodeController } from '../../src/modules/postal-code/presentation/postal-code-controller'
import type { ProductRepository } from '../../src/modules/product/application/product-repository'
import { ProductService } from '../../src/modules/product/application/product-service'
import { ProductController } from '../../src/modules/product/presentation/product-controller'
import type {
  CreateProductInput,
  Product,
  ProductFilters,
  UpdateProductInput,
} from '../../src/modules/product/domain/product'
import { ShippingService } from '../../src/modules/shipping/application/shipping-service'
import { ShippingController } from '../../src/modules/shipping/presentation/shipping-controller'
import type { PasswordHasher } from '../../src/modules/user/application/password-hasher'
import type { UserRepository } from '../../src/modules/user/application/user-repository'
import { UserService } from '../../src/modules/user/application/user-service'
import { UserController } from '../../src/modules/user/presentation/user-controller'
import type { CreateUserInput, UpdateUserInput, User, UserRole } from '../../src/modules/user/domain/user'
import type { StorageGateway, StorageUploadInput } from '../../src/modules/upload/application/storage-gateway'
import { UploadProductImageService } from '../../src/modules/upload/application/upload-product-image-service'
import { UploadBannerImageService } from '../../src/modules/upload/application/upload-banner-image-service'
import { UploadController } from '../../src/modules/upload/presentation/upload-controller'
import { badRequest } from '../../src/shared/errors/error-factory'
import type { MenuConfigRepository } from '../../src/modules/menu/application/menu-config-repository'
import { MenuService } from '../../src/modules/menu/application/menu-service'
import { MenuController } from '../../src/modules/menu/presentation/menu-controller'
import type { MenuConfig } from '../../src/modules/menu/domain/menu'

export class InMemoryProductRepository implements ProductRepository {
  public readonly items = new Map<string, Product>()
  private orderRepository?: InMemoryOrderRepository

  linkOrderRepository(orderRepository: InMemoryOrderRepository) {
    this.orderRepository = orderRepository
  }

  async create(input: CreateProductInput) {
    const product: Product = {
      id: crypto.randomUUID(),
      name: input.name,
      price: input.price,
      category: input.category,
      tags: input.tags ?? [],
      stock: input.stock,
      images: input.images ?? [],
    }

    this.items.set(product.id, product)
    return structuredClone(product)
  }

  async findAll(filters?: ProductFilters) {
    const search = filters?.search?.toLowerCase()
    const category = filters?.category?.toLowerCase()
    const tag = filters?.tag?.toLowerCase()
    const matchesFilters = (item: Product) => {
      if (search) {
        const tagString = item.tags.join(' ').toLowerCase()
        const searchable = `${item.name} ${item.category} ${tagString}`.toLowerCase()
        if (!searchable.includes(search)) return false
      }

      if (category && !item.category.toLowerCase().includes(category)) {
        return false
      }

      if (tag && !item.tags.some((entry) => entry.toLowerCase().includes(tag))) {
        return false
      }

      return true
    }

    if (filters?.sort === 'BESTSELLERS') {
      const confirmedStatuses = new Set<OrderStatus>(['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'])
      const soldQuantityByProductId = new Map<string, number>()

      for (const order of this.orderRepository?.items.values() ?? []) {
        if (!confirmedStatuses.has(order.status)) continue

        for (const item of order.items) {
          soldQuantityByProductId.set(
            item.productId,
            (soldQuantityByProductId.get(item.productId) ?? 0) + item.quantity
          )
        }
      }

      return [...this.items.values()]
        .filter((item) => (soldQuantityByProductId.get(item.id) ?? 0) > 0)
        .filter(matchesFilters)
        .map((item) => ({
          ...item,
          soldQuantity: soldQuantityByProductId.get(item.id) ?? 0,
        }))
        .sort((left, right) => {
          const quantityDiff = (right.soldQuantity ?? 0) - (left.soldQuantity ?? 0)
          if (quantityDiff !== 0) return quantityDiff
          return String(left.name ?? '').localeCompare(String(right.name ?? ''), 'pt-BR')
        })
        .map((item) => structuredClone(item))
    }

    return [...this.items.values()]
      .filter(matchesFilters)
      .sort((left, right) =>
        String(left.name ?? '').localeCompare(String(right.name ?? ''), 'pt-BR')
      )
      .map((item) => structuredClone(item))
  }

  async findById(id: string) {
    const product = this.items.get(id)
    return product ? structuredClone(product) : null
  }

  async findByIds(ids: string[]) {
    return ids
      .map((id) => this.items.get(id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => structuredClone(product))
  }

  async update(id: string, input: UpdateProductInput) {
    const current = this.items.get(id)
    if (!current) throw new Error('product not found')

    const updated: Product = {
      ...current,
      ...input,
      tags: input.tags ?? current.tags,
      images: input.images ?? current.images,
    }

    this.items.set(id, updated)
    return structuredClone(updated)
  }

  async delete(id: string) {
    this.items.delete(id)
  }

  async appendImage(productId: string, imageUrl: string) {
    const current = this.items.get(productId)
    if (!current) throw new Error('product not found')

    const updated = {
      ...current,
      images: current.images.includes(imageUrl) ? current.images : [...current.images, imageUrl],
    }

    this.items.set(productId, updated)
    return structuredClone(updated)
  }
}

export class InMemoryMenuConfigRepository implements MenuConfigRepository {
  private config: MenuConfig = {
    categories: ['Feminino', 'Masculino', 'Oversized'],
    tags: ['Lancamento'],
    homeBanner: {
      enabled: false,
      imageUrl: '',
      ctaEnabled: true,
      ctaTransparent: false,
      ctaLabel: 'Explorar agora',
      targetType: 'BESTSELLERS',
      targetValue: '',
    },
    homeSections: [],
  }

  get() {
    return Promise.resolve(structuredClone(this.config))
  }

  save(config: MenuConfig) {
    this.config = {
      categories: [...config.categories],
      tags: [...config.tags],
      homeBanner: { ...config.homeBanner },
      homeSections: config.homeSections.map((section) => ({ ...section })),
    }

    return Promise.resolve(structuredClone(this.config))
  }
}

export class InMemoryUserRepository implements UserRepository {
  public readonly items = new Map<string, User & { passwordHash: string }>()

  async create(input: CreateUserInput & { password: string }) {
    for (const user of this.items.values()) {
      if (user.email === input.email) {
        const error = new Error('duplicate email') as Error & { code?: string }
        error.code = 'P2002'
        throw error
      }
    }

    const user = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      role: 'CUSTOMER' as UserRole,
      phone: input.phone ?? null,
      passwordHash: input.password,
    }

    this.items.set(user.id, user)
    return this.toPublic(user)
  }

  async findAll(search?: string) {
    const term = search?.toLowerCase()

    return [...this.items.values()]
      .filter((user) => (term ? user.name.toLowerCase().includes(term) : true))
      .map((user) => this.toPublic(user))
  }

  async findById(id: string) {
    const user = this.items.get(id)
    return user ? this.toPublic(user) : null
  }

  async findAuthByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const user = [...this.items.values()].find((entry) => entry.email === normalizedEmail)

    return user
      ? {
          id: user.id,
          role: user.role,
          passwordHash: user.passwordHash,
        }
      : null
  }

  async update(id: string, input: UpdateUserInput & { password?: string }) {
    const current = this.items.get(id)
    if (!current) throw new Error('user not found')

    if (input.email) {
      for (const [userId, user] of this.items.entries()) {
        if (userId !== id && user.email === input.email) {
          const error = new Error('duplicate email') as Error & { code?: string }
          error.code = 'P2002'
          throw error
        }
      }
    }

    const updated = {
      ...current,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone ?? null }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.password !== undefined && { passwordHash: input.password }),
    }

    this.items.set(id, updated)
    return this.toPublic(updated)
  }

  async delete(id: string) {
    this.items.delete(id)
  }

  private toPublic(user: User & { passwordHash: string }): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    }
  }
}

export class InMemoryAddressRepository implements AddressRepository {
  public readonly items = new Map<string, Address & { userId: string }>()

  async findByUserId(userId: string) {
    return [...this.items.values()]
      .filter((address) => address.userId === userId)
      .map(({ userId: _userId, ...address }) => structuredClone(address))
  }

  async create(userId: string, input: AddressInput) {
    const address = {
      id: crypto.randomUUID(),
      cep: input.cep,
      street: input.street,
      number: input.number,
      complement: input.complement ?? null,
      userId,
    }

    this.items.set(address.id, address)
    const { userId: _userId, ...publicAddress } = address
    return structuredClone(publicAddress)
  }

  async update(id: string, userId: string, input: UpdateAddressInput) {
    const current = this.items.get(id)
    if (!current || current.userId !== userId) throw new Error('address not found')

    const updated = {
      ...current,
      ...(input.cep !== undefined && { cep: input.cep }),
      ...(input.street !== undefined && { street: input.street }),
      ...(input.number !== undefined && { number: input.number }),
      ...(input.complement !== undefined && { complement: input.complement ?? null }),
    }

    this.items.set(id, updated)
    const { userId: _userId, ...publicAddress } = updated
    return structuredClone(publicAddress)
  }

  async delete(id: string, userId: string) {
    const current = this.items.get(id)
    if (!current || current.userId !== userId) throw new Error('address not found')
    this.items.delete(id)
  }
}

export class InMemoryPostalCodeGateway implements PostalCodeGateway {
  lookup(cep: string) {
    return Promise.resolve({
      cep,
      street: 'Praca da Se',
      neighborhood: 'Se',
      city: 'Sao Paulo',
      state: 'SP',
    })
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  public readonly items = new Map<string, Order>()
  constructor(private readonly userRepository: InMemoryUserRepository, private readonly productRepository: InMemoryProductRepository) {}

  async create(input: {
    userId: string
    payMethod: PaymentMethod
    items: { productId: string; quantity: number; price: number }[]
    shipping: number
    total: number
  }) {
    const now = new Date().toISOString()
    const user = await this.userRepository.findById(input.userId)

    const order: Order = {
      id: crypto.randomUUID(),
      status: 'AWAITING_PAYMENT',
      total: input.total,
      shipping: input.shipping,
      payMethod: input.payMethod,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
      user: user ?? undefined,
      items: await Promise.all(
        input.items.map(async (item) => {
          const product = await this.productRepository.findById(item.productId)
          return {
            id: crypto.randomUUID(),
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            product: product
              ? { id: product.id, name: product.name, images: product.images }
              : undefined,
          }
        })
      ),
    }

    this.items.set(order.id, order)
    return structuredClone(order)
  }

  async findAll() {
    return [...this.items.values()].map((order) => structuredClone(order))
  }

  async findById(id: string) {
    const order = this.items.get(id)
    return order ? structuredClone(order) : null
  }

  async findByUserId(userId: string) {
    return [...this.items.values()]
      .filter((order) => order.userId === userId)
      .map((order) => structuredClone(order))
  }

  async updateStatus(id: string, status: OrderStatus) {
    const current = this.items.get(id)
    if (!current) throw new Error('order not found')

    const updated: Order = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    }

    this.items.set(id, updated)
    return structuredClone(updated)
  }

  async updatePayMethod(id: string, payMethod: PaymentMethod) {
    const current = this.items.get(id)
    if (!current) throw new Error('order not found')

    const updated: Order = {
      ...current,
      payMethod,
      updatedAt: new Date().toISOString(),
    }

    this.items.set(id, updated)
    return structuredClone(updated)
  }

  async confirmPayment(id: string) {
    const current = this.items.get(id)
    if (!current) throw new Error('order not found')

    if (current.status === 'PROCESSING') {
      return structuredClone(current)
    }

    if (current.status !== 'AWAITING_PAYMENT') {
      return structuredClone(current)
    }

    for (const item of current.items) {
      const product = await this.productRepository.findById(item.productId)
      if (!product || product.stock < item.quantity) {
        throw badRequest('Estoque insuficiente para confirmar o pagamento deste pedido.')
      }
    }

    for (const item of current.items) {
      const product = await this.productRepository.findById(item.productId)
      if (!product) {
        throw badRequest('Produto indisponivel para confirmar o pagamento.')
      }

      await this.productRepository.update(product.id, {
        stock: product.stock - item.quantity,
      })
    }

    const updated: Order = {
      ...current,
      status: 'PROCESSING',
      updatedAt: new Date().toISOString(),
    }

    this.items.set(id, updated)
    return structuredClone(updated)
  }
}

export class InMemoryPaymentRepository implements PaymentRepository {
  public readonly transactions = new Map<string, PaymentTransaction>()
  public readonly webhookEvents = new Map<string, PaymentWebhookEvent>()

  async createTransaction(input: CreatePaymentTransactionInput) {
    const now = new Date().toISOString()
    const transaction: PaymentTransaction = {
      id: crypto.randomUUID(),
      provider: input.provider,
      status: input.status ?? 'PENDING',
      orderId: input.orderId,
      amount: Number(input.amount.toFixed(2)),
      currency: input.currency,
      externalId: input.externalId ?? null,
      externalReference: input.externalReference,
      checkoutUrl: input.checkoutUrl ?? null,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    }

    this.transactions.set(transaction.id, transaction)
    return structuredClone(transaction)
  }

  async findTransactionById(id: string) {
    const transaction = this.transactions.get(id)
    return transaction ? structuredClone(transaction) : null
  }

  async findLatestTransactionByOrderId(orderId: string) {
    const transactions = [...this.transactions.values()]
      .filter((transaction) => transaction.orderId === orderId)
      .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))

    return transactions[0] ? structuredClone(transactions[0]) : null
  }

  async findTransactionByExternalId(provider: PaymentTransaction['provider'], externalId: string) {
    const transactions = [...this.transactions.values()]
      .filter(
        (transaction) => transaction.provider === provider && transaction.externalId === externalId
      )
      .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))

    return transactions[0] ? structuredClone(transactions[0]) : null
  }

  async updateTransaction(id: string, input: UpdatePaymentTransactionInput) {
    const current = this.transactions.get(id)
    if (!current) throw new Error('payment transaction not found')

    const updated: PaymentTransaction = {
      ...current,
      ...(input.status !== undefined && { status: input.status }),
      ...(input.externalId !== undefined && { externalId: input.externalId }),
      ...(input.checkoutUrl !== undefined && { checkoutUrl: input.checkoutUrl }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      updatedAt: new Date().toISOString(),
    }

    this.transactions.set(id, updated)
    return structuredClone(updated)
  }

  async createWebhookEvent(input: CreatePaymentWebhookEventInput) {
    const key = `${input.provider}:${input.eventId}`
    if (this.webhookEvents.has(key)) {
      return null
    }

    const event: PaymentWebhookEvent = {
      id: crypto.randomUUID(),
      provider: input.provider,
      eventType: input.eventType,
      eventId: input.eventId,
      signatureValid: input.signatureValid,
      payload: input.payload,
      transactionId: input.transactionId ?? null,
      createdAt: new Date().toISOString(),
    }

    this.webhookEvents.set(key, event)
    return structuredClone(event)
  }
}

export class InMemoryPaymentGateway implements PaymentProviderGateway {
  readonly providerName = 'MOCK' as const
  private readonly payments = new Map<
    string,
    {
      externalReference: string
      amount: number
      currency: string
      status: PaymentStatus
      paymentMethod: PaymentMethod
    }
  >()

  async createCheckout(input: CreateProviderCheckoutInput) {
    const externalId = `mock_${crypto.randomUUID()}`
    this.payments.set(externalId, {
      externalReference: input.externalReference,
      amount: Number(input.amount.toFixed(2)),
      currency: input.currency,
      status: 'PENDING',
      paymentMethod: input.paymentMethod,
    })

    return {
      externalId,
      checkoutUrl: `https://mock.local/checkout/${externalId}`,
      status: 'PENDING',
      payload: {
        provider: 'mock',
      },
    }
  }

  async getPayment(externalId: string): Promise<ProviderPaymentDetails> {
    const payment = this.payments.get(externalId)
    if (!payment) {
      return {
        externalId,
        externalReference: null,
        status: 'REJECTED',
        amount: null,
        currency: null,
        payload: {
          provider: 'mock',
          found: false,
        },
      }
    }

    if (payment.status === 'PENDING') {
      payment.status = 'APPROVED'
      this.payments.set(externalId, payment)
    }

    return {
      externalId,
      externalReference: payment.externalReference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      payload: {
        provider: 'mock',
        status: payment.status,
      },
    }
  }

  async getPaymentByExternalReference(externalReference: string): Promise<ProviderPaymentDetails | null> {
    const foundEntry = [...this.payments.entries()].find(
      ([, payment]) => payment.externalReference === externalReference
    )
    if (!foundEntry) return null

    const [externalId, payment] = foundEntry
    const normalizedPayment =
      payment.status === 'PENDING'
        ? {
            ...payment,
            status: 'APPROVED' as PaymentStatus,
          }
        : payment

    this.payments.set(externalId, normalizedPayment)

    return {
      externalId,
      externalReference: normalizedPayment.externalReference,
      status: normalizedPayment.status,
      amount: normalizedPayment.amount,
      currency: normalizedPayment.currency,
      paymentMethod: normalizedPayment.paymentMethod,
      payload: {
        provider: 'mock',
        status: normalizedPayment.status,
        recoveredBy: 'external_reference',
      },
    }
  }

  setPaymentMethod(externalId: string, paymentMethod: PaymentMethod) {
    const payment = this.payments.get(externalId)
    if (!payment) return

    this.payments.set(externalId, {
      ...payment,
      paymentMethod,
    })
  }
}

export class FakePasswordHasher implements PasswordHasher {
  hash(value: string) {
    return Promise.resolve(`hashed:${value}`)
  }
}

export class InMemoryStorageGateway implements StorageGateway {
  public readonly uploadedPaths: string[] = []
  public readonly deletedPaths: string[] = []

  async uploadPublicObject(input: StorageUploadInput) {
    this.uploadedPaths.push(input.path)
    return {
      path: input.path,
      publicUrl: `https://cdn.test/${input.bucket}/${input.path}`,
    }
  }

  async deleteObject(bucket: string, path: string) {
    this.deletedPaths.push(`${bucket}/${path}`)
  }
}

export interface InMemoryDependencies {
  controllers: AppControllers
  productRepository: InMemoryProductRepository
  menuConfigRepository: InMemoryMenuConfigRepository
  userRepository: InMemoryUserRepository
  addressRepository: InMemoryAddressRepository
  orderRepository: InMemoryOrderRepository
  paymentRepository: InMemoryPaymentRepository
  paymentGateway: InMemoryPaymentGateway
  storageGateway: InMemoryStorageGateway
  postalCodeGateway: InMemoryPostalCodeGateway
}

export const createInMemoryDependencies = (): InMemoryDependencies => {
  const productRepository = new InMemoryProductRepository()
  const userRepository = new InMemoryUserRepository()
  const addressRepository = new InMemoryAddressRepository()
  const postalCodeGateway = new InMemoryPostalCodeGateway()
  const orderRepository = new InMemoryOrderRepository(userRepository, productRepository)
  productRepository.linkOrderRepository(orderRepository)
  const paymentRepository = new InMemoryPaymentRepository()
  const paymentGateway = new InMemoryPaymentGateway()
  const passwordHasher = new FakePasswordHasher()
  const storageGateway = new InMemoryStorageGateway()
  const menuConfigRepository = new InMemoryMenuConfigRepository()

  const productService = new ProductService(productRepository)
  const menuService = new MenuService(menuConfigRepository, productRepository)
  const postalCodeService = new PostalCodeService(postalCodeGateway)
  const shippingService = new ShippingService(postalCodeService, productRepository)
  const userService = new UserService(userRepository, passwordHasher)
  const addressService = new AddressService(addressRepository)
  const orderService = new OrderService(orderRepository, shippingService, {
    customerCancelWindowHours: 8,
  })
  const paymentService = new PaymentService(paymentRepository, orderRepository, paymentGateway, {
    currency: 'BRL',
    webhookToken: 'test-webhook-token',
  })
  const uploadProductImageService = new UploadProductImageService(productService, storageGateway)
  const uploadBannerImageService = new UploadBannerImageService(storageGateway)

  return {
    controllers: {
      productController: new ProductController(productService),
      menuController: new MenuController(menuService),
      userController: new UserController(userService),
      orderController: new OrderController(orderService),
      paymentController: new PaymentController(paymentService),
      addressController: new AddressController(addressService),
      uploadController: new UploadController(uploadProductImageService, uploadBannerImageService),
      postalCodeController: new PostalCodeController(postalCodeService),
      shippingController: new ShippingController(shippingService),
    },
    productRepository,
    menuConfigRepository,
    userRepository,
    addressRepository,
    orderRepository,
    paymentRepository,
    paymentGateway,
    storageGateway,
    postalCodeGateway,
  }
}

export const createTestApp = (options: { authRoutes?: AnyElysia } = {}) => {
  const dependencies = createInMemoryDependencies()
  const app = createApiApp(dependencies.controllers, options)

  return { app, ...dependencies }
}
