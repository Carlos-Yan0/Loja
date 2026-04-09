import type { PasswordHasher } from '../application/password-hasher'

export class BunPasswordHasher implements PasswordHasher {
  hash(value: string) {
    return Bun.password.hash(value)
  }
}
