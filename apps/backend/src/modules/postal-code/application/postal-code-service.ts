import type { PostalCodeGateway } from './postal-code-gateway'
import type { PostalCodeAddress } from '../domain/postal-code'
import { isAppError } from '../../../shared/errors/app-error'
import { inferStateFromCep } from '../../../shared/utils/cep-state'
import { normalizeCep } from '../../../shared/utils/normalize'

const defaultFallbackState = (process.env.STORE_ORIGIN_STATE ?? 'SC').trim().toUpperCase()

export class PostalCodeService {
  constructor(private readonly postalCodeGateway: PostalCodeGateway) {}

  async lookup(cep: string) {
    const normalizedCep = normalizeCep(cep)

    try {
      return await this.postalCodeGateway.lookup(normalizedCep)
    } catch (error) {
      if (isAppError(error) && error.statusCode === 404) {
        throw error
      }

      return this.buildFallbackAddress(normalizedCep)
    }
  }

  private buildFallbackAddress(cep: string): PostalCodeAddress {
    return {
      cep,
      street: '',
      neighborhood: '',
      city: 'Nao informado',
      state: inferStateFromCep(cep, defaultFallbackState),
    }
  }
}
