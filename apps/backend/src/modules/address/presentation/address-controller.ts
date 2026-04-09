import type { AddressService } from '../application/address-service'
import type { AddressInput, UpdateAddressInput } from '../domain/address'

export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  list(userId: string) {
    return this.addressService.findByUserId(userId)
  }

  create(userId: string, input: AddressInput) {
    return this.addressService.create(userId, input)
  }

  update(id: string, userId: string, input: UpdateAddressInput) {
    return this.addressService.update(id, userId, input)
  }

  delete(id: string, userId: string) {
    return this.addressService.delete(id, userId)
  }
}
