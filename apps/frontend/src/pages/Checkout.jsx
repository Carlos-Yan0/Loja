import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { authApi, ordersApi, addressesApi } from '../services/api';
import styles from './Checkout.module.css';

const formatPrice = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const PAY_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'BOLETO', label: 'Boleto' },
];

export function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
  });
  const [payMethod, setPayMethod] = useState('PIX');
  const [saveAddress, setSaveAddress] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login');
      return;
    }
    if (!isAuthenticated) return;

    Promise.all([authApi.me(), addressesApi.list().catch(() => [])])
      .then(([me, addrs]) => {
        setUserId(me.id);
        setAddresses(Array.isArray(addrs) ? addrs : []);
        if (addrs?.length > 0 && addrs[0]) {
          setForm({
            cep: addrs[0].cep ?? '',
            street: addrs[0].street ?? '',
            number: addrs[0].number ?? '',
            complement: addrs[0].complement ?? '',
          });
        }
      })
      .catch(() => setError('Sessão expirada. Faça login novamente.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || items.length === 0) return;
    setError('');
    setSubmitting(true);
    try {
      if (saveAddress && form.cep && form.street && form.number) {
        await addressesApi.create(form);
      }
      const orderItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      }));
      await ordersApi.create({
        userId,
        items: orderItems,
        PayMethod: payMethod,
      });
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao finalizar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (success) {
    return (
      <div className={styles.success}>
        <h2>Pedido realizado com sucesso!</h2>
        <p>Obrigado pela compra. Em breve você receberá mais informações.</p>
        <Link to="/" className={styles.successCta}>
          Voltar à loja
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !success) {
    return (
      <div className={styles.empty}>
        <p>Seu carrinho está vazio.</p>
        <Link to="/">Ver produtos</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Endereço de entrega</h2>
          <p className={styles.hint}>Preencha conforme o cadastro (CEP, rua, número, complemento).</p>
          <div className={styles.grid}>
            <label className={styles.label}>
              CEP
              <input
                type="text"
                name="cep"
                value={form.cep}
                onChange={handleChange}
                placeholder="00000-000"
                required
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Rua
              <input
                type="text"
                name="street"
                value={form.street}
                onChange={handleChange}
                placeholder="Nome da rua"
                required
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Número
              <input
                type="text"
                name="number"
                value={form.number}
                onChange={handleChange}
                placeholder="Nº"
                required
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Complemento <span className={styles.optional}>(opcional)</span>
              <input
                type="text"
                name="complement"
                value={form.complement}
                onChange={handleChange}
                placeholder="Apto, bloco, etc."
                className={styles.input}
              />
            </label>
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            Salvar este endereço para próximas compras
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Forma de pagamento</h2>
          <div className={styles.radioGroup}>
            {PAY_METHODS.map((opt) => (
              <label key={opt.value} className={styles.radio}>
                <input
                  type="radio"
                  name="payMethod"
                  value={opt.value}
                  checked={payMethod === opt.value}
                  onChange={(e) => setPayMethod(e.target.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </section>

        <aside className={styles.summary}>
          <h2 className={styles.sectionTitle}>Resumo do pedido</h2>
          <ul className={styles.summaryList}>
            {items.map((i) => (
              <li key={i.productId}>
                <span>{i.name} × {i.quantity}</span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </p>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Finalizando...' : 'Finalizar pedido'}
          </button>
        </aside>
      </form>
    </div>
  );
}
