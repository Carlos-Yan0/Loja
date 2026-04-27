import { useCallback, useEffect, useState } from 'react'
import { ReceiptCard } from '../../components/ReceiptCard'
import { StatusBadge } from '../../components/StatusBadge'
import { ordersApi, paymentsApi } from '../../services/api'
import { formatDateTime, formatPrice } from '../../utils/format'
import { printElementById } from '../../utils/print'
import { buildReceiptFromOrder, canViewReceiptForOrder } from '../../utils/receipt'
import styles from './AdminOrders.module.css'

const orderStatuses = [
  { value: 'AWAITING_PAYMENT', label: 'Esperando pagamento' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELED', label: 'Cancelado' },
]

const payLabels = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto',
}

const paymentLabels = {
  PENDING: 'Esperando pagamento',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
}

const statusAll = 'ALL'
const autoRefreshablePaymentStatuses = new Set(['PENDING'])

const mapPaymentFromTransaction = (payment) => ({
  provider: payment.provider,
  status: payment.status,
  checkoutUrl: payment.checkoutUrl ?? null,
  externalId: payment.externalId ?? null,
  updatedAt: payment.updatedAt,
})

const hasOpenPayment = (order) =>
  order?.status === 'AWAITING_PAYMENT' ||
  autoRefreshablePaymentStatuses.has(order?.payment?.status)

export function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState(statusAll)
  const [expanded, setExpanded] = useState(null)
  const [activeReceipt, setActiveReceipt] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    setError('')

    ordersApi
      .list()
      .then(setOrders)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const shouldAutoRefresh = orders.some(hasOpenPayment)
    if (!shouldAutoRefresh) return undefined

    const intervalId = setInterval(() => {
      load()
    }, 10000)

    return () => clearInterval(intervalId)
  }, [load, orders])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId)
    try {
      const updatedOrder = await ordersApi.update(orderId, { status: newStatus })
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order))
      )
      showToast('Status atualizado com sucesso.')
    } catch (requestError) {
      window.alert(requestError.message || 'Erro ao atualizar status.')
    } finally {
      setUpdating(null)
    }
  }

  const handleViewReceipt = async (orderId) => {
    try {
      const [payment, order] = await Promise.all([
        paymentsApi.getOrderPayment(orderId, { sync: true }),
        ordersApi.get(orderId),
      ])

      const mergedOrder = payment
        ? {
            ...order,
            payment: mapPaymentFromTransaction(payment),
          }
        : order

      setOrders((current) =>
        current.map((entry) => (entry.id === orderId ? mergedOrder : entry))
      )

      if (!canViewReceiptForOrder(mergedOrder)) {
        showToast('Notinha disponivel somente apos pagamento aprovado.')
        return
      }

      setActiveReceipt({
        orderId,
        receipt: buildReceiptFromOrder(mergedOrder),
      })
    } catch (requestError) {
      showToast(requestError.message || 'Nao foi possivel carregar a notinha.')
    }
  }

  const handlePrintReceipt = (printAreaId) => {
    printElementById(printAreaId, { title: 'Cupom fiscal simplificado' })
  }

  const filteredOrders =
    filter === statusAll ? orders : orders.filter((order) => order.status === filter)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pedidos</h1>
          <p className={styles.pageSubtitle}>
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={load} className={styles.refreshBtn}>
          ↺ Atualizar
        </button>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.filtersWrap}>
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === statusAll ? styles.filterActive : ''}`}
            onClick={() => setFilter(statusAll)}
          >
            Todos ({orders.length})
          </button>
          {orderStatuses.map((status) => (
            <button
              key={status.value}
              type="button"
              className={`${styles.filterBtn} ${filter === status.value ? styles.filterActive : ''}`}
              onClick={() => setFilter(status.value)}
            >
              {status.label} ({orders.filter((order) => order.status === status.value).length})
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className={styles.state}>
          <p>Carregando pedidos...</p>
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" onClick={load} className={styles.retryBtn}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && filteredOrders.length === 0 && (
        <div className={styles.empty}>
          <p>Nenhum pedido encontrado.</p>
        </div>
      )}

      {!loading && !error && filteredOrders.length > 0 && (
        <>
          <ul className={styles.cardList}>
            {filteredOrders.map((order) => (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</span>
                  <span className={styles.date}>{formatDateTime(order.createdAt)}</span>
                </div>

                <div className={styles.cardUser}>
                  <span className={styles.userName}>{order.user?.name ?? '—'}</span>
                  <span className={styles.userEmail}>{order.user?.email ?? ''}</span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Pagamento</span>
                  <span className={styles.cardValue}>{payLabels[order.payMethod] ?? order.payMethod}</span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Status pagamento</span>
                  <span className={styles.cardValue}>
                    {paymentLabels[order.payment?.status] ??
                      order.payment?.status ??
                      'Nao iniciado'}
                  </span>
                </div>

                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Frete</span>
                  <span className={styles.cardValue}>{formatPrice(order.shipping)}</span>
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
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      className={styles.statusSelect}
                      disabled={updating === order.id}
                      aria-label="Alterar status"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canViewReceiptForOrder(order) && (
                  <button
                    type="button"
                    className={styles.receiptBtn}
                    onClick={() => handleViewReceipt(order.id)}
                  >
                    Ver notinha
                  </button>
                )}

                {order.items.length > 0 && (
                  <button
                    type="button"
                    className={styles.expandBtn}
                    onClick={() => setExpanded((current) => (current === order.id ? null : order.id))}
                    aria-expanded={expanded === order.id}
                  >
                    {expanded === order.id
                      ? '▲ Ocultar itens'
                      : `▼ Ver ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
                  </button>
                )}

                {expanded === order.id && order.items.length > 0 && (
                  <ul className={styles.itemsList}>
                    {order.items.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <span className={styles.itemName}>{item.product?.name ?? item.productId.slice(0, 8)}</span>
                        <span className={styles.itemMeta}>
                          {item.quantity}× {formatPrice(item.price)}
                        </span>
                        <span className={styles.itemSubtotal}>
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Pedido</th>
                  <th className={styles.th}>Data</th>
                  <th className={styles.th}>Cliente</th>
                  <th className={styles.th}>Pagamento</th>
                  <th className={styles.th}>Status pagamento</th>
                  <th className={styles.th}>Frete</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Cupom</th>
                  <th className={styles.th}>Itens</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.orderIdBadge}>#{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.dateCell}>{formatDateTime(order.createdAt)}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.userCell}>
                        <span className={styles.userName}>{order.user?.name ?? '—'}</span>
                        <span className={styles.userEmail}>{order.user?.email ?? ''}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.payMethod}>{payLabels[order.payMethod] ?? order.payMethod}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.payMethod}>
                        {paymentLabels[order.payment?.status] ??
                          order.payment?.status ??
                          'Nao iniciado'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.payMethod}>{formatPrice(order.shipping)}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.totalValue}>{formatPrice(order.total)}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.statusCell}>
                        <StatusBadge status={order.status} />
                        <select
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value)}
                          className={styles.statusSelect}
                          disabled={updating === order.id}
                        >
                          {orderStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className={styles.td}>
                      {canViewReceiptForOrder(order) ? (
                        <button
                          type="button"
                          className={styles.receiptBtnTable}
                          onClick={() => handleViewReceipt(order.id)}
                        >
                          Ver notinha
                        </button>
                      ) : (
                        <span className={styles.payMethod}>Aguardando pagamento</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <button
                        type="button"
                        className={styles.expandBtnTable}
                        onClick={() => setExpanded((current) => (current === order.id ? null : order.id))}
                      >
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}{' '}
                        {expanded === order.id ? '▲' : '▼'}
                      </button>
                      {expanded === order.id && order.items.length > 0 && (
                        <ul className={styles.itemsList}>
                          {order.items.map((item) => (
                            <li key={item.id} className={styles.item}>
                              <span className={styles.itemName}>{item.product?.name ?? item.productId.slice(0, 8)}</span>
                              <span className={styles.itemMeta}>
                                {item.quantity}× {formatPrice(item.price)}
                              </span>
                              <span className={styles.itemSubtotal}>
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeReceipt?.receipt && (
            <section className={styles.receiptPanel}>
              <h2 className={styles.receiptTitle}>
                Cupom do pedido #{activeReceipt.orderId.slice(0, 8).toUpperCase()}
              </h2>
              <ReceiptCard receipt={activeReceipt.receipt} onPrint={handlePrintReceipt} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
