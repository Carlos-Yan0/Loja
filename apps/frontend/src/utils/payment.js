const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const getMetadataPreferenceId = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return ''
  const value = metadata.walletPreferenceId
  return normalizeString(value)
}

export const getWalletBrickConfig = (payment, { publicKey } = {}) => {
  if (!payment || payment.provider !== 'MERCADO_PAGO' || payment.status !== 'PENDING') {
    return null
  }

  const preferenceId =
    normalizeString(payment.walletBrick?.preferenceId) ||
    getMetadataPreferenceId(payment.metadata) ||
    normalizeString(payment.externalId)

  const resolvedPublicKey =
    normalizeString(payment.walletBrick?.publicKey) || normalizeString(publicKey)

  if (!preferenceId || !resolvedPublicKey) {
    return null
  }

  return {
    preferenceId,
    publicKey: resolvedPublicKey,
  }
}

export const readCheckoutReturn = (search) => {
  const params = new URLSearchParams(search)
  const status = normalizeString(params.get('payment')).toLowerCase()
  const orderId = normalizeString(params.get('orderId'))

  if (!status && !orderId) {
    return null
  }

  return {
    status,
    orderId,
  }
}

export const getCheckoutReturnMessage = (status) => {
  if (status === 'success') {
    return 'Pagamento aprovado. Estamos preparando seu pedido.'
  }

  if (status === 'pending') {
    return 'Pagamento em analise. Atualize em instantes para ver o novo status.'
  }

  if (status === 'failure') {
    return 'Pagamento nao concluido. Tente novamente.'
  }

  if (status === 'mock') {
    return 'Checkout de teste iniciado. O status sera atualizado automaticamente.'
  }

  return ''
}
