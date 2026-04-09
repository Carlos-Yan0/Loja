import type { ShippingService } from '../application/shipping-service'

export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  quote(input: { cep: string; items: { productId: string; quantity: number }[] }) {
    return this.shippingService.quote(input)
  }
}
