export interface PasswordHasher {
  hash(value: string): Promise<string>
}
