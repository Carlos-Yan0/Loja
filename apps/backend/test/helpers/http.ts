import { generateAccessToken } from '../../src/libs/jwt'

export const createAuthCookie = (payload: { sub: string; role: string }) =>
  `accessToken=${generateAccessToken(payload)}`

export const readJson = async <T>(response: Response): Promise<T> => response.json() as Promise<T>
