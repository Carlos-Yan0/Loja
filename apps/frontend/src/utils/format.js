export const formatPrice = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const formatCep = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const formatPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, ddd, prefix, suffix) =>
      suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`
    )
  }

  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, prefix, suffix) =>
    suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`
  )
}
