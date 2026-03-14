import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import styles from './Register.module.css';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await usersApi.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(phone.trim() && { phone: phone.trim() }),
      });
      navigate('/login', { state: { message: 'Conta criada! Faça login para continuar.' } });
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={styles.input}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <label className={styles.label}>
            Telefone <span className={styles.optional}>(opcional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
  );
}
