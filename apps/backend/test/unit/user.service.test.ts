import { describe, expect, it } from 'bun:test'
import { UserService } from '../../src/modules/user/application/user-service'
import {
  FakePasswordHasher,
  InMemoryUserRepository,
} from '../helpers/in-memory-dependencies'

describe('UserService', () => {
  it('hashes the password before persisting a user', async () => {
    const repository = new InMemoryUserRepository()
    const service = new UserService(repository, new FakePasswordHasher())

    const user = await service.create({
      name: 'Maria',
      email: 'MARIA@example.com',
      password: '12345678',
    })

    expect(user.email).toBe('maria@example.com')
    const stored = [...repository.items.values()][0]
    expect(stored.passwordHash).toBe('hashed:12345678')
  })

  it('rejects short passwords', async () => {
    const service = new UserService(new InMemoryUserRepository(), new FakePasswordHasher())

    await expect(
      service.create({
        name: 'Maria',
        email: 'maria@example.com',
        password: '123',
      })
    ).rejects.toThrow('A senha precisa ter entre 8 e 72 caracteres.')
  })
})
