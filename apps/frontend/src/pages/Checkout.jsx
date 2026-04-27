import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MercadoPagoWalletBrick } from '../components/MercadoPagoWalletBrick'
import { ReceiptCard } from '../components/ReceiptCard'
import { useAuth } from '../context/useAuth'
import { useCart } from '../context/useCart'
import { addressesApi, ordersApi, paymentsApi, postalCodeApi, shippingApi } from '../services/api'
import { formatCep, formatPrice } from '../utils/format'
import { buildAddressForPersistence } from '../utils/order'
import { getCheckoutReturnMessage, getWalletBrickConfig, readCheckoutReturn } from '../utils/payment'
import { printElementById } from '../utils/print'
import { buildReceiptFromOrder, canViewReceiptForOrder } from '../utils/receipt'
import { validateCheckoutAddress } from '../utils/validation'
import styles from './Checkout.module.css'


const emptyAddressForm = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

const paymentStatusLabel = {
  PENDING: 'Esperando pagamento',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
}

const mercadoPagoPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? ''

export function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successOrder, setSuccessOrder] = useState(null)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [saveAddress, setSaveAddress] = useState(false)
  const [form, setForm] = useState(emptyAddressForm)
  const [shippingQuote, setShippingQuote] = useState(null)
  const [walletBrickError, setWalletBrickError] = useState('')
  const [returnContext, setReturnContext] = useState(null)

  useEffect(() => {
    if (!successOrder?.order?.id || successOrder?.payment?.status !== 'PENDING') {
      return
    }

    let active = true
    const intervalId = setInterval(async () => {
      try {
        const [payment, order] = await Promise.all([
          paymentsApi.getOrderPayment(successOrder.order.id, { sync: true }),
          ordersApi.get(successOrder.order.id),
        ])

        if (!active || !payment) return

        setSuccessOrder((current) =>
          current
            ? {
                ...current,
                order,
                payment,
              }
            : current
        )
      } catch {
        return
      }
    }, 5000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [successOrder])

  const handlePrintReceipt = (printAreaId) => {
    printElementById(printAreaId, { title: 'Notinha do pedido' })
  }

  const shippingPayload = useMemo(
    () => ({
      cep: form.cep,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
    [form.cep, items]
  )

  const checkoutReturn = useMemo(() => readCheckoutReturn(location.search), [location.search])
  const paymentForAction = successOrder?.payment ?? returnContext?.payment ?? null
  const canShowSuccessReceipt = useMemo(() => {
    if (!successOrder?.order || !successOrder?.receipt) return false
    return canViewReceiptForOrder(successOrder.order)
  }, [successOrder])
  const returnContextReceipt = useMemo(() => {
    if (!returnContext?.order) return null
    if (!canViewReceiptForOrder(returnContext.order)) return null
    return buildReceiptFromOrder(returnContext.order)
  }, [returnContext])
  const walletBrickConfig = useMemo(
    () => getWalletBrickConfig(paymentForAction, { publicKey: mercadoPagoPublicKey }),
    [paymentForAction]
  )

  const loadAddresses = useCallback(async () => {
    const response = await addressesApi.list()
    setAddresses(response)

    if (response[0] && !successOrder) {
      setForm({
        cep: response[0].cep ?? '',
        street: response[0].street ?? '',
        number: response[0].number ?? '',
        complement: response[0].complement ?? '',
        neighborhood: '',
        city: '',
        state: '',
      })
    }
  }, [successOrder])

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
      return
    }

    if (!isAuthenticated) return

    loadAddresses()
      .catch((requestError) => setError(requestError.message || 'Não foi possível carregar seus endereços.'))
      .finally(() => setLoading(false))
  }, [authLoading, isAuthenticated, loadAddresses, navigate])

  useEffect(() => {
    if (!isAuthenticated || !checkoutReturn?.orderId || successOrder?.order?.id) {
      return
    }

    let active = true
    const paymentMessage = getCheckoutReturnMessage(checkoutReturn.status)

    Promise.all([
      ordersApi.get(checkoutReturn.orderId),
      paymentsApi.getOrderPayment(checkoutReturn.orderId, { sync: true }),
    ])
      .then(([order, payment]) => {
        if (!active) return
        setReturnContext({
          orderId: checkoutReturn.orderId,
          status: checkoutReturn.status,
          message: paymentMessage,
          order,
          payment,
        })
      })
      .catch(() => {
        if (!active) return
        setReturnContext({
          orderId: checkoutReturn.orderId,
          status: checkoutReturn.status,
          message: paymentMessage,
          order: null,
          payment: null,
        })
      })

    return () => {
      active = false
    }
  }, [checkoutReturn, isAuthenticated, successOrder?.order?.id])

  useEffect(() => {
    setWalletBrickError('')
  }, [walletBrickConfig?.preferenceId])

  useEffect(() => {
    if (!checkoutReturn) {
      setReturnContext(null)
    }
  }, [checkoutReturn])

  useEffect(() => {
    if (!isAuthenticated || items.length === 0 || form.cep.replace(/\D/g, '').length !== 8) {
      setShippingQuote(null)
      return
    }

    const controller = new AbortController()
    setShippingLoading(true)

    shippingApi
      .quote(shippingPayload, { signal: controller.signal })
      .then(setShippingQuote)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Não foi possível calcular o frete.')
        }
      })
      .finally(() => setShippingLoading(false))

    return () => controller.abort()
  }, [form.cep, isAuthenticated, items.length, shippingPayload])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  const handleLookupCep = async () => {
    if (form.cep.replace(/\D/g, '').length !== 8) return

    setCepLoading(true)
    setError('')

    try {
      const address = await postalCodeApi.lookup(form.cep)
      setForm((current) => ({
        ...current,
        cep: address.cep || current.cep,
        street: address.street || current.street,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city && address.city !== 'Nao informado' ? address.city : current.city,
        state: address.state || current.state,
      }))
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível buscar o CEP informado.')
    } finally {
      setCepLoading(false)
    }
  }

  const selectAddress = async (address) => {
    setEditingAddressId(address.id)
    setSaveAddress(true)
    setForm({
      cep: address.cep ?? '',
      street: address.street ?? '',
      number: address.number ?? '',
      complement: address.complement ?? '',
      neighborhood: '',
      city: '',
      state: '',
    })

    if (address.cep) {
      try {
        const lookup = await postalCodeApi.lookup(address.cep)
        setForm((current) => ({
          ...current,
          street: lookup.street || current.street,
          neighborhood: lookup.neighborhood || current.neighborhood,
          city: lookup.city && lookup.city !== 'Nao informado' ? lookup.city : current.city,
          state: lookup.state || current.state,
        }))
      } catch {
        return
      }
    }
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      await addressesApi.delete(addressId)
      if (editingAddressId === addressId) {
        setEditingAddressId(null)
        setForm(emptyAddressForm)
      }
      await loadAddresses()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível remover o endereço.')
    }
  }

  const persistAddressIfNeeded = async (receipt, fallbackAddress) => {
    if (!saveAddress) return

    const normalizedAddress = buildAddressForPersistence(receipt, fallbackAddress)

    if (editingAddressId) {
      await addressesApi.update(editingAddressId, normalizedAddress)
      return
    }

    await addressesApi.create(normalizedAddress)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validation = validateCheckoutAddress(form)
    setFieldErrors(validation.errors)

    if (!validation.isValid) {
      setError('Revise os campos destacados antes de finalizar.')
      return
    }

    if (items.length === 0) return

    setError('')
    setWarning('')
    setSubmitting(true)

    try {
      const result = await ordersApi.create({
        payMethod: 'PIX',
        deliveryAddress: {
          cep: validation.payload.cep,
          number: validation.payload.number,
          complement: validation.payload.complement,
        },
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
      let payment = null
      try {
        payment = await paymentsApi.createOrderCheckout(result.order.id)
      } catch {
        payment = null
      }

      try {
        await persistAddressIfNeeded(result.receipt, validation.payload)
      } catch {
        setWarning('Pedido confirmado, mas nao foi possivel salvar o endereco para proximas compras.')
      }
      clearCart()
      setSuccessOrder({
        ...result,
        payment,
      })
      setReturnContext(null)
      setShippingQuote(null)
    } catch (requestError) {
      setError(requestError.message || 'Erro ao finalizar pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (successOrder) {
    return (
        <div className={styles.success}>
          <h2>Pedido realizado com sucesso!</h2>
          <p>
            {canShowSuccessReceipt
              ? 'Pagamento aprovado. Sua notinha esta liberada abaixo.'
              : 'Finalize o pagamento para liberar sua notinha. Assim que aprovado, ela aparece aqui automaticamente.'}
          </p>
          {warning && <p className={styles.warning}>{warning}</p>}
            <p>
              Status do pagamento:{' '}
              <strong>
                {paymentStatusLabel[successOrder.payment?.status] ??
                  successOrder.payment?.status ??
                  'Nao iniciado'}
              </strong>
            </p>
            {successOrder.payment?.status === 'PENDING' && walletBrickConfig && (
              <section className={styles.walletBrickSection}>
                <h3>Finalizar pagamento</h3>
                <p className={styles.walletBrickHint}>
                  Continue com Mercado Pago no botao abaixo.
                </p>
                <div className={styles.walletBrickContainer}>
                  <MercadoPagoWalletBrick
                    preferenceId={walletBrickConfig.preferenceId}
                    publicKey={walletBrickConfig.publicKey}
                    onReady={() => setWalletBrickError('')}
                    onError={() =>
                      setWalletBrickError(
                        'Nao foi possivel carregar o checkout integrado. Use o link alternativo.'
                      )
                    }
                  />
                </div>
                {walletBrickError && <p className={styles.warning}>{walletBrickError}</p>}
                {successOrder.payment?.checkoutUrl && (
                  <a
                    href={successOrder.payment.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.successCta}
                  >
                    Abrir checkout alternativo
                  </a>
                )}
              </section>
            )}
            {successOrder.payment?.status === 'PENDING' &&
              !walletBrickConfig &&
              successOrder.payment?.checkoutUrl && (
                <a
                  href={successOrder.payment.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.successCta}
                >
                  Ir para pagamento
                </a>
              )}
            {canShowSuccessReceipt && (
              <ReceiptCard receipt={successOrder.receipt} onPrint={handlePrintReceipt} />
            )}
        <Link to="/" className={styles.successCta}>
          Voltar à loja
        </Link>
      </div>
    )
  }

  if (returnContext) {
    return (
      <div className={styles.success}>
        <h2>Status do pagamento atualizado</h2>
        {returnContext.message && <p>{returnContext.message}</p>}
        {returnContext.orderId && <p>Pedido: {returnContext.orderId}</p>}
        <p>
          Status:{' '}
          <strong>
            {paymentStatusLabel[returnContext.payment?.status] ??
              returnContext.payment?.status ??
              'Nao identificado'}
          </strong>
        </p>

        {returnContext.payment?.status === 'PENDING' && walletBrickConfig && (
          <section className={styles.walletBrickSection}>
            <h3>Finalizar pagamento</h3>
            <p className={styles.walletBrickHint}>
              Continue com Mercado Pago no botao abaixo.
            </p>
            <div className={styles.walletBrickContainer}>
              <MercadoPagoWalletBrick
                preferenceId={walletBrickConfig.preferenceId}
                publicKey={walletBrickConfig.publicKey}
                onReady={() => setWalletBrickError('')}
                onError={() =>
                  setWalletBrickError(
                    'Nao foi possivel carregar o checkout integrado. Use o link alternativo.'
                  )
                }
              />
            </div>
            {walletBrickError && <p className={styles.warning}>{walletBrickError}</p>}
            {returnContext.payment?.checkoutUrl && (
              <a
                href={returnContext.payment.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.successCta}
              >
                Abrir checkout alternativo
              </a>
            )}
          </section>
        )}
        {returnContext.payment?.status === 'PENDING' &&
          !walletBrickConfig &&
          returnContext.payment?.checkoutUrl && (
            <a
              href={returnContext.payment.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.successCta}
            >
              Ir para pagamento
            </a>
          )}
        {returnContextReceipt && (
          <ReceiptCard receipt={returnContextReceipt} onPrint={handlePrintReceipt} />
        )}

        <Link to="/meus-pedidos" className={styles.successCta}>
          Ver meus pedidos
        </Link>
        <Link to="/" className={styles.successCta}>
          Voltar a loja
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Seu carrinho está vazio.</p>
        <Link to="/">Ver produtos</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <section className={`${styles.section} ${styles.sectionMain}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Endereço de entrega</h2>
              <p className={styles.hint}>Informe o CEP para preencher o endereço automaticamente.</p>
            </div>
          </div>

          {addresses.length > 0 && (
            <div className={styles.addressBook}>
              {addresses.map((address) => (
                <article key={address.id} className={styles.addressCard}>
                  <div>
                    <strong>{address.street}</strong>
                    <p>{address.number}{address.complement ? ` - ${address.complement}` : ''}</p>
                    <p>CEP {formatCep(address.cep)}</p>
                  </div>
                  <div className={styles.addressActions}>
                    <button type="button" onClick={() => selectAddress(address)} className={styles.secondaryBtn}>
                      Usar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(address.id)}
                      className={styles.dangerBtn}
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className={styles.grid}>
            <label className={styles.label}>
              CEP
              <div className={styles.inlineField}>
                <input
                  type="text"
                  name="cep"
                  value={formatCep(form.cep)}
                  onChange={handleChange}
                  onBlur={handleLookupCep}
                  placeholder="00000-000"
                  required
                  className={styles.input}
                />
                <button type="button" onClick={handleLookupCep} className={styles.secondaryBtn}>
                  {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                </button>
              </div>
              {fieldErrors.cep && <span className={styles.fieldError}>{fieldErrors.cep}</span>}
            </label>

            <label className={styles.label}>
              Rua
              <input type="text" name="street" value={form.street} onChange={handleChange} required className={styles.input} />
              {fieldErrors.street && <span className={styles.fieldError}>{fieldErrors.street}</span>}
            </label>

            <label className={styles.label}>
              Número
              <input type="text" name="number" value={form.number} onChange={handleChange} required className={styles.input} />
              {fieldErrors.number && <span className={styles.fieldError}>{fieldErrors.number}</span>}
            </label>

            <label className={styles.label}>
              Complemento <span className={styles.optional}>(opcional)</span>
              <input type="text" name="complement" value={form.complement} onChange={handleChange} className={styles.input} />
            </label>

            <label className={styles.label}>
              Bairro
              <input type="text" name="neighborhood" value={form.neighborhood} onChange={handleChange} className={styles.input} />
            </label>

            <label className={styles.label}>
              Cidade
              <input type="text" name="city" value={form.city} onChange={handleChange} required className={styles.input} />
              {fieldErrors.city && <span className={styles.fieldError}>{fieldErrors.city}</span>}
            </label>

            <label className={styles.label}>
              UF
              <input type="text" name="state" value={form.state} onChange={handleChange} required maxLength={2} className={styles.input} />
              {fieldErrors.state && <span className={styles.fieldError}>{fieldErrors.state}</span>}
            </label>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(event) => setSaveAddress(event.target.checked)}
            />
            {editingAddressId ? 'Atualizar este endereço salvo' : 'Salvar este endereço para próximas compras'}
          </label>
        </section>


        <aside className={`${styles.summary} ${styles.sectionSidebar}`}>
          <h2 className={styles.sectionTitle}>Resumo do pedido</h2>
          <ul className={styles.summaryList}>
            {items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <p className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>{formatPrice(totalPrice)}</span>
          </p>
          <p className={styles.summaryRow}>
            <span>Frete</span>
            <span>{shippingLoading ? 'Calculando...' : formatPrice(shippingQuote?.shipping ?? 0)}</span>
          </p>
          {shippingQuote?.estimatedDays && (
            <p className={styles.deliveryHint}>Prazo estimado: {shippingQuote.estimatedDays} dia(s) úteis</p>
          )}
          <p className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(shippingQuote?.total ?? totalPrice)}</span>
          </p>
          <button type="submit" className={styles.submit} disabled={submitting || shippingLoading}>
            {submitting ? 'Finalizando...' : 'Finalizar pedido'}
          </button>
        </aside>
      </form>
    </div>
  )
}