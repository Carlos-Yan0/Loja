import { describe, expect, it } from 'bun:test'
import { ViaCepGateway } from '../../src/modules/postal-code/infrastructure/via-cep-gateway'

describe('ViaCepGateway', () => {
  it('falls back to http when https request fails', async () => {
    const gateway = new ViaCepGateway(async (url) => {
      if (String(url).startsWith('https://')) {
        throw new Error('TLS error')
      }

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
    })

    const address = await gateway.lookup('89234135')
    expect(address.cep).toBe('89234135')
    expect(address.city).toBe('Joinville')
    expect(address.state).toBe('SC')
  })

  it('throws not found for non-existing CEP payload', async () => {
    const gateway = new ViaCepGateway(async () =>
      new Response(JSON.stringify({ erro: true }), { status: 200 })
    )

    await expect(gateway.lookup('00000000')).rejects.toThrow('CEP nao encontrado')
  })

  it('falls back to BrasilAPI when ViaCEP is unavailable', async () => {
    const gateway = new ViaCepGateway(async (url) => {
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

    const address = await gateway.lookup('89234135')
    expect(address.cep).toBe('89234135')
    expect(address.city).toBe('Joinville')
    expect(address.state).toBe('SC')
  })
})
