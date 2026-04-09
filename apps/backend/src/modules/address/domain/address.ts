export interface Address {
  id: string
  cep: string
  street: string
  number: string
  complement: string | null
}

export interface AddressInput {
  cep: string
  street: string
  number: string
  complement?: string
}

export interface UpdateAddressInput {
  cep?: string
  street?: string
  number?: string
  complement?: string
}
