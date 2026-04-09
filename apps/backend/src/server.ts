import { env } from './config/env'
import { createApiApp } from './app'
import { createLiveDependencies } from './bootstrap/create-live-dependencies'
import { authRoutes } from './routes/auth.routes'

const app = createApiApp(createLiveDependencies(), { authRoutes }).listen(env.port)

console.log(`API running at http://localhost:${env.port}`)
console.log(`Docs: http://localhost:${env.port}/docs`)

export type App = typeof app
