import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';
import { ordersApi } from '../services/api';
import { formatDateTime, formatPrice } from '../utils/format';
import { canOrderBeCanceled, resolveCancelWindowHours } from '../utils/order-cancel';
import styles from './MyOrders.module.css';

const payLabels = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartao de credito',
  BOLETO: 'Boleto',
};

const paymentLabels = {
  PENDING: 'Esperando pagamento',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
};

const cancelWindowHours = resolveCancelWindowHours(
  import.meta.env.VITE_ORDER_CUSTOMER_CANCEL_WINDOW_HOURS
);

export function MyOrders() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await ordersApi.listMine();
      setOrders(response);
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar seus pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadOrders();
    }
  }, [authLoading, isAuthenticated, loadOrders]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCancel = async (orderId) => {
    setCancelingId(orderId);
    try {
      const updated = await ordersApi.cancelMine(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updated : order))
      );
      setToast('Pedido cancelado com sucesso.');
    } catch (requestError) {
      setToast(requestError.message || 'Nao foi possivel cancelar o pedido.');
    } finally {
      setCancelingId('');
    }
  };

  const ordersCountLabel = useMemo(
    () => `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`,
    [orders.length]
  );

  if (authLoading) {
    return (
      <div className={styles.state}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.state}>
        <p>Voce precisa entrar para ver seus pedidos.</p>
        <Link to="/login">Ir para login</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meus pedidos</h1>
          <p className={styles.subtitle}>{ordersCountLabel}</p>
        </div>
        <button type="button" className={styles.refreshBtn} onClick={loadOrders}>
          Atualizar
        </button>
      </div>

      {loading && (
        <div className={styles.state}>
          <p>Carregando pedidos...</p>
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className={styles.state}>
          <p>Voce ainda nao realizou pedidos.</p>
          <Link to="/">Ver produtos</Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className={styles.list}>
          {orders.map((order) => {
            const cancelAllowed = canOrderBeCanceled(order, cancelWindowHours);
            return (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  <StatusBadge status={order.status} />
                </div>

                <p className={styles.row}>
                  <span>Data</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </p>
                <p className={styles.row}>
                  <span>Pagamento</span>
                  <span>{payLabels[order.payMethod] ?? order.payMethod}</span>
                </p>
                <p className={styles.row}>
                  <span>Status pagamento</span>
                  <span>
                    {paymentLabels[order.payment?.status] ??
                      order.payment?.status ??
                      'Nao iniciado'}
                  </span>
                </p>
                <p className={styles.row}>
                  <span>Frete</span>
                  <span>{formatPrice(order.shipping)}</span>
                </p>
                <p className={styles.rowTotal}>
                  <span>Total</span>
                  <strong>{formatPrice(order.total)}</strong>
                </p>

                <ul className={styles.items}>
                  {order.items.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <span className={styles.itemName}>
                        {item.product?.name ?? item.productId.slice(0, 8)}
                      </span>
                      <span className={styles.itemMeta}>
                        {item.quantity}x {formatPrice(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>

                {cancelAllowed ? (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelingId === order.id}
                  >
                    {cancelingId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                  </button>
                ) : (
                  <p className={styles.cancelHint}>
                    Cancelamento disponivel ate {cancelWindowHours}h apos o pedido.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
