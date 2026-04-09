import type { UploadProductImageService } from '../application/upload-product-image-service'
import type { UploadBannerImageService } from '../application/upload-banner-image-service'

export class UploadController {
  constructor(
    private readonly uploadProductImageService: UploadProductImageService,
    private readonly uploadBannerImageService: UploadBannerImageService
  ) {}

  uploadProductImage(input: { productId: string; file: File }) {
    return this.uploadProductImageService.execute(input)
  }

  uploadBannerImage(input: { file: File }) {
    return this.uploadBannerImageService.execute(input)
  }
}
