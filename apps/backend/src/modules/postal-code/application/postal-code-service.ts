import type { PostalCodeGateway } from './postal-code-gateway'
import type { PostalCodeAddress } from '../domain/postal-code'
import { isAppError } from '../../../shared/errors/app-error'
import { normalizeCep } from '../../../shared/utils/normalize'

const inferredStateByCepPrefix: Record<string, string> = {
  '0': 'SP',
  '1': 'SP',
  '2': 'RJ',
  '3': 'MG',
  '4': 'BA',
  '5': 'PE',
  '6': 'PA',
  '7': 'DF',
  '8': 'PR',
  '9': 'RS',
}

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
      state: inferredStateByCepPrefix[cep[0] ?? ''] ?? 'SP',
    }
  }
}
