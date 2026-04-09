import type { AddressRepository } from './address-repository'
import type { AddressInput, UpdateAddressInput } from '../domain/address'
import { badRequest } from '../../../shared/errors/error-factory'
import { ensureUuid, normalizeOptionalText, normalizeText } from '../../../shared/utils/normalize'

const normalizeCep = (value: string) => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 8) {
    throw badRequest('CEP invalido.')
  }

  return digits
}

export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  findByUserId(userId: string) {
    return this.addressRepository.findByUserId(ensureUuid(userId, 'Usuario'))
  }

  create(userId: string, input: AddressInput) {
    return this.addressRepository.create(ensureUuid(userId, 'Usuario'), {
      cep: normalizeCep(input.cep),
      street: normalizeText(input.street, { field: 'Rua', maxLength: 120 }),
      number: normalizeText(input.number, { field: 'Numero', maxLength: 20 }),
      complement: normalizeOptionalText(input.complement, {
        field: 'Complemento',
        maxLength: 120,
      }),
    })
  }

  update(id: string, userId: string, input: UpdateAddressInput) {
    const payload: UpdateAddressInput = {}

    if (input.cep !== undefined) payload.cep = normalizeCep(input.cep)
    if (input.street !== undefined) {
      payload.street = normalizeText(input.street, { field: 'Rua', maxLength: 120 })
    }
    if (input.number !== undefined) {
      payload.number = normalizeText(input.number, { field: 'Numero', maxLength: 20 })
    }
    if (input.complement !== undefined) {
      payload.complement = normalizeOptionalText(input.complement, {
        field: 'Complemento',
        maxLength: 120,
      })
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest('Nenhum campo valido foi enviado para atualizacao.')
    }

    return this.addressRepository.update(
      ensureUuid(id, 'Endereco'),
      ensureUuid(userId, 'Usuario'),
      payload
    )
  }

  delete(id: string, userId: string) {
    return this.addressRepository.delete(
      ensureUuid(id, 'Endereco'),
      ensureUuid(userId, 'Usuario')
    )
  }
}
