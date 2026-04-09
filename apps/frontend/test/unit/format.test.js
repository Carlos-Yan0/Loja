import { describe, expect, it } from 'bun:test'
import { formatCep, formatPhone } from '../../src/utils/format'

describe('format utils', () => {
  it('formats CEP and phone consistently', () => {
    expect(formatCep('01001000')).toBe('01001-000')
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888')
  })
})
