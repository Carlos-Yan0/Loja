import type { PaymentService } from '../application/payment-service'
import type { CreatePaymentCheckoutInput, GetOrderPaymentInput, ProcessWebhookInput } from '../domain/payment'

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createCheckoutForOrder(input: CreatePaymentCheckoutInput) {
    return this.paymentService.createCheckoutForOrder(input)
  }

  getOrderPayment(input: GetOrderPaymentInput) {
    return this.paymentService.getOrderPayment(input)
  }

  processWebhook(input: ProcessWebhookInput) {
    return this.paymentService.processWebhook(input)
  }

  isWebhookTokenValid(token: string | undefined) {
    return this.paymentService.isWebhookTokenValid(token)
  }
}
