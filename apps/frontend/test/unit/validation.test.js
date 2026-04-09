import { describe, expect, it } from 'bun:test'
import {
  validateCheckoutAddress,
  validateLoginForm,
  validateProductForm,
  validateRegisterForm,
  validateUserManagementForm,
} from '../../src/utils/validation'

describe('frontend validation utils', () => {
  it('validates and normalizes product payloads', () => {
    const result = validateProductForm({
      name: '  Jaqueta Jeans  ',
      price: '199.9',
      category: '  Feminino ',
      tags: 'nova, inverno, nova',
      stock: 4,
      existingImages: ['https://cdn.test/a.jpg'],
      newFiles: [],
    })

    expect(result.isValid).toBe(true)
    expect(result.payload.name).toBe('Jaqueta Jeans')
    expect(result.payload.category).toBe('Feminino')
    expect(result.payload.tags).toEqual(['nova', 'inverno'])
  })

  it('rejects invalid checkout addresses', () => {
    const result = validateCheckoutAddress({
      cep: '123',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.cep).toBeTruthy()
    expect(result.errors.street).toBeTruthy()
  })

  it('normalizes register and login forms', () => {
    const register = validateRegisterForm({
      name: ' Maria ',
      email: 'MARIA@EXAMPLE.COM',
      password: '12345678',
      phone: '(11) 99999-8888',
    })
    const login = validateLoginForm({
      email: ' MARIA@EXAMPLE.COM ',
      password: '12345678',
    })

    expect(register.isValid).toBe(true)
    expect(register.payload.email).toBe('maria@example.com')
    expect(register.payload.phone).toBe('11999998888')
    expect(login.isValid).toBe(true)
    expect(login.payload.email).toBe('maria@example.com')
  })

  it('validates admin user management payloads without trusting role or password blindly', () => {
    const createResult = validateUserManagementForm(
      {
        name: ' Admin ',
        email: 'ADMIN@EXAMPLE.COM',
        phone: '(11) 98888-7777',
        role: 'ADMIN',
        password: '12345678',
      },
      { requirePassword: true }
    )
    const updateResult = validateUserManagementForm(
      {
        name: ' Cliente ',
        email: 'cliente@example.com',
        phone: '',
        role: 'UNKNOWN',
        password: '',
      },
      { requirePassword: false }
    )

    expect(createResult.isValid).toBe(true)
    expect(createResult.payload.email).toBe('admin@example.com')
    expect(createResult.payload.phone).toBe('11988887777')
    expect(createResult.payload.role).toBe('ADMIN')
    expect(updateResult.isValid).toBe(true)
    expect(updateResult.payload.role).toBe('CUSTOMER')
    expect(updateResult.payload.password).toBeUndefined()
  })
})
