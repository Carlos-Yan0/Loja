import { existsSync } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { env } from '../../../config/env'
import { badRequest, serviceUnavailable } from '../../../shared/errors/error-factory'
import type { StorageGateway, StorageUploadInput } from '../application/storage-gateway'

export const DEFAULT_LOCAL_UPLOADS_ROOT = resolve(process.cwd(), 'storage')

const ensureSafeRelativePath = (value: string) => {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    throw badRequest('Caminho de upload invalido.')
  }

  return segments.join('/')
}

const resolvePathInsideRoot = (relativePath: string, rootDir: string) => {
  const absolutePath = resolve(rootDir, relativePath)
  const normalizedRoot = `${resolve(rootDir).replace(/[\\\/]+$/, '')}${sep}`
  const normalizedAbsolute = resolve(absolutePath)

  if (!normalizedAbsolute.startsWith(normalizedRoot)) {
    throw badRequest('Caminho de upload invalido.')
  }

  return absolutePath
}

const toPublicRelativePath = (relativePath: string) =>
  relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

export const resolveLocalUploadFilePath = (
  requestedPath: string,
  rootDir = DEFAULT_LOCAL_UPLOADS_ROOT
) => {
  try {
    const safeRelativePath = ensureSafeRelativePath(requestedPath)
    const absolutePath = resolvePathInsideRoot(safeRelativePath, rootDir)

    if (!existsSync(absolutePath)) {
      return null
    }

    return absolutePath
  } catch {
    return null
  }
}

interface LocalStorageGatewayOptions {
  rootDir?: string
  publicBaseUrl?: string
}

export class LocalStorageGateway implements StorageGateway {
  private readonly rootDir: string
  private readonly publicBaseUrl: string

  constructor(options: LocalStorageGatewayOptions = {}) {
    this.rootDir = options.rootDir ?? DEFAULT_LOCAL_UPLOADS_ROOT
    this.publicBaseUrl = options.publicBaseUrl ?? env.backendPublicUrl
  }

  async uploadPublicObject(input: StorageUploadInput) {
    const bucket = ensureSafeRelativePath(input.bucket)
    const path = ensureSafeRelativePath(input.path)
    const relativePath = `${bucket}/${path}`
    const absolutePath = resolvePathInsideRoot(relativePath, this.rootDir)

    try {
      await mkdir(dirname(absolutePath), { recursive: true })
      await Bun.write(absolutePath, input.body)
    } catch {
      throw serviceUnavailable('Nao foi possivel salvar a imagem no storage local.')
    }

    return {
      path,
      publicUrl: `${this.publicBaseUrl}/uploads/${toPublicRelativePath(relativePath)}`,
    }
  }

  async deleteObject(bucket: string, path: string) {
    try {
      const relativePath = `${ensureSafeRelativePath(bucket)}/${ensureSafeRelativePath(path)}`
      const absolutePath = resolvePathInsideRoot(relativePath, this.rootDir)
      await unlink(absolutePath)
    } catch {
      return
    }
  }
}
