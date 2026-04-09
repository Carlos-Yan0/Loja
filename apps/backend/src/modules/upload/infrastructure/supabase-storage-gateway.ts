import { env } from '../../../config/env'
import type { StorageGateway, StorageUploadInput } from '../application/storage-gateway'
import { serviceUnavailable } from '../../../shared/errors/error-factory'

export class SupabaseStorageGateway implements StorageGateway {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async uploadPublicObject(input: StorageUploadInput) {
    if (!env.supabase.url || !env.supabase.serviceRoleKey) {
      throw serviceUnavailable('Supabase Storage nao configurado.')
    }

    let response: Response
    try {
      response = await this.fetcher(
        `${env.supabase.url}/storage/v1/object/${input.bucket}/${input.path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
            apikey: env.supabase.serviceRoleKey,
            'Content-Type': input.contentType,
            'Cache-Control': input.cacheControl ?? '3600',
            'x-upsert': input.upsert ? 'true' : 'false',
          },
          body: input.body,
        }
      )
    } catch {
      throw serviceUnavailable('Nao foi possivel conectar ao Supabase Storage no momento.')
    }

    if (!response.ok) {
      const payload = await response.text()
      throw serviceUnavailable(
        `Falha ao enviar arquivo para o storage: ${response.status} ${payload.slice(0, 180)}`
      )
    }

    return {
      path: input.path,
      publicUrl: `${env.supabase.url}/storage/v1/object/public/${input.bucket}/${input.path}`,
    }
  }

  async deleteObject(bucket: string, path: string) {
    if (!env.supabase.url || !env.supabase.serviceRoleKey) {
      return
    }

    try {
      await this.fetcher(`${env.supabase.url}/storage/v1/object/${bucket}/${path}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
          apikey: env.supabase.serviceRoleKey,
        },
      })
    } catch {
      return
    }
  }
}
