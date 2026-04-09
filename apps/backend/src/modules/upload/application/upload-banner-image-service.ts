import { env } from '../../../config/env'
import { validateImageFile } from '../../../shared/utils/image'
import type { StorageGateway } from './storage-gateway'

export class UploadBannerImageService {
  constructor(private readonly storageGateway: StorageGateway) {}

  async execute(input: { file: File }) {
    const validatedImage = await validateImageFile(input.file, env.upload.maxImageBytes)
    const path = `home/${crypto.randomUUID()}.${validatedImage.extension}`

    const uploadResult = await this.storageGateway.uploadPublicObject({
      bucket: env.supabase.bannersBucket,
      path,
      body: validatedImage.bytes,
      contentType: validatedImage.contentType,
      cacheControl: '3600',
      upsert: false,
    })

    return {
      imageUrl: uploadResult.publicUrl,
      imagePath: uploadResult.path,
    }
  }
}

