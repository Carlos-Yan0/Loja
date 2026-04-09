import { payloadTooLarge, unsupportedMediaType } from '../errors/error-factory'

export interface ValidatedImage {
  bytes: Uint8Array
  extension: 'jpg' | 'png' | 'webp' | 'gif'
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
}

const IMAGE_SIGNATURES = [
  {
    extension: 'png',
    contentType: 'image/png',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47,
  },
  {
    extension: 'jpg',
    contentType: 'image/jpeg',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    extension: 'gif',
    contentType: 'image/gif',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38,
  },
  {
    extension: 'webp',
    contentType: 'image/webp',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50,
  },
] as const

export const validateImageFile = async (file: File, maxBytes: number): Promise<ValidatedImage> => {
  if (file.size <= 0) {
    throw unsupportedMediaType('A imagem enviada esta vazia.')
  }

  if (file.size > maxBytes) {
    throw payloadTooLarge(`A imagem excede o limite de ${maxBytes} bytes.`)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const signature = IMAGE_SIGNATURES.find((candidate) => candidate.matches(bytes))

  if (!signature) {
    throw unsupportedMediaType('Formato de imagem nao suportado.')
  }

  return {
    bytes,
    extension: signature.extension,
    contentType: signature.contentType,
  }
}
