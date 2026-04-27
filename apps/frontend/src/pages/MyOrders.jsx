import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MercadoPagoWalletBrick } from '../components/MercadoPagoWalletBrick'
import { ReceiptCard } from '../components/ReceiptCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'
import { ordersApi, paymentsApi } from '../services/api'
import { formatDateTime, formatPrice } from '../utils/format'
import { canOrderBeCanceled, resolveCancelWindowHours } from '../utils/order-cancel'
import { getWalletBrickConfig } from '../utils/payment'
import { printElementById } from '../utils/print'
import { buildReceiptFromOrder, canViewReceiptForOrder } from '../utils/receipt'
import styles from './MyOrders.module.css'

const payLabels = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartao de credito',
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

const restartablePaymentStatuses = new Set(['PENDING', 'REJECTED', 'EXPIRED', 'CANCELED'])
const cancelWindowHours = resolveCancelWindowHours(
  import.meta.env.VITE_ORDER_CUSTOMER_CANCEL_WINDOW_HOURS
)
const mercadoPagoPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? ''

const mapPaymentFromTransaction = (payment) => ({
  provider: payment.provider,
  status: payment.status,
  checkoutUrl: payment.checkoutUrl ?? null,
  externalId: payment.externalId ?? null,
  updatedAt: payment.updatedAt,
})

const canOrderBePaid = (order, payment) => {
  if (!order || order.status !== 'AWAITING_PAYMENT') return false
  if (!payment) return true
  return restartablePaymentStatuses.has(payment.status)
}

export function MyOrders() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState('')
  const [payingId, setPayingId] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [walletErrorsByOrderId, setWalletErrorsByOrderId] = useState({})
  const [paymentSessionsByOrderId, setPaymentSessionsByOrderId] = useState({})
  const [activePaymentOrderId, setActivePaymentOrderId] = useState('')
  const [activeReceipt, setActiveReceipt] = useState(null)

  const loadOrders = useCallback(async ({ syncPending = true } = {}) => {
    setLoading(true)
    setError('')

    try {
      const response = await ordersApi.listMine()

      if (syncPending) {
        const pendingOrderIds = response
          .filter((order) => canOrderBePaid(order, order.payment))
          .map((order) => order.id)

        if (pendingOrderIds.length > 0) {
          await Promise.allSettled(
            pendingOrderIds.map((orderId) => paymentsApi.getOrderPayment(orderId, { sync: true }))
          )
          const refreshedOrders = await ordersApi.listMine()
          setOrders(refreshedOrders)
          return
        }
      }

      setOrders(response)
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar seus pedidos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadOrders()
    }
  }, [authLoading, isAuthenticated, loadOrders])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!activeReceipt?.orderId) return
    if (orders.some((order) => order.id === activeReceipt.orderId)) return
    setActiveReceipt(null)
  }, [activeReceipt, orders])

  useEffect(() => {
    if (!isAuthenticated) return

    const hasPendingPayments = orders.some((order) => {
      const payment = paymentSessionsByOrderId[order.id] ?? order.payment
      return canOrderBePaid(order, payment)
    })

    if (!hasPendingPayments) return

    const intervalId = setInterval(() => {
      loadOrders({ syncPending: true }).catch(() => undefined)
    }, 10000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, loadOrders, orders, paymentSessionsByOrderId])

  const ordersCountLabel = useMemo(
    () => `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`,
    [orders.length]
  )

  const handleCancel = async (orderId) => {
    setCancelingId(orderId)
    try {
      const updated = await ordersApi.cancelMine(orderId)
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updated : order))
      )
      setToast('Pedido cancelado com sucesso.')
    } catch (requestError) {
      setToast(requestError.message || 'Nao foi possivel cancelar o pedido.')
    } finally {
      setCancelingId('')
    }
  }

  const handleStartPayment = async (orderId) => {
    setPayingId(orderId)
    setWalletErrorsByOrderId((current) => ({
      ...current,
      [orderId]: '',
    }))

    try {
      const transaction = await paymentsApi.createOrderCheckout(orderId)
      setPaymentSessionsByOrderId((current) => ({
        ...current,
        [orderId]: transaction,
      }))
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                payment: mapPaymentFromTransaction(transaction),
              }
            : order
        )
      )

      const walletBrickConfig = getWalletBrickConfig(transaction, {
        publicKey: mercadoPagoPublicKey,
      })

      if (walletBrickConfig) {
        setActivePaymentOrderId(orderId)
        return
      }

      if (transaction.checkoutUrl) {
        window.open(transaction.checkoutUrl, '_blank', 'noopener,noreferrer')
        return
      }

      setToast('Nao foi possivel iniciar o pagamento deste pedido.')
    } catch (requestError) {
      setToast(requestError.message || 'Nao foi possivel iniciar o pagamento.')
    } finally {
      setPayingId('')
    }
  }

  const handleViewReceipt = async (orderId) => {
    try {
      const [payment, refreshedOrder] = await Promise.all([
        paymentsApi.getOrderPayment(orderId, { sync: true }),
        ordersApi.get(orderId),
      ])

      const mergedOrder = payment
        ? {
            ...refreshedOrder,
            payment: mapPaymentFromTransaction(payment),
          }
        : refreshedOrder

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? mergedOrder : order))
      )

      if (!canViewReceiptForOrder(mergedOrder)) {
        setToast('A notinha fica disponivel somente apos o pagamento aprovado.')
        return
      }

      setActiveReceipt({
        orderId,
        receipt: buildReceiptFromOrder(mergedOrder),
      })
    } catch (requestError) {
      setToast(requestError.message || 'Nao foi possivel carregar a notinha.')
    }
  }

  const handlePrintReceipt = (printAreaId) => {
    printElementById(printAreaId, { title: 'Cupom fiscal simplificado' })
  }

  if (authLoading) {
    return (
      <div className={styles.state}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.state}>
        <p>Voce precisa entrar para ver seus pedidos.</p>
        <Link to="/login">Ir para login</Link>
      </div>
    )
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
            const cancelAllowed = canOrderBeCanceled(order, cancelWindowHours)
            const payment = paymentSessionsByOrderId[order.id] ?? order.payment
            const walletBrickConfig = getWalletBrickConfig(payment, {
              publicKey: mercadoPagoPublicKey,
            })
            const walletError = walletErrorsByOrderId[order.id]
            const canPayOrder = canOrderBePaid(order, payment)
            const canViewReceipt = canViewReceiptForOrder({
              ...order,
              payment,
            })
            const receiptOpen = activeReceipt?.orderId === order.id
            const paymentOpen = activePaymentOrderId === order.id

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
                    {paymentLabels[payment?.status] ??
                      payment?.status ??
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

                {canPayOrder && (
                  <button
                    type="button"
                    className={styles.payBtn}
                    onClick={() => handleStartPayment(order.id)}
                    disabled={payingId === order.id}
                  >
                    {payingId === order.id ? 'Iniciando pagamento...' : 'Pagar agora'}
                  </button>
                )}

                {canPayOrder && paymentOpen && walletBrickConfig && (
                  <section className={styles.walletBrickSection}>
                    <p className={styles.walletBrickHint}>
                      Finalize o pagamento no Mercado Pago:
                    </p>
                    <div className={styles.walletBrickContainer}>
                      <MercadoPagoWalletBrick
                        preferenceId={walletBrickConfig.preferenceId}
                        publicKey={walletBrickConfig.publicKey}
                        onReady={() =>
                          setWalletErrorsByOrderId((current) => ({
                            ...current,
                            [order.id]: '',
                          }))
                        }
                        onError={() =>
                          setWalletErrorsByOrderId((current) => ({
                            ...current,
                            [order.id]:
                              'Nao foi possivel carregar o checkout integrado. Use o link alternativo.',
                          }))
                        }
                      />
                    </div>
                    {walletError && <p className={styles.cancelHint}>{walletError}</p>}
                    {payment?.checkoutUrl && (
                      <a
                        href={payment.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.payLink}
                      >
                        Abrir checkout alternativo
                      </a>
                    )}
                  </section>
                )}

                {canViewReceipt && (
                  <button
                    type="button"
                    className={styles.receiptBtn}
                    onClick={() => handleViewReceipt(order.id)}
                  >
                    {receiptOpen ? 'Atualizar notinha' : 'Ver notinha'}
                  </button>
                )}

                {receiptOpen && activeReceipt?.receipt && (
                  <div className={styles.receiptPanel}>
                    <ReceiptCard receipt={activeReceipt.receipt} onPrint={handlePrintReceipt} />
                  </div>
                )}

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
            )
          })}
        </ul>
      )}
    </div>
  )
}
