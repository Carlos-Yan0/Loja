import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { serviceUnavailable } from '../shared/errors/error-factory'

interface TokenPayload {
  sub: string
  role: string
}

const getAccessTokenSecret = () => {
  if (!env.accessTokenSecret) {
    throw serviceUnavailable('ACCESS_TOKEN_SECRET nao definido no ambiente.')
  }

  return env.accessTokenSecret
}

const getRefreshTokenSecret = () => {
  if (!env.refreshTokenSecret) {
    throw serviceUnavailable('REFRESH_TOKEN_SECRET nao definido no ambiente.')
  }

  return env.refreshTokenSecret
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getAccessTokenSecret(), { expiresIn: '60m' })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshTokenSecret(), { expiresIn: '7d' })
}

export const verifyAccessToken = (token: string) => jwt.verify(token, getAccessTokenSecret())

export const verifyRefreshToken = (token: string) => jwt.verify(token, getRefreshTokenSecret())
