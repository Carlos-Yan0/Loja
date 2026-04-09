import { describe, expect, it } from 'bun:test'
import {
  buildAddressForPersistence,
  buildAddressFromReceipt,
  normalizeReceipt,
} from '../../src/utils/order'

describe('order utils', () => {
  it('normalizes receipt payloads and derives an address object', () => {
    const receipt = normalizeReceipt({
      issuedAt: '2026-04-02T10:00:00.000Z',
      orderNumber: '12345678-1234-1234-1234-123456789012',
      customerName: 'Maria',
      paymentMethod: 'PIX',
      deliveryAddress: {
        cep: '01001000',
        street: 'Praca da Se',
        number: '10',
        complement: 'Apto 1',
        neighborhood: 'Se',
        city: 'Sao Paulo',
        state: 'SP',
      },
      items: [{ description: 'Camiseta', quantity: 2, unitPrice: 59.9, subtotal: 119.8 }],
      subtotal: 119.8,
      shipping: 12,
      total: 131.8,
    })

    expect(receipt.total).toBe(131.8)
    expect(buildAddressFromReceipt(receipt)).toEqual({
      cep: '01001000',
      street: 'Praca da Se',
      number: '10',
      complement: 'Apto 1',
      neighborhood: 'Se',
      city: 'Sao Paulo',
      state: 'SP',
    })
  })

  it('uses checkout fallback values when receipt address is partial', () => {
    const payload = buildAddressForPersistence(
      {
        deliveryAddress: {
          cep: '89234135',
          street: '',
          number: '136',
          complement: '',
          neighborhood: '',
          city: 'Nao informado',
          state: 'PR',
        },
      },
      {
        cep: '89234135',
        street: 'Rua Dionisio Giessel',
        number: '136',
        complement: '',
        neighborhood: 'Paranaguamirim',
        city: 'Joinville',
        state: 'SC',
      }
    )

    expect(payload).toEqual({
      cep: '89234135',
      street: 'Rua Dionisio Giessel',
      number: '136',
      complement: '',
      neighborhood: 'Paranaguamirim',
      city: 'Nao informado',
      state: 'PR',
    })
  })
})
