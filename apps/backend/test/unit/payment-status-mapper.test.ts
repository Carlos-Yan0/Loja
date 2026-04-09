import { describe, expect, it } from 'bun:test'
import { mapPaymentStatusToOrderStatus } from '../../src/modules/payment/application/payment-status-mapper'

describe('mapPaymentStatusToOrderStatus', () => {
  it('maps approved payment to processing order lifecycle', () => {
    expect(mapPaymentStatusToOrderStatus('APPROVED', 'AWAITING_PAYMENT')).toBe('PROCESSING')
    expect(mapPaymentStatusToOrderStatus('APPROVED', 'IN_TRANSIT')).toBe('IN_TRANSIT')
  })

  it('maps rejected and canceled payment to canceled order', () => {
    expect(mapPaymentStatusToOrderStatus('REJECTED', 'PROCESSING')).toBe('CANCELED')
    expect(mapPaymentStatusToOrderStatus('CANCELED', 'IN_TRANSIT')).toBe('CANCELED')
    expect(mapPaymentStatusToOrderStatus('EXPIRED', 'PROCESSING')).toBe('CANCELED')
  })

  it('keeps awaiting payment while transaction is pending', () => {
    expect(mapPaymentStatusToOrderStatus('PENDING', 'AWAITING_PAYMENT')).toBe('AWAITING_PAYMENT')
    expect(mapPaymentStatusToOrderStatus('PENDING', 'PROCESSING')).toBe('PROCESSING')
  })
})
