import type { ProductService } from '../../product/application/product-service'
import type { StorageGateway } from './storage-gateway'
import { env } from '../../../config/env'
import { validateImageFile } from '../../../shared/utils/image'
import { ensureUuid } from '../../../shared/utils/normalize'

export class UploadProductImageService {
  constructor(
    private readonly productService: ProductService,
    private readonly storageGateway: StorageGateway
  ) {}

  async execute(input: { productId: string; file: File }) {
    const productId = ensureUuid(input.productId, 'Produto')
    const validatedImage = await validateImageFile(input.file, env.upload.maxImageBytes)
    const path = `${productId}/${crypto.randomUUID()}.${validatedImage.extension}`

    const uploadResult = await this.storageGateway.uploadPublicObject({
      bucket: env.supabase.bucket,
      path,
      body: validatedImage.bytes,
      contentType: validatedImage.contentType,
      cacheControl: '3600',
      upsert: false,
    })

    try {
      const product = await this.productService.appendImage(productId, uploadResult.publicUrl)

      return {
        imageUrl: uploadResult.publicUrl,
        imagePath: uploadResult.path,
        product,
      }
    } catch (error) {
      await this.storageGateway.deleteObject(env.supabase.bucket, uploadResult.path)
      throw error
    }
  }
}
