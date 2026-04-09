const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '')

export const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')

export const splitTags = (value) =>
  [...new Set(
    String(value ?? '')
      .split(',')
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
  )]

export const validateEmail = (value) => emailPattern.test(String(value ?? '').trim().toLowerCase())

export const validatePassword = (value) => {
  const password = String(value ?? '')
  return password.length >= 8 && password.length <= 72
}

export const validateCep = (value) => normalizeDigits(value).length === 8

export const validatePhone = (value) => {
  const digits = normalizeDigits(value)
  return digits.length === 0 || digits.length === 10 || digits.length === 11
}

export const validateProductForm = (form) => {
  const errors = {}
  const name = normalizeText(form.name)
  const category = normalizeText(form.category)
  const price = Number(form.price)
  const stock = Number(form.stock)
  const tags = splitTags(form.tags)

  if (!name || name.length > 120) {
    errors.name = 'Informe um nome valido com ate 120 caracteres.'
  }

  if (!Number.isFinite(price) || price < 0) {
    errors.price = 'Informe um preco valido.'
  }

  if (!category || category.length > 80) {
    errors.category = 'Informe uma categoria valida com ate 80 caracteres.'
  }

  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Informe um estoque inteiro igual ou maior que zero.'
  }

  if (tags.length > 20) {
    errors.tags = 'Use no maximo 20 tags.'
  }

  if ((form.existingImages?.length ?? 0) + (form.newFiles?.length ?? 0) > 10) {
    errors.images = 'Cada produto suporta no maximo 10 imagens.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    payload: {
      name,
      price: Number(price.toFixed(2)),
      category,
      tags,
      stock,
      images: form.existingImages ?? [],
    },
  }
}

export const validateRegisterForm = (form) => {
  const errors = {}
  const name = normalizeText(form.name)
  const email = normalizeText(form.email).toLowerCase()
  const phone = normalizeDigits(form.phone)

  if (!name || name.length > 120) {
    errors.name = 'Informe um nome valido.'
  }

  if (!validateEmail(email)) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (!validatePassword(form.password)) {
    errors.password = 'A senha precisa ter entre 8 e 72 caracteres.'
  }

  if (!validatePhone(phone)) {
    errors.phone = 'Informe um telefone valido.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    payload: {
      name,
      email,
      password: String(form.password ?? ''),
      ...(phone && { phone }),
    },
  }
}

export const validateLoginForm = (form) => {
  const errors = {}
  const email = normalizeText(form.email).toLowerCase()

  if (!validateEmail(email)) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (!String(form.password ?? '')) {
    errors.password = 'Informe sua senha.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    payload: {
      email,
      password: String(form.password ?? ''),
    },
  }
}

export const validateUserManagementForm = (form, { requirePassword = false } = {}) => {
  const errors = {}
  const name = normalizeText(form.name)
  const email = normalizeText(form.email).toLowerCase()
  const phone = normalizeDigits(form.phone)
  const role = form.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
  const password = String(form.password ?? '')

  if (!name || name.length > 120) {
    errors.name = 'Informe um nome valido.'
  }

  if (!validateEmail(email)) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (!validatePhone(phone)) {
    errors.phone = 'Informe um telefone valido.'
  }

  if (requirePassword && !validatePassword(password)) {
    errors.password = 'A senha precisa ter entre 8 e 72 caracteres.'
  }

  if (!requirePassword && password && !validatePassword(password)) {
    errors.password = 'A senha precisa ter entre 8 e 72 caracteres.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    payload: {
      name,
      email,
      role,
      ...(phone && { phone }),
      ...(password && { password }),
    },
  }
}

export const validateCheckoutAddress = (form) => {
  const errors = {}
  const cep = normalizeDigits(form.cep)
  const street = normalizeText(form.street)
  const number = normalizeText(form.number)
  const complement = normalizeText(form.complement)
  const neighborhood = normalizeText(form.neighborhood)
  const city = normalizeText(form.city)
  const state = normalizeText(form.state).toUpperCase()

  if (!validateCep(cep)) {
    errors.cep = 'Informe um CEP valido.'
  }

  if (!street) {
    errors.street = 'Rua obrigatoria.'
  }

  if (!number) {
    errors.number = 'Numero obrigatorio.'
  }

  if (!city) {
    errors.city = 'Cidade obrigatoria.'
  }

  if (state.length !== 2) {
    errors.state = 'UF invalida.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    payload: {
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    },
  }
}
