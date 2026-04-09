import { describe, expect, it } from 'bun:test'

describe('SupabaseStorageGateway', () => {
  it('returns service unavailable when network fails during upload', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    const { SupabaseStorageGateway } = await import(
      '../../src/modules/upload/infrastructure/supabase-storage-gateway'
    )

    const gateway = new SupabaseStorageGateway(async () => {
      throw new Error('network error')
    })

    await expect(
      gateway.uploadPublicObject({
        bucket: 'products',
        path: 'product-id/image.webp',
        body: new Uint8Array([1, 2, 3]),
        contentType: 'image/webp',
      })
    ).rejects.toThrow('Nao foi possivel conectar ao Supabase Storage')
  })
})
