import { describe, expect, it } from 'bun:test'
import {
  lookupPostalCodeInPublicProviders,
  mergePostalCodeAddress,
  normalizeCepDigits,
  requiresPostalCodeFallback,
} from '../../src/utils/postal-code'

describe('postal code utils', () => {
  it('normalizes CEP digits only', () => {
    expect(normalizeCepDigits('89234-135')).toBe('89234135')
  })

  it('flags fallback when backend returns partial address', () => {
    expect(
      requiresPostalCodeFallback({
        cep: '89234135',
        city: 'Nao informado',
        state: 'PR',
      })
    ).toBe(true)
  })

  it('merges fallback provider data over partial backend response', () => {
    const merged = mergePostalCodeAddress(
      {
        cep: '89234135',
        street: '',
        neighborhood: '',
        city: 'Nao informado',
        state: 'PR',
      },
      {
        cep: '89234-135',
        logradouro: 'Rua Dionisio Giessel',
        bairro: 'Paranaguamirim',
        localidade: 'Joinville',
        uf: 'SC',
      }
    )

    expect(merged.street).toBe('Rua Dionisio Giessel')
    expect(merged.neighborhood).toBe('Paranaguamirim')
    expect(merged.city).toBe('Joinville')
    expect(merged.state).toBe('PR')
  })

  it('reads address from ViaCEP first', async () => {
    const address = await lookupPostalCodeInPublicProviders('89234135', async (url) => {
      const target = String(url)
      if (target.includes('viacep.com.br')) {
        return new Response(
          JSON.stringify({
            cep: '89234-135',
            logradouro: 'Rua Dionisio Giessel',
            bairro: 'Paranaguamirim',
            localidade: 'Joinville',
            uf: 'SC',
          }),
          { status: 200 }
        )
      }

      return new Response('{}', { status: 500 })
    })

    expect(address?.city).toBe('Joinville')
    expect(address?.state).toBe('SC')
  })

  it('falls back to BrasilAPI when ViaCEP is unavailable', async () => {
    const address = await lookupPostalCodeInPublicProviders('89234135', async (url) => {
      const target = String(url)
      if (target.includes('viacep.com.br')) {
        throw new Error('network down')
      }

      return new Response(
        JSON.stringify({
          cep: '89234-135',
          street: 'Rua Dionisio Giessel',
          neighborhood: 'Paranaguamirim',
          city: 'Joinville',
          state: 'SC',
        }),
        { status: 200 }
      )
    })

    expect(address?.street).toBe('Rua Dionisio Giessel')
    expect(address?.city).toBe('Joinville')
    expect(address?.state).toBe('SC')
  })
})

