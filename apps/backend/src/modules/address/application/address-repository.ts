import type { Address, AddressInput, UpdateAddressInput } from '../domain/address'

export interface AddressRepository {
  findByUserId(userId: string): Promise<Address[]>
  create(userId: string, input: AddressInput): Promise<Address>
  update(id: string, userId: string, input: UpdateAddressInput): Promise<Address>
  delete(id: string, userId: string): Promise<void>
}
