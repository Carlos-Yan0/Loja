import { describe, expect, it } from 'bun:test'
import {
  getCheckoutReturnMessage,
  getWalletBrickConfig,
  readCheckoutReturn,
} from '../../src/utils/payment'

describe('payment utils', () => {
  it('builds wallet brick config from response payload', () => {
    const config = getWalletBrickConfig({
      provider: 'MERCADO_PAGO',
      status: 'PENDING',
      walletBrick: {
        preferenceId: 'pref_123',
        publicKey: 'public_key_123',
      },
      metadata: null,
      externalId: null,
    })

    expect(config).toEqual({
      preferenceId: 'pref_123',
      publicKey: 'public_key_123',
    })
  })

  it('falls back to metadata/externalId and public key from env option', () => {
    const config = getWalletBrickConfig(
      {
        provider: 'MERCADO_PAGO',
        status: 'PENDING',
        walletBrick: null,
        metadata: {
          walletPreferenceId: 'pref_metadata',
        },
        externalId: 'pref_external',
      },
      { publicKey: 'pub_env_key' }
    )

    expect(config).toEqual({
      preferenceId: 'pref_metadata',
      publicKey: 'pub_env_key',
    })
  })

  it('returns null when wallet brick cannot be safely rendered', () => {
    expect(
      getWalletBrickConfig({
        provider: 'MOCK',
        status: 'PENDING',
        walletBrick: null,
        metadata: null,
        externalId: 'mock_1',
      })
    ).toBeNull()

    expect(
      getWalletBrickConfig({
        provider: 'MERCADO_PAGO',
        status: 'APPROVED',
        walletBrick: null,
        metadata: null,
        externalId: 'pref_approved',
      })
    ).toBeNull()

    expect(
      getWalletBrickConfig({
        provider: 'MERCADO_PAGO',
        status: 'PENDING',
        walletBrick: null,
        metadata: null,
        externalId: '',
      })
    ).toBeNull()
  })

  it('reads payment return params from checkout query string', () => {
    expect(readCheckoutReturn('?payment=success&orderId=123')).toEqual({
      status: 'success',
      orderId: '123',
    })
    expect(readCheckoutReturn('')).toBeNull()
  })

  it('maps return status to user-friendly messages', () => {
    expect(getCheckoutReturnMessage('success')).toContain('aprovado')
    expect(getCheckoutReturnMessage('pending')).toContain('analise')
    expect(getCheckoutReturnMessage('failure')).toContain('nao concluido')
    expect(getCheckoutReturnMessage('unknown')).toBe('')
  })
})
