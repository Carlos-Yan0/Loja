export interface StorageUploadInput {
  bucket: string
  path: string
  body: Uint8Array
  contentType: string
  cacheControl?: string
  upsert?: boolean
}

export interface StorageUploadResult {
  path: string
  publicUrl: string
}

export interface StorageGateway {
  uploadPublicObject(input: StorageUploadInput): Promise<StorageUploadResult>
  deleteObject(bucket: string, path: string): Promise<void>
}
