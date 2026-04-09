import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi } from '../services/api'
import { formatPhone } from '../utils/format'
import { validateRegisterForm } from '../utils/validation'
import styles from './Register.module.css'

export function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'phone' ? formatPhone(value) : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validation = validateRegisterForm(form)
    if (!validation.isValid) {
      setError(Object.values(validation.errors)[0])
      return
    }

    setError('')
    setLoading(true)

    try {
      await usersApi.create(validation.payload)
      navigate('/login', { state: { message: 'Conta criada! Faça login para continuar.' } })
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.subtitle}>Preencha os dados para se cadastrar</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.label}>
            Nome completo
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="name"
              className={styles.input}
              placeholder="Seu nome"
            />
          </label>
          <label className={styles.label}>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className={styles.input}
              placeholder="seu@email.com"
            />
          </label>
          <label className={styles.label}>
            Senha
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              className={styles.input}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          <label className={styles.label}>
            Telefone <span className={styles.optional}>(opcional)</span>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              className={styles.input}
              placeholder="(00) 00000-0000"
            />
          </label>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Fazer login</Link>
        </p>
      </div>
    </div>
  )
}
