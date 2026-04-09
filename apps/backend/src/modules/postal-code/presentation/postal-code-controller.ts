import type { PostalCodeService } from '../application/postal-code-service'

export class PostalCodeController {
  constructor(private readonly postalCodeService: PostalCodeService) {}

  lookup(cep: string) {
    return this.postalCodeService.lookup(cep)
  }
}
