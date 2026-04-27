import type { PostalCodeService } from '../../postal-code/application/postal-code-service'
import type { PostalCodeAddress } from '../../postal-code/domain/postal-code'
import type { ProductRepository } from '../../product/application/product-repository'
import type { ShippingQuote } from '../domain/shipping'
import { badRequest, notFound } from '../../../shared/errors/error-factory'
import { isAppError } from '../../../shared/errors/app-error'
import { inferStateFromCep } from '../../../shared/utils/cep-state'
import { ensureUuid, normalizeCep } from '../../../shared/utils/normalize'

const storeState = (process.env.STORE_ORIGIN_STATE ?? 'SC').trim().toUpperCase()
const storeCity = (process.env.STORE_ORIGIN_CITY ?? 'JOINVILLE').trim().toUpperCase()
const southStates = new Set(['PR', 'SC', 'RS'])
const southeastStates = new Set(['SP', 'RJ', 'MG', 'ES'])
const midwestStates = new Set(['GO', 'DF', 'MT', 'MS'])
const northeastStates = new Set(['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'])
const northStates = new Set(['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'])

export class ShippingService {
  constructor(
    private readonly postalCodeService: PostalCodeService,
    private readonly productRepository: ProductRepository
  ) {}

  async quote(input: { cep: string; items: { productId: string; quantity: number }[] }): Promise<ShippingQuote> {
    const cep = normalizeCep(input.cep)

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw badRequest('Informe ao menos um item para calcular o frete.')
    }

    const quantitiesByProductId = new Map<string, number>()

    for (const item of input.items) {
      const productId = ensureUuid(item.productId, 'Produto')

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw badRequest('Quantidade invalida para calculo de frete.')
      }

      quantitiesByProductId.set(productId, (quantitiesByProductId.get(productId) ?? 0) + item.quantity)
    }

    const products = await this.productRepository.findByIds([...quantitiesByProductId.keys()])
    if (products.length !== quantitiesByProductId.size) {
      throw notFound('Um ou mais produtos nao foram encontrados.')
    }

    const destination = await this.resolveDestination(cep)

    const items = products.map((product) => {
      const quantity = quantitiesByProductId.get(product.id) ?? 0

      if (quantity > product.stock) {
        throw badRequest(`Estoque insuficiente para o produto ${product.name}.`)
      }

      return {
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        subtotal: Number((product.price * quantity).toFixed(2)),
      }
    })

    const subtotal = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2))
    const shipping = this.calculateShipping({
      city: destination.city,
      state: destination.state,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    })

    return {
      destination,
      items,
      subtotal,
      shipping,
      total: Number((subtotal + shipping).toFixed(2)),
      estimatedDays: this.estimateDeliveryDays({
        city: destination.city,
        state: destination.state,
      }),
    }
  }

  private calculateShipping(input: {
    city: string
    state: string
    itemCount: number
    subtotal: number
  }) {
    const city = input.city.trim().toUpperCase()
    const state = input.state.toUpperCase()
    const itemWeightFactor = Math.max(0, input.itemCount - 1) * 3.5
    const orderValueFactor = input.subtotal >= 400 ? -4 : input.subtotal >= 200 ? -2 : 0

    let regionalBase = 36
    if (state === storeState && city === storeCity) {
      regionalBase = 8
    } else if (state === storeState) {
      regionalBase = 12
    } else if (southStates.has(state)) {
      regionalBase = 18
    } else if (southeastStates.has(state)) {
      regionalBase = 24
    } else if (midwestStates.has(state)) {
      regionalBase = 28
    } else if (northeastStates.has(state)) {
      regionalBase = 32
    } else if (northStates.has(state)) {
      regionalBase = 36
    } else {
      regionalBase = 34
    }

    return Number(Math.max(9.9, regionalBase + itemWeightFactor + orderValueFactor).toFixed(2))
  }

  private estimateDeliveryDays(input: { city: string; state: string }) {
    const city = input.city.trim().toUpperCase()
    const state = input.state.toUpperCase()

    if (state === storeState && city === storeCity) return 1
    if (state === storeState) return 2
    if (southStates.has(state)) return 4
    if (southeastStates.has(state)) return 5
    if (midwestStates.has(state)) return 6
    if (northeastStates.has(state)) return 7
    if (northStates.has(state)) return 9
    return 8
  }

  private async resolveDestination(cep: string): Promise<PostalCodeAddress> {
    try {
      return await this.postalCodeService.lookup(cep)
    } catch (error) {
      if (isAppError(error) && error.statusCode === 404) {
        throw error
      }

      return {
        cep,
        street: '',
        neighborhood: '',
        city: 'Nao informado',
        state: this.inferStateFromCep(cep),
      }
    }
  }

  private inferStateFromCep(cep: string) {
    return inferStateFromCep(cep, storeState)
  }
}
