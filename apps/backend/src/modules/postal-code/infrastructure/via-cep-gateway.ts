import type { PostalCodeGateway } from '../application/postal-code-gateway'
import { notFound, serviceUnavailable } from '../../../shared/errors/error-factory'
import { isAppError } from '../../../shared/errors/app-error'

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

interface BrasilApiResponse {
  cep?: string
  street?: string
  neighborhood?: string
  city?: string
  state?: string
  errors?: { name?: string; message?: string }[]
}

export class ViaCepGateway implements PostalCodeGateway {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async lookup(cep: string) {
    const httpUrl = `http://viacep.com.br/ws/${cep}/json/`
    const brasilApiUrl = `https://brasilapi.com.br/api/cep/v1/${cep}`

    try {
      return await this.lookupViaCepUsingUrl(`https://viacep.com.br/ws/${cep}/json/`)
    } catch (error) {
      if (isAppError(error) && error.statusCode === 404) {
        throw error
      }
    }

    try {
      return await this.lookupViaCepUsingUrl(httpUrl)
    } catch (error) {
      if (isAppError(error) && error.statusCode === 404) {
        throw error
      }
    }

    try {
      return await this.lookupBrasilApiUsingUrl(brasilApiUrl)
    } catch (error) {
      if (isAppError(error) && error.statusCode === 404) {
        throw error
      }
    }

    const viaCepFallbackPayload = this.lookupUsingWindowsPowerShell<ViaCepResponse>(httpUrl)
    if (viaCepFallbackPayload) {
      return this.toAddressFromViaCep(viaCepFallbackPayload)
    }

    const brasilApiFallbackPayload = this.lookupUsingWindowsPowerShell<BrasilApiResponse>(brasilApiUrl)
    if (brasilApiFallbackPayload) {
      return this.toAddressFromBrasilApi(brasilApiFallbackPayload)
    }

    throw serviceUnavailable('Nao foi possivel consultar o CEP informado no momento.')
  }

  private async lookupViaCepUsingUrl(url: string) {
    let response: Response

    try {
      response = await this.fetcher(url)
    } catch {
      throw serviceUnavailable('Falha de rede ao consultar o CEP.')
    }

    if (!response.ok) {
      throw serviceUnavailable('Nao foi possivel consultar o CEP informado.')
    }

    let payload: ViaCepResponse

    try {
      payload = (await response.json()) as ViaCepResponse
    } catch {
      throw serviceUnavailable('Resposta invalida ao consultar o CEP.')
    }

    return this.toAddressFromViaCep(payload)
  }

  private async lookupBrasilApiUsingUrl(url: string) {
    let response: Response

    try {
      response = await this.fetcher(url)
    } catch {
      throw serviceUnavailable('Falha de rede ao consultar o CEP.')
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw notFound('CEP nao encontrado.')
      }

      throw serviceUnavailable('Nao foi possivel consultar o CEP informado.')
    }

    let payload: BrasilApiResponse

    try {
      payload = (await response.json()) as BrasilApiResponse
    } catch {
      throw serviceUnavailable('Resposta invalida ao consultar o CEP.')
    }

    return this.toAddressFromBrasilApi(payload)
  }

  private toAddressFromViaCep(payload: ViaCepResponse) {
    if (payload.erro || !payload.cep || !payload.uf || !payload.localidade) {
      throw notFound('CEP nao encontrado.')
    }

    return {
      cep: payload.cep.replace(/\D/g, ''),
      street: payload.logradouro?.trim() ?? '',
      neighborhood: payload.bairro?.trim() ?? '',
      city: payload.localidade.trim(),
      state: payload.uf.trim(),
    }
  }

  private toAddressFromBrasilApi(payload: BrasilApiResponse) {
    const hasError = Array.isArray(payload.errors) && payload.errors.length > 0
    if (hasError || !payload.cep || !payload.state || !payload.city) {
      throw notFound('CEP nao encontrado.')
    }

    return {
      cep: payload.cep.replace(/\D/g, ''),
      street: payload.street?.trim() ?? '',
      neighborhood: payload.neighborhood?.trim() ?? '',
      city: payload.city.trim(),
      state: payload.state.trim(),
    }
  }

  private lookupUsingWindowsPowerShell<T>(url: string): T | null {
    if (process.platform !== 'win32') return null

    try {
      const command = [
        'powershell',
        '-NoProfile',
        '-Command',
        "$ProgressPreference='SilentlyContinue'; $u=$args[0]; (Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 12).Content",
        url,
      ]
      const result = Bun.spawnSync(command, { stdout: 'pipe', stderr: 'pipe' })

      if (result.exitCode !== 0) {
        return null
      }

      const raw = Buffer.from(result.stdout).toString('utf8').trim()
      if (!raw) return null

      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }
}
