import { Elysia, type AnyElysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { env } from './config/env'
import { securityPlugin } from './bootstrap/security'
import { createAddressRoutes } from './routes/address.routes'
import { createMenuRoutes } from './routes/menu.routes'
import { createOrderRoutes } from './routes/order.routes'
import { createPaymentRoutes } from './routes/payment.routes'
import { createPostalCodeRoutes } from './routes/postal-code.routes'
import { createProductRoutes } from './routes/product.routes'
import { createShippingRoutes } from './routes/shipping.routes'
import { createUploadRoutes } from './routes/upload.route'
import { createUserRoutes } from './routes/user.routes'
import type { AppControllers } from './bootstrap/create-live-dependencies'
import { isAppError } from './shared/errors/app-error'
import { isDatabaseAuthError, isDatabaseUnavailableError } from './libs/prisma'
import { resolveLocalUploadFilePath } from './modules/upload/infrastructure/local-storage-gateway'

interface CreateApiAppOptions {
  authRoutes?: AnyElysia
}

export const createApiApp = (
  controllers: AppControllers,
  options: CreateApiAppOptions = {}
) =>
  new Elysia()
    .use(securityPlugin)
    .use(
      cors({
        origin: env.frontendUrl,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      })
    )
    .use(
      swagger({
        path: '/docs',
        documentation: {
          info: { title: 'API Loja', version: '1.0.0' },
        },
      })
    )
    .onError(({ error, set, code }) => {
      if (isAppError(error)) {
        set.status = error.statusCode
        return {
          message: error.message,
          code: error.code,
          details: error.details,
        }
      }

      if (code === 'VALIDATION') {
        set.status = 400
        return {
          message: 'Falha de validacao na requisicao.',
          code: 'VALIDATION_ERROR',
        }
      }

      if (isDatabaseAuthError(error)) {
        set.status = 503
        return {
          message:
            'Falha ao autenticar no PostgreSQL. Revise o DATABASE_URL do backend para usar o usuario e a senha reais da sua instancia local.',
          code: 'DATABASE_AUTH_ERROR',
        }
      }

      if (isDatabaseUnavailableError(error)) {
        set.status = 503
        return {
          message:
            'Nao foi possivel conectar ao PostgreSQL. Confirme se o servico local esta ativo e se o DATABASE_URL aponta para a instancia correta.',
          code: 'DATABASE_UNAVAILABLE',
        }
      }

      const message = error instanceof Error ? error.message : 'Erro interno'
      console.error('[backend:error]', message)
      set.status = 500

      return {
        message: 'Erro interno do servidor.',
        code: 'INTERNAL_SERVER_ERROR',
      }
    })
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
    .get('/uploads/*', ({ params, set }) => {
      const wildcardPath = (params as Record<string, string | undefined>)['*']
      if (!wildcardPath) {
        set.status = 404
        return { message: 'Arquivo nao encontrado.' }
      }

      const absolutePath = resolveLocalUploadFilePath(wildcardPath)
      if (!absolutePath) {
        set.status = 404
        return { message: 'Arquivo nao encontrado.' }
      }

      set.headers['cache-control'] = 'public, max-age=3600'
      return Bun.file(absolutePath)
    })
    .use(options.authRoutes ?? new Elysia())
    .use(createMenuRoutes(controllers.menuController))
    .use(createUserRoutes(controllers.userController))
    .use(createProductRoutes(controllers.productController))
    .use(createOrderRoutes(controllers.orderController))
    .use(createPaymentRoutes(controllers.paymentController))
    .use(createAddressRoutes(controllers.addressController))
    .use(createUploadRoutes(controllers.uploadController))
    .use(createPostalCodeRoutes(controllers.postalCodeController))
    .use(createShippingRoutes(controllers.shippingController))
