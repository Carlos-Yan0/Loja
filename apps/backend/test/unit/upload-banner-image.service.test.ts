import { beforeEach, describe, expect, it } from 'bun:test'
import { UploadBannerImageService } from '../../src/modules/upload/application/upload-banner-image-service'
import { InMemoryStorageGateway } from '../helpers/in-memory-dependencies'

describe('UploadBannerImageService', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.SUPABASE_STORAGE_BANNERS_BUCKET = 'banners'
  })

  it('uploads a banner image in the home folder using banners bucket', async () => {
    const storageGateway = new InMemoryStorageGateway()
    const service = new UploadBannerImageService(storageGateway)

    const file = new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'banner.png',
      {
        type: 'image/png',
      }
    )

    const result = await service.execute({ file })

    expect(result.imagePath).toContain('home/')
    expect(result.imageUrl).toContain('/banners/')
    expect(storageGateway.uploadedPaths).toHaveLength(1)
  })
})

