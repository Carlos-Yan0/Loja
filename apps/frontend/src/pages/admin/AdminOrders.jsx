import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import styles from './AdminOrders.module.css';

const formatPrice = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const formatDate = (iso) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

const ORDER_STATUSES = [
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'DELIVERED',  label: 'Entregue'    },
  { value: 'COMPLETED',  label: 'Concluído'   },
  { value: 'CANCELED',   label: 'Cancelado'   },
];

const PAY_LABELS = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto',
};

const STATUS_ALL = 'ALL';

export function AdminOrders() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter]     = useState(STATUS_ALL);
  const [expanded, setExpanded] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    ordersApi
      .list()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await ordersApi.update(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast('Status atualizado!');
    } catch (err) {
      alert(err.message || 'Erro ao atualizar status.');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const filtered = filter === STATUS_ALL ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pedidos</h1>
          <p className={styles.pageSubtitle}>
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={load} className={styles.refreshBtn}>↺ Atualizar</button>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Filter pills — horizontally scrollable on mobile */}
      <div className={styles.filtersWrap}>
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === STATUS_ALL ? styles.filterActive : ''}`}
            onClick={() => setFilter(STATUS_ALL)}
          >
            Todos ({orders.length})
          </button>
          {ORDER_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s.value).length;
            return (
              <button
                key={s.value}
                type="button"
                className={`${styles.filterBtn} ${filter === s.value ? styles.filterActive : ''}`}
                onClick={() => setFilter(s.value)}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div className={styles.state}><p>Carregando pedidos...</p></div>}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" onClick={load} className={styles.retryBtn}>Tentar novamente</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.empty}><p>Nenhum pedido encontrado.</p></div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* ── Mobile: card list ── */}
          <ul className={styles.cardList}>
            {filtered.map((order) => (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.orderId}>#{order.id.slice(0,8).toUpperCase()}</span>
                  <span className={styles.date}>{formatDate(order.createdAt)}</span>
                </div>

                <div className={styles.cardUser}>
                  <span className={styles.userName}>{order.user?.name ?? '—'}</span>
                  <span className={styles.userEmail}>{order.user?.email ?? ''}</span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Pagamento</span>
                  <span className={styles.cardValue}>{PAY_LABELS[order.PayMethod] ?? order.PayMethod}</span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrice(order.total)}</span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Status</span>
                  <div className={styles.statusGroup}>
                    <StatusBadge status={order.status} />
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={styles.statusSelect}
                      disabled={updating === order.id}
                      aria-label="Alterar status"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {order.items?.length > 0 && (
                  <button
                    type="button"
                    className={styles.expandBtn}
                    onClick={() => toggleExpand(order.id)}
                    aria-expanded={expanded === order.id}
                  >
                    {expanded === order.id ? '▲ Ocultar itens' : `▼ Ver ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
                  </button>
                )}

                {expanded === order.id && order.items?.length > 0 && (
                  <ul className={styles.itemsList}>
                    {order.items.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <span className={styles.itemName}>{item.product?.name ?? item.productId.slice(0,8)}</span>
                        <span className={styles.itemMeta}>{item.quantity}× {formatPrice(item.price)}</span>
                        <span className={styles.itemSubtotal}>{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* ── Desktop: table ── */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Pedido</th>
                  <th className={styles.th}>Data</th>
                  <th className={styles.th}>Cliente</th>
                  <th className={styles.th}>Pagamento</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Itens</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <>
                    <tr key={order.id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.orderIdBadge}>#{order.id.slice(0,8).toUpperCase()}</span>
                      </td>
                      <td className={styles.td}><span className={styles.dateCell}>{formatDate(order.createdAt)}</span></td>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <span className={styles.userName}>{order.user?.name ?? '—'}</span>
                          <span className={styles.userEmail}>{order.user?.email ?? ''}</span>
                        </div>
                      </td>
                      <td className={styles.td}><span className={styles.payMethod}>{PAY_LABELS[order.PayMethod] ?? order.PayMethod}</span></td>
                      <td className={styles.td}><span className={styles.totalValue}>{formatPrice(order.total)}</span></td>
                      <td className={styles.td}>
                        <div className={styles.statusCell}>
                          <StatusBadge status={order.status} />
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={styles.statusSelect}
                            disabled={updating === order.id}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className={styles.td}>
                        {order.items?.length > 0 && (
                          <button type="button" className={styles.expandBtnTable} onClick={() => toggleExpand(order.id)}>
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''} {expanded === order.id ? '▲' : '▼'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === order.id && order.items?.length > 0 && (
                      <tr key={`${order.id}-items`} className={styles.itemsRow}>
                        <td colSpan={7} className={styles.itemsTd}>
                          <div className={styles.itemsInner}>
                            <p className={styles.itemsTitle}>Itens do pedido:</p>
                            <ul className={styles.itemsList}>
                              {order.items.map((item) => (
                                <li key={item.id} className={styles.item}>
                                  <span className={styles.itemName}>{item.product?.name ?? item.productId.slice(0,8)}</span>
                                  <span className={styles.itemMeta}>{item.quantity}× {formatPrice(item.price)}</span>
                                  <span className={styles.itemSubtotal}>{formatPrice(item.price * item.quantity)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
