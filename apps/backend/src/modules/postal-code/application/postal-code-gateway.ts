import type { PostalCodeAddress } from '../domain/postal-code'

export interface PostalCodeGateway {
  lookup(cep: string): Promise<PostalCodeAddress>
}
