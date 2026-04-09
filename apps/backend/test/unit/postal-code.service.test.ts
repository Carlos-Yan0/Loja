import { describe, expect, it } from 'bun:test'
import { PostalCodeService } from '../../src/modules/postal-code/application/postal-code-service'
import { notFound, serviceUnavailable } from '../../src/shared/errors/error-factory'

describe('PostalCodeService', () => {
  it('returns a fallback address when CEP providers are unavailable', async () => {
    const service = new PostalCodeService({
      lookup: async () => {
        throw serviceUnavailable('provider down')
      },
    })

    const result = await service.lookup('89234-135')

    expect(result.cep).toBe('89234135')
    expect(result.state).toBe('PR')
    expect(result.city).toBe('Nao informado')
  })

  it('preserves not found responses from CEP providers', async () => {
    const service = new PostalCodeService({
      lookup: async () => {
        throw notFound('CEP nao encontrado.')
      },
    })

    await expect(service.lookup('00000000')).rejects.toThrow('CEP nao encontrado')
  })

  it('uses fallback when provider throws app-error shaped service unavailable', async () => {
    const service = new PostalCodeService({
      lookup: async () => {
        throw {
          name: 'AppError',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503,
          message: 'provider down',
        }
      },
    })

    const result = await service.lookup('89234-135')

    expect(result.cep).toBe('89234135')
    expect(result.city).toBe('Nao informado')
    expect(result.state).toBe('PR')
  })

  it('preserves app-error shaped not found responses', async () => {
    const service = new PostalCodeService({
      lookup: async () => {
        throw {
          name: 'AppError',
          code: 'NOT_FOUND',
          statusCode: 404,
          message: 'CEP nao encontrado.',
        }
      },
    })

    await expect(service.lookup('00000000')).rejects.toThrow('CEP nao encontrado')
  })
})
