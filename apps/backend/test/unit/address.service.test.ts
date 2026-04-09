import { describe, expect, it } from 'bun:test'
import { AddressService } from '../../src/modules/address/application/address-service'
import { InMemoryAddressRepository } from '../helpers/in-memory-dependencies'

describe('AddressService', () => {
  it('normalizes CEP on create', async () => {
    const service = new AddressService(new InMemoryAddressRepository())
    const userId = crypto.randomUUID()

    const address = await service.create(userId, {
      cep: '01001-000',
      street: 'Praca da Se',
      number: '100',
    })

    expect(address.cep).toBe('01001000')
  })

  it('rejects empty address updates', async () => {
    const service = new AddressService(new InMemoryAddressRepository())
    expect(() => service.update(crypto.randomUUID(), crypto.randomUUID(), {})).toThrow(
      'Nenhum campo valido foi enviado para atualizacao.'
    )
  })
})
