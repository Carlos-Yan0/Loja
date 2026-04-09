import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  LocalStorageGateway,
  resolveLocalUploadFilePath,
} from '../../src/modules/upload/infrastructure/local-storage-gateway'

describe('LocalStorageGateway', () => {
  let tempRoot = ''

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'loja-upload-'))
  })

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true })
    }
  })

  it('stores image bytes and returns a public URL served by backend', async () => {
    const gateway = new LocalStorageGateway({
      rootDir: tempRoot,
      publicBaseUrl: 'http://localhost:3000',
    })

    const result = await gateway.uploadPublicObject({
      bucket: 'products',
      path: 'a/b/c/test.png',
      body: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
      contentType: 'image/png',
    })

    expect(result.path).toBe('a/b/c/test.png')
    expect(result.publicUrl).toBe('http://localhost:3000/uploads/products/a/b/c/test.png')

    const absolutePath = resolveLocalUploadFilePath(`products/${result.path}`, tempRoot)
    expect(absolutePath).not.toBeNull()

    await gateway.deleteObject('products', result.path)
    expect(resolveLocalUploadFilePath(`products/${result.path}`, tempRoot)).toBeNull()
  })

  it('blocks path traversal attempts', async () => {
    const gateway = new LocalStorageGateway({
      rootDir: tempRoot,
      publicBaseUrl: 'http://localhost:3000',
    })

    await expect(
      gateway.uploadPublicObject({
        bucket: 'products',
        path: '../secret.txt',
        body: Uint8Array.from([0x31]),
        contentType: 'text/plain',
      })
    ).rejects.toThrow('Caminho de upload invalido')
  })
})
