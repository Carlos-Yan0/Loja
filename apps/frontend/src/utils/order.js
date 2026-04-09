export const buildAddressFromReceipt = (receipt) => ({
  cep: receipt?.deliveryAddress?.cep ?? '',
  street: receipt?.deliveryAddress?.street ?? '',
  number: receipt?.deliveryAddress?.number ?? '',
  complement: receipt?.deliveryAddress?.complement ?? '',
  neighborhood: receipt?.deliveryAddress?.neighborhood ?? '',
  city: receipt?.deliveryAddress?.city ?? '',
  state: receipt?.deliveryAddress?.state ?? '',
})

const asText = (value) => String(value ?? '').trim()

const prefer = (primary, fallback) => {
  const primaryValue = asText(primary)
  if (primaryValue) return primaryValue
  return asText(fallback)
}

export const buildAddressForPersistence = (receipt, fallbackAddress) => {
  const fromReceipt = buildAddressFromReceipt(receipt)

  return {
    cep: prefer(fromReceipt.cep, fallbackAddress?.cep),
    street: prefer(fromReceipt.street, fallbackAddress?.street),
    number: prefer(fromReceipt.number, fallbackAddress?.number),
    complement: prefer(fromReceipt.complement, fallbackAddress?.complement),
    neighborhood: prefer(fromReceipt.neighborhood, fallbackAddress?.neighborhood),
    city: prefer(fromReceipt.city, fallbackAddress?.city),
    state: prefer(fromReceipt.state, fallbackAddress?.state).toUpperCase(),
  }
}

export const normalizeReceipt = (receipt) => {
  if (!receipt) return null

  return {
    issuedAt: receipt.issuedAt,
    orderNumber: receipt.orderNumber,
    customerName: receipt.customerName,
    paymentMethod: receipt.paymentMethod,
    deliveryAddress: {
      cep: receipt.deliveryAddress?.cep ?? '',
      street: receipt.deliveryAddress?.street ?? '',
      number: receipt.deliveryAddress?.number ?? '',
      complement: receipt.deliveryAddress?.complement ?? '',
      neighborhood: receipt.deliveryAddress?.neighborhood ?? '',
      city: receipt.deliveryAddress?.city ?? '',
      state: receipt.deliveryAddress?.state ?? '',
    },
    items: Array.isArray(receipt.items) ? receipt.items : [],
    subtotal: Number(receipt.subtotal ?? 0),
    shipping: Number(receipt.shipping ?? 0),
    total: Number(receipt.total ?? 0),
  }
}
