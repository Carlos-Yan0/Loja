import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { validateLoginForm } from '../utils/validation'
import styles from './Login.module.css'

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const message = location.state?.message
    if (message) {
      setSuccessMessage(message)
      window.history.replaceState({}, '', location.pathname)
    }
  }, [location])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validation = validateLoginForm(form)
    if (!validation.isValid) {
      setError(Object.values(validation.errors)[0])
      return
    }

    setError('')
    setLoading(true)

    try {
      await login(validation.payload.email, validation.payload.password)
      navigate('/')
    } catch (requestError) {
      setError(requestError.message || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.subtitle}>Acesse sua conta para continuar</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {successMessage && <p className={styles.success}>{successMessage}</p>}
          {error && <p className={styles.error}>{error}</p>}
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
              autoComplete="current-password"
              className={styles.input}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className={styles.footer}>
          Não tem conta? <Link to="/registro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
