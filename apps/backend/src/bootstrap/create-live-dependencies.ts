import { getPrismaClient } from '../libs/prisma'
import { PrismaAddressRepository } from '../modules/address/infrastructure/prisma-address-repository'
import { AddressService } from '../modules/address/application/address-service'
import { AddressController } from '../modules/address/presentation/address-controller'
import { PrismaOrderRepository } from '../modules/order/infrastructure/prisma-order-repository'
import { OrderService } from '../modules/order/application/order-service'
import { OrderController } from '../modules/order/presentation/order-controller'
import { PaymentService } from '../modules/payment/application/payment-service'
import { MercadoPagoGateway } from '../modules/payment/infrastructure/mercado-pago-gateway'
import { MockPaymentGateway } from '../modules/payment/infrastructure/mock-payment-gateway'
import { PrismaPaymentRepository } from '../modules/payment/infrastructure/prisma-payment-repository'
import { PaymentController } from '../modules/payment/presentation/payment-controller'
import { ViaCepGateway } from '../modules/postal-code/infrastructure/via-cep-gateway'
import { PostalCodeService } from '../modules/postal-code/application/postal-code-service'
import { PostalCodeController } from '../modules/postal-code/presentation/postal-code-controller'
import { PrismaProductRepository } from '../modules/product/infrastructure/prisma-product-repository'
import { ProductService } from '../modules/product/application/product-service'
import { ProductController } from '../modules/product/presentation/product-controller'
import { ShippingService } from '../modules/shipping/application/shipping-service'
import { ShippingController } from '../modules/shipping/presentation/shipping-controller'
import { BunPasswordHasher } from '../modules/user/infrastructure/bun-password-hasher'
import { PrismaUserRepository } from '../modules/user/infrastructure/prisma-user-repository'
import { UserService } from '../modules/user/application/user-service'
import { UserController } from '../modules/user/presentation/user-controller'
import { SupabaseStorageGateway } from '../modules/upload/infrastructure/supabase-storage-gateway'
import { LocalStorageGateway } from '../modules/upload/infrastructure/local-storage-gateway'
import { UploadProductImageService } from '../modules/upload/application/upload-product-image-service'
import { UploadBannerImageService } from '../modules/upload/application/upload-banner-image-service'
import { UploadController } from '../modules/upload/presentation/upload-controller'
import { env, hasSupabaseStorageConfig, shouldUseMockPaymentProvider } from '../config/env'
import { FileMenuConfigRepository } from '../modules/menu/infrastructure/file-menu-config-repository'
import { MenuService } from '../modules/menu/application/menu-service'
import { MenuController } from '../modules/menu/presentation/menu-controller'

export interface AppControllers {
  productController: ProductController
  menuController: MenuController
  userController: UserController
  orderController: OrderController
  paymentController: PaymentController
  addressController: AddressController
  uploadController: UploadController
  postalCodeController: PostalCodeController
  shippingController: ShippingController
}

export const createLiveDependencies = (): AppControllers => {
  const prisma = getPrismaClient()

  const productRepository = new PrismaProductRepository(prisma)
  const userRepository = new PrismaUserRepository(prisma)
  const addressRepository = new PrismaAddressRepository(prisma)
  const orderRepository = new PrismaOrderRepository(prisma)
  const paymentRepository = new PrismaPaymentRepository(prisma)
  const passwordHasher = new BunPasswordHasher()
  const storageGateway = hasSupabaseStorageConfig()
    ? new SupabaseStorageGateway()
    : new LocalStorageGateway({ publicBaseUrl: env.backendPublicUrl })
  const postalCodeGateway = new ViaCepGateway()
  const menuConfigRepository = new FileMenuConfigRepository()
  const paymentGateway = shouldUseMockPaymentProvider()
    ? new MockPaymentGateway()
    : new MercadoPagoGateway()

  const productService = new ProductService(productRepository)
  const menuService = new MenuService(menuConfigRepository, productRepository)
  const postalCodeService = new PostalCodeService(postalCodeGateway)
  const shippingService = new ShippingService(postalCodeService, productRepository)
  const userService = new UserService(userRepository, passwordHasher)
  const addressService = new AddressService(addressRepository)
  const orderService = new OrderService(orderRepository, shippingService, {
    customerCancelWindowHours: env.order.customerCancelWindowHours,
  })
  const paymentService = new PaymentService(
    paymentRepository,
    orderRepository,
    paymentGateway,
    {
      currency: env.payment.currency,
      webhookToken: env.payment.webhookToken,
    }
  )
  const uploadProductImageService = new UploadProductImageService(productService, storageGateway)
  const uploadBannerImageService = new UploadBannerImageService(storageGateway)

  return {
    productController: new ProductController(productService),
    menuController: new MenuController(menuService),
    userController: new UserController(userService),
    orderController: new OrderController(orderService),
    paymentController: new PaymentController(paymentService),
    addressController: new AddressController(addressService),
    uploadController: new UploadController(uploadProductImageService, uploadBannerImageService),
    postalCodeController: new PostalCodeController(postalCodeService),
    shippingController: new ShippingController(shippingService),
  }
}
